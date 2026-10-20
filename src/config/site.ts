export const site = {
  brandName: "Stayle & More",
  brandNameAr: "ستايل آند مور",
  domain: "styleandmore.local",
  logoSrc: "/logo.jpg",
} as const;

export const storageKeys = {
  auth: "style-more-auth",
  products: "style-more-products",
  sales: "style-more-sales",
  expenses: "style-more-expenses",
  settings: "style-more-settings",
  exchanges: "style-more-exchanges",
} as const;

export const defaultSettings = { usdRate: 140 } as const;

export const DEFAULT_REORDER_LEVEL = 5;
