export const site = {
  brandName: "Stayle & More",
  brandNameAr: "ستايل آند مور",
  domain: "styleandmore.local",
  logoSrc: `${import.meta.env.BASE_URL}logo.jpg`,
} as const;

export const storageKeys = {
  auth: "style-more-auth",
  products: "style-more-products",
  sales: "style-more-sales",
  expenses: "style-more-expenses",
  settings: "style-more-settings",
  exchanges: "style-more-exchanges",
  // Cloud writes waiting to reach the server (survives reloads, logout and offline restarts).
  outbox: "style-more-outbox",
  lastSync: "style-more-last-sync",
  // "on" | "off"; missing means the user has not been asked yet.
  notifyPref: "style-more-notify",
} as const;

export const defaultSettings = { usdRate: 140 } as const;

export const DEFAULT_REORDER_LEVEL = 5;
