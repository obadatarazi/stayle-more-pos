// Whether the API is reachable. `navigator.onLine === false` is trusted; `true` only means
// "maybe", so a failed request also flips us offline until the next request gets through.

type Listener = (online: boolean) => void;

let online = typeof navigator === "undefined" ? true : navigator.onLine;
const listeners = new Set<Listener>();

function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  for (const listener of listeners) listener(online);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
}

export function isOnline() {
  return online;
}

/** The device itself says there is no network, so requests are pointless. */
export function isDeviceOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function reportReachable() {
  setOnline(true);
}

export function reportUnreachable() {
  setOnline(false);
}

export function subscribeNetwork(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
