import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

// Updates wait for the user: reloading by itself in the middle of a sale would be worse than
// running one version behind for a few minutes.

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let updateAvailable = false;
let applyUpdateFn: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  applyUpdateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true;
      for (const listener of listeners) listener();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Long-lived POS tabs never navigate, so poll for new deploys.
      window.setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUpdateAvailable() {
  return useSyncExternalStore(subscribe, () => updateAvailable, () => false);
}

export function applyUpdate() {
  if (!applyUpdateFn) {
    window.location.reload();
    return;
  }
  void applyUpdateFn(true);
  // registerSW reloads once the new worker takes control; if that never happens (page wasn't
  // controlled yet), reload anyway — the new worker is already active.
  window.setTimeout(() => window.location.reload(), 2000);
}

// ---------- install prompt ----------

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = "installed" | "installing" | "failed" | "available" | "ios" | "unavailable";

// Chrome never tells the page when the phone refuses to add the icon (e.g. the launcher blocks
// home-screen shortcuts). A successful install fires `appinstalled`; if that hasn't happened this
// long after the user accepted, treat it as failed and show help.
const INSTALL_CONFIRM_MS = 20000;

let installEvent: BeforeInstallPromptEvent | null = null;
let installing = false;
let installFailed = false;
let installTimer: number | null = null;
let installed =
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
const installListeners = new Set<() => void>();

function notifyInstall() {
  for (const listener of installListeners) listener();
}

if (typeof window !== "undefined") {
  // Chrome/Edge/Samsung Internet: keep the event so our own button can open the install dialog.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    notifyInstall();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    installed = true;
    installing = false;
    installFailed = false;
    if (installTimer !== null) window.clearTimeout(installTimer);
    notifyInstall();
  });
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function getInstallState(): InstallState {
  if (installed) return "installed";
  if (installing) return "installing";
  if (installFailed) return "failed";
  if (installEvent) return "available";
  if (isIos()) return "ios";
  return "unavailable";
}

function subscribeInstall(listener: () => void) {
  installListeners.add(listener);
  return () => {
    installListeners.delete(listener);
  };
}

export function useInstallState() {
  return useSyncExternalStore(subscribeInstall, getInstallState, () => "unavailable" as InstallState);
}

/** Whether the browser can show its install dialog right now (it may re-offer after a failure). */
export function canPromptInstall() {
  return installEvent !== null;
}

export async function promptInstall() {
  if (!installEvent) return false;
  const event = installEvent;
  installFailed = false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can only be used once.
  installEvent = null;
  if (outcome === "accepted" && !installed) {
    installing = true;
    if (installTimer !== null) window.clearTimeout(installTimer);
    installTimer = window.setTimeout(() => {
      installTimer = null;
      if (installed) return;
      installing = false;
      installFailed = true;
      notifyInstall();
    }, INSTALL_CONFIRM_MS);
  }
  notifyInstall();
  return outcome === "accepted";
}

/** "Didn't work?" — show the help even if the page couldn't detect the failure itself. */
export function reportInstallFailed() {
  if (installed) return;
  if (installTimer !== null) window.clearTimeout(installTimer);
  installing = false;
  installFailed = true;
  notifyInstall();
}

export function clearInstallFailed() {
  installFailed = false;
  notifyInstall();
}
