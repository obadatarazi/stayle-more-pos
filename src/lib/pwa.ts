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
