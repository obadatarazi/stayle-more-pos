import { useSyncExternalStore } from "react";
import { storageKeys } from "@/config/site";
import { ApiError, NetworkError, isCloudEnabled } from "./api";
import {
  deleteCloudExchange,
  deleteCloudExpense,
  deleteCloudSale,
  insertCloudExchange,
  insertCloudExpense,
  insertCloudSale,
  replaceCloudStore,
  saveCloudSettings,
  upsertCloudProduct,
  type CloudExchange,
  type CloudExpense,
  type CloudProduct,
  type CloudSale,
  type CloudSettings,
  type CloudStore,
} from "./cloudStore";
import { isDeviceOffline, isOnline, subscribeNetwork } from "./networkStatus";

/*
 * Durable FIFO of cloud writes. Every mutation is applied to local state first, then queued
 * here; the queue drains whenever the API is reachable. All server endpoints are idempotent
 * (upsert / delete by id), so an op that is retried after a lost response is harmless.
 */

export type OutboxOp =
  | { type: "product.upsert"; product: CloudProduct }
  | { type: "sale.upsert"; sale: CloudSale }
  | { type: "sale.delete"; id: number }
  | { type: "expense.upsert"; expense: CloudExpense }
  | { type: "expense.delete"; id: number }
  | { type: "exchange.upsert"; exchange: CloudExchange }
  | { type: "exchange.delete"; id: number }
  | { type: "settings.save"; settings: CloudSettings }
  | { type: "store.replace"; store: CloudStore };

type OutboxEntry = {
  id: string;
  op: OutboxOp;
  queuedAt: number;
  attempts: number;
  // Bumped when a newer write is coalesced into this entry, so an in-flight send of the
  // older payload doesn't remove the newer one on success.
  rev: number;
};

export type SyncEvent =
  | { type: "flushStarted"; pending: number }
  | { type: "flushCompleted"; sent: number }
  | { type: "saleRejected"; sale: CloudSale; reason: "stock" | "invalid"; available?: number }
  | { type: "opRejected"; op: OutboxOp; message: string }
  | { type: "authExpired" }
  | { type: "stuck"; pending: number; message: string };

export type OutboxSnapshot = {
  pending: number;
  flushing: boolean;
  /** Head of the queue keeps failing with server errors. */
  stuck: boolean;
  /** Token rejected; nothing is sent until the user signs in again. */
  authBlocked: boolean;
  online: boolean;
  lastSyncedAt: number | null;
};

const LOCK_NAME = "style-more-outbox";
const STUCK_AFTER_ATTEMPTS = 4;
const MAX_BACKOFF_MS = 60000;

// ---------- persistence ----------

// Fallback when localStorage is unavailable (private mode quirks): still works for this tab.
let memoryEntries: OutboxEntry[] = [];

function load(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(storageKeys.outbox);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryEntries;
  }
}

function save(entries: OutboxEntry[]) {
  memoryEntries = entries;
  pending = entries.length;
  try {
    if (entries.length) localStorage.setItem(storageKeys.outbox, JSON.stringify(entries));
    else localStorage.removeItem(storageKeys.outbox);
  } catch (error) {
    console.error("Outbox could not be persisted", error);
  }
  revision += 1;
  refreshSnapshot();
}

function readLastSync(): number | null {
  try {
    const value = Number(localStorage.getItem(storageKeys.lastSync));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

// ---------- observable state ----------

let revision = 0;
let pending = load().length;
let flushing = false;
let stuck = false;
let authBlocked = false;
let lastSyncedAt = readLastSync();
let snapshot: OutboxSnapshot = buildSnapshot();
const stateListeners = new Set<() => void>();
const eventListeners = new Set<(event: SyncEvent) => void>();

function buildSnapshot(): OutboxSnapshot {
  return { pending, flushing, stuck, authBlocked, online: isOnline(), lastSyncedAt };
}

function refreshSnapshot() {
  const next = buildSnapshot();
  const changed = (Object.keys(next) as (keyof OutboxSnapshot)[]).some((key) => next[key] !== snapshot[key]);
  if (!changed) return;
  snapshot = next;
  for (const listener of stateListeners) listener();
}

function emit(event: SyncEvent) {
  for (const listener of eventListeners) listener(event);
}

export function getOutboxSnapshot() {
  return snapshot;
}

export function subscribeOutbox(listener: () => void) {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function useOutboxSnapshot() {
  return useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);
}

export function onSyncEvent(listener: (event: SyncEvent) => void) {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export function pendingCount() {
  return pending;
}

/** Changes on every local queue write; lets a pull detect that it raced with an edit. */
export function outboxRevision() {
  return revision;
}

export function markSynced() {
  lastSyncedAt = Date.now();
  try {
    localStorage.setItem(storageKeys.lastSync, String(lastSyncedAt));
  } catch {
    // ignore
  }
  refreshSnapshot();
}

// ---------- enqueue ----------

function opKey(op: OutboxOp): string {
  switch (op.type) {
    case "product.upsert":
      return `product:${op.product.sku}`;
    case "sale.upsert":
      return `sale:${op.sale.id}`;
    case "sale.delete":
      return `sale:${op.id}`;
    case "expense.upsert":
      return `expense:${op.expense.id}`;
    case "expense.delete":
      return `expense:${op.id}`;
    case "exchange.upsert":
      return `exchange:${op.exchange.id}`;
    case "exchange.delete":
      return `exchange:${op.id}`;
    case "settings.save":
      return "settings";
    case "store.replace":
      return "store";
  }
}

let entrySeq = 0;

function newEntry(op: OutboxOp): OutboxEntry {
  entrySeq += 1;
  const id = `${Date.now().toString(36)}-${entrySeq}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, op, queuedAt: Date.now(), attempts: 0, rev: 0 };
}

/**
 * Queue cloud writes. Later writes to the same record replace the queued one *in place*, which
 * keeps dependencies intact (a sale queued after its product still lands after it).
 */
export function enqueue(...ops: OutboxOp[]) {
  if (!isCloudEnabled || !ops.length) return;
  let entries = load();
  for (const op of ops) {
    if (op.type === "store.replace") {
      // A full replace supersedes everything queued before it.
      entries = [newEntry(op)];
      continue;
    }
    const key = opKey(op);
    const existing = entries.findIndex((entry) => opKey(entry.op) === key);
    if (existing >= 0) {
      const entry = entries[existing];
      entries[existing] = { ...entry, op, rev: entry.rev + 1 };
    } else {
      entries.push(newEntry(op));
    }
  }
  save(entries);
  scheduleFlush(0);
}

// ---------- flush ----------

async function send(op: OutboxOp) {
  switch (op.type) {
    case "product.upsert":
      return upsertCloudProduct(op.product);
    case "sale.upsert":
      return insertCloudSale(op.sale);
    case "sale.delete":
      return deleteCloudSale(op.id);
    case "expense.upsert":
      return insertCloudExpense(op.expense);
    case "expense.delete":
      return deleteCloudExpense(op.id);
    case "exchange.upsert":
      return insertCloudExchange(op.exchange);
    case "exchange.delete":
      return deleteCloudExchange(op.id);
    case "settings.save":
      return saveCloudSettings(op.settings);
    case "store.replace":
      return replaceCloudStore(op.store);
  }
}

/** Remove the entry unless a newer write was coalesced into it while it was being sent. */
function settle(entry: OutboxEntry) {
  const entries = load();
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index < 0) return;
  if (entries[index].rev !== entry.rev) return;
  entries.splice(index, 1);
  save(entries);
}

function recordFailure(entry: OutboxEntry) {
  const entries = load();
  const current = entries.find((item) => item.id === entry.id);
  if (!current) return 0;
  current.attempts += 1;
  save(entries);
  return current.attempts;
}

let retryTimer: number | null = null;

function scheduleFlush(delay: number) {
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
}

function backoff(attempts: number) {
  const base = Math.min(MAX_BACKOFF_MS, 2000 * 2 ** Math.max(0, attempts - 1));
  return base + Math.floor(Math.random() * 1000);
}

function isPermanentRejection(error: ApiError) {
  return error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
}

function availableFrom(details: unknown): number | undefined {
  if (details && typeof details === "object" && "available" in details) {
    const value = Number((details as { available: unknown }).available);
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

async function drain() {
  if (!load().length) return;
  flushing = true;
  refreshSnapshot();
  emit({ type: "flushStarted", pending });

  let sent = 0;
  let drained = false;
  try {
    for (;;) {
      const entry = load()[0];
      if (!entry) {
        drained = true;
        break;
      }
      try {
        await send(entry.op);
        settle(entry);
        sent += 1;
        if (stuck) {
          stuck = false;
          refreshSnapshot();
        }
        continue;
      } catch (error) {
        if (error instanceof NetworkError) {
          // Network listener retries on reconnect; this covers "online but unreachable".
          scheduleFlush(backoff(recordFailure(entry)));
          break;
        }
        if (error instanceof ApiError && error.status === 401) {
          authBlocked = true;
          refreshSnapshot();
          emit({ type: "authExpired" });
          break;
        }
        if (error instanceof ApiError && isPermanentRejection(error)) {
          settle(entry);
          if (entry.op.type === "sale.upsert") {
            emit({
              type: "saleRejected",
              sale: entry.op.sale,
              reason: error.status === 409 ? "stock" : "invalid",
              available: availableFrom(error.details),
            });
          } else {
            emit({ type: "opRejected", op: entry.op, message: error.message });
          }
          continue;
        }
        // 5xx, 408, 429 or something unexpected: keep the op and retry with backoff.
        console.error("Sync failed, will retry", error);
        const attempts = recordFailure(entry);
        if (attempts >= STUCK_AFTER_ATTEMPTS && !stuck) {
          stuck = true;
          refreshSnapshot();
          emit({ type: "stuck", pending, message: error instanceof Error ? error.message : String(error) });
        }
        scheduleFlush(backoff(attempts));
        break;
      }
    }
  } finally {
    flushing = false;
    refreshSnapshot();
  }

  if (drained) {
    stuck = false;
    markSynced();
    emit({ type: "flushCompleted", sent });
  }
}

let activeFlush: Promise<void> | null = null;

/** Push queued writes now. Safe to call often; concurrent calls (and other tabs) share one drain. */
export function flushOutbox(): Promise<void> {
  if (!isCloudEnabled || authBlocked || isDeviceOffline()) return Promise.resolve();
  if (activeFlush) return activeFlush;
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const run = locks?.request ? locks.request(LOCK_NAME, drain) : drain();
  activeFlush = Promise.resolve(run).finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

/** Call after a successful sign-in: lifts the auth block and sends what is waiting. */
export function resumeOutbox() {
  authBlocked = false;
  stuck = false;
  refreshSnapshot();
  scheduleFlush(0);
}

// ---------- lifecycle ----------

if (typeof window !== "undefined") {
  subscribeNetwork((online) => {
    refreshSnapshot();
    if (online) scheduleFlush(300);
  });

  // Another tab queued or flushed something.
  window.addEventListener("storage", (event) => {
    if (event.key === storageKeys.outbox || event.key === storageKeys.lastSync) {
      if (event.key === storageKeys.lastSync) lastSyncedAt = readLastSync();
      else pending = load().length;
      revision += 1;
      refreshSnapshot();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && pendingCount() > 0) scheduleFlush(0);
  });
}
