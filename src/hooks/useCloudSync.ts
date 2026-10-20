import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { ApiError, NetworkError, isCloudEnabled } from "@/lib/api";
import { fetchCloudStore, subscribeCloudStore, type CloudSale, type CloudStore } from "@/lib/cloudStore";
import { isDeviceOffline, isOnline, subscribeNetwork } from "@/lib/networkStatus";
import { showSystemNotification } from "@/lib/notifications";
import {
  flushOutbox,
  markSynced,
  onSyncEvent,
  outboxRevision,
  pendingCount,
  resumeOutbox,
  useOutboxSnapshot,
} from "@/lib/syncOutbox";

export type SyncStatus = "local" | "loading" | "online" | "saving" | "pending" | "offline" | "error";

export type NoticeTone = "success" | "warning";

type Options = {
  /** Signed in; nothing syncs on the login screen. */
  enabled: boolean;
  applyCloud: (store: CloudStore) => void;
  /**
   * The server has no data at all. Never applied automatically (it would wipe this device);
   * the app decides whether to upload the local copy.
   */
  onEmptyServer: () => void;
  /** Undo the sale locally; returns the product name for the notification. */
  onSaleRejected: (sale: CloudSale, reason: "stock" | "invalid", available?: number) => string;
  onAuthExpired: () => void;
  onNotice: (message: string, tone?: NoticeTone) => void;
};

// Brief Wi-Fi drops shouldn't produce an offline/online notification pair.
const OFFLINE_GRACE_MS = 5000;

const appInBackground = () => document.visibilityState === "hidden";

export function useCloudSync(options: Options) {
  const { t } = useI18n();
  const snapshot = useOutboxSnapshot();
  const [loading, setLoading] = useState(false);
  const [pullFailed, setPullFailed] = useState(false);

  // Callers pass fresh closures every render; read them through a ref so effects stay stable.
  const latest = useRef({ ...options, t });
  latest.current = { ...options, t };

  const pullSeq = useRef(0);
  const announcedOffline = useRef(false);
  const reconnectPending = useRef(0);

  const pull = useCallback(async () => {
    // Never overwrite local edits the server hasn't seen; the post-flush pull will converge.
    if (pendingCount() > 0) {
      void flushOutbox();
      return;
    }
    if (isDeviceOffline()) return;

    const revision = outboxRevision();
    const seq = ++pullSeq.current;
    try {
      const cloud = await fetchCloudStore();
      if (seq !== pullSeq.current) return;
      // An edit was made while the request was in flight: this snapshot is already stale.
      if (revision !== outboxRevision() || pendingCount() > 0) return;
      setPullFailed(false);
      if (!cloud.products.length && !cloud.sales.length && !cloud.expenses.length) {
        latest.current.onEmptyServer();
        return;
      }
      latest.current.applyCloud(cloud);
      markSynced();
    } catch (error) {
      if (seq !== pullSeq.current || error instanceof NetworkError) return;
      if (error instanceof ApiError && error.status === 401) {
        latest.current.onAuthExpired();
        return;
      }
      console.error(error);
      setPullFailed(true);
    }
  }, []);

  // Bootstrap: push anything queued while signed out/offline, then load the server copy.
  useEffect(() => {
    if (!options.enabled || !isCloudEnabled) return;
    let cancelled = false;
    setLoading(true);
    resumeOutbox();
    void (async () => {
      await flushOutbox();
      if (!cancelled) await pull();
      if (!cancelled) setLoading(false);
    })();
    const unsubscribe = subscribeCloudStore(() => void pull());
    return () => {
      cancelled = true;
      pullSeq.current += 1;
      unsubscribe();
    };
  }, [options.enabled, pull]);

  // Outbox outcomes → state fixes, in-app notices and (when allowed) system notifications.
  useEffect(() => {
    if (!options.enabled) return;
    return onSyncEvent((event) => {
      const { t: tr, onNotice } = latest.current;
      switch (event.type) {
        case "flushCompleted": {
          void pull();
          const fromReconnect = reconnectPending.current > 0;
          reconnectPending.current = 0;
          if (event.sent > 0 && fromReconnect) {
            onNotice(tr("sync.notify.syncedBody", { count: event.sent }));
            if (appInBackground()) {
              void showSystemNotification({
                title: tr("sync.notify.syncedTitle"),
                body: tr("sync.notify.syncedBody", { count: event.sent }),
                tag: "sync-network",
              });
            }
          }
          break;
        }
        case "saleRejected": {
          const name = latest.current.onSaleRejected(event.sale, event.reason, event.available);
          void showSystemNotification({
            title: tr("sync.notify.conflictTitle"),
            body:
              event.reason === "stock"
                ? tr("sync.notify.conflictBody", { name, available: event.available ?? 0 })
                : tr("sync.notify.rejectedBody"),
            tag: `sale-${event.sale.id}`,
            renotify: true,
          });
          break;
        }
        case "opRejected":
          onNotice(tr("sync.notify.rejectedBody"), "warning");
          break;
        case "stuck":
          onNotice(tr("sync.notify.stuckBody", { count: event.pending }), "warning");
          void showSystemNotification({
            title: tr("sync.notify.stuckTitle"),
            body: tr("sync.notify.stuckBody", { count: event.pending }),
            tag: "sync-stuck",
            renotify: true,
          });
          break;
        case "authExpired":
          latest.current.onAuthExpired();
          break;
        case "flushStarted":
          break;
      }
    });
  }, [options.enabled, pull]);

  // Network transitions, debounced so flaky Wi-Fi stays quiet.
  useEffect(() => {
    if (!options.enabled || !isCloudEnabled) return;
    let offlineTimer: number | null = null;
    // Opened without a connection: treat it as already announced so reconnecting reports the sync.
    announcedOffline.current = !isOnline();
    const unsubscribe = subscribeNetwork((online) => {
      const { t: tr, onNotice } = latest.current;
      if (!online) {
        if (offlineTimer !== null) return;
        offlineTimer = window.setTimeout(() => {
          offlineTimer = null;
          announcedOffline.current = true;
          onNotice(tr("sync.notify.offlineInApp"), "warning");
          if (appInBackground()) {
            const count = pendingCount();
            void showSystemNotification({
              title: tr("sync.notify.offlineTitle"),
              body: count ? tr("sync.notify.offlinePendingBody", { count }) : tr("sync.notify.offlineBody"),
              tag: "sync-network",
            });
          }
        }, OFFLINE_GRACE_MS);
        return;
      }
      if (offlineTimer !== null) {
        window.clearTimeout(offlineTimer);
        offlineTimer = null;
      }
      const count = pendingCount();
      if (announcedOffline.current) {
        announcedOffline.current = false;
        reconnectPending.current = count;
        if (!count) onNotice(tr("sync.notify.backOnlineTitle"));
        if (appInBackground()) {
          void showSystemNotification({
            title: tr("sync.notify.backOnlineTitle"),
            body: count ? tr("sync.notify.backOnlinePendingBody", { count }) : tr("sync.notify.backOnlineBody"),
            tag: "sync-network",
          });
        }
      }
      // With pending edits the outbox flushes on its own and pulls afterwards.
      if (!count) void pull();
    });
    return () => {
      unsubscribe();
      if (offlineTimer !== null) window.clearTimeout(offlineTimer);
    };
  }, [options.enabled, pull]);

  let status: SyncStatus;
  if (!isCloudEnabled) status = "local";
  else if (!snapshot.online) status = "offline";
  else if (snapshot.authBlocked || snapshot.stuck || pullFailed) status = "error";
  else if (loading) status = "loading";
  else if (snapshot.flushing) status = "saving";
  else if (snapshot.pending > 0) status = "pending";
  else status = "online";

  const syncNow = useCallback(() => {
    if (pendingCount() > 0) void flushOutbox();
    else void pull();
  }, [pull]);

  return { status, pending: snapshot.pending, lastSyncedAt: snapshot.lastSyncedAt, syncNow };
}
