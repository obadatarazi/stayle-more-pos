import { useSyncExternalStore } from "react";
import { storageKeys } from "@/config/site";

export type NotificationState = "unsupported" | "denied" | "ask" | "off" | "on";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readPref(): "on" | "off" | null {
  try {
    const value = localStorage.getItem(storageKeys.notifyPref);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

function writePref(value: "on" | "off") {
  try {
    localStorage.setItem(storageKeys.notifyPref, value);
  } catch {
    // ignore
  }
  notify();
}

/** Combined browser permission + the user's own preference. */
export function getNotificationState(): NotificationState {
  if (!notificationsSupported()) return "unsupported";
  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  const pref = readPref();
  if (permission === "granted") return pref === "off" ? "off" : "on";
  return pref === "off" ? "off" : "ask";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Permission can change from browser settings while the app is open.
  window.addEventListener("focus", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("focus", listener);
  };
}

export function useNotificationState() {
  return useSyncExternalStore(subscribe, getNotificationState, getNotificationState);
}

/** Must run from a user gesture (tap), or browsers silently ignore the prompt. */
export async function enableNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  writePref(permission === "granted" ? "on" : "off");
  return permission === "granted";
}

export function disableNotifications() {
  writePref("off");
}

export type SystemNotification = {
  title: string;
  body: string;
  /** Same tag replaces the previous notification instead of stacking. */
  tag: string;
  /** Re-alert (sound/vibrate) even when replacing a notification with the same tag. */
  renotify?: boolean;
};

export async function showSystemNotification({ title, body, tag, renotify = false }: SystemNotification) {
  if (getNotificationState() !== "on") return false;
  const base = import.meta.env.BASE_URL;
  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    tag,
    renotify,
    icon: `${base}pwa-192x192.png`,
    badge: `${base}favicon-32.png`,
    lang: document.documentElement.lang || "ar",
    dir: document.documentElement.dir === "ltr" ? "ltr" : "rtl",
    data: { url: window.location.href },
  };
  // Android Chrome only allows notifications through the service worker.
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }
  } catch (error) {
    console.error(error);
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
