export type Tab = "dashboard" | "products" | "sales" | "expenses" | "exchange" | "reports" | "settings";

export type Product = {
  sku: string;
  name: string;
  nameAr: string;
  category: string;
  cost: number;
  price: number;
  costUsd: number;
  usdRate: number;
  initialStock: number;
  reorderLevel: number;
  quickSale: boolean;
};

export type Sale = {
  id: number;
  date: string;
  sku: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
  unitCostUsd?: number;
  soldBy?: string;
  soldByName?: string;
};

export type Expense = {
  id: number;
  category: string;
  categoryAr: string;
  amount: number;
  dueDate: string;
  note?: string;
};

/** Currency exchange log (SYP <-> USD); kept out of all reports. */
export type Exchange = {
  id: number;
  date: string;
  direction: "sypToUsd" | "usdToSyp";
  sypAmount: number;
  usdAmount: number;
  note?: string;
  doneBy?: string;
  doneByName?: string;
};

export type IconName =
  | "grid"
  | "box"
  | "receipt"
  | "wallet"
  | "search"
  | "bell"
  | "arrowUp"
  | "arrowDown"
  | "profit"
  | "plus"
  | "chevron"
  | "calendar"
  | "menu"
  | "close"
  | "check"
  | "warning"
  | "sparkles"
  | "lock"
  | "user"
  | "logout"
  | "edit"
  | "trash"
  | "minus"
  | "cart"
  | "cash"
  | "chart"
  | "settings"
  | "exchange"
  | "filter"
  | "cloud"
  | "cloudOff"
  | "refresh"
  | "download";

export type StoreSettings = {
  usdRate: number;
};

export type CartLine = {
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type AuthUser = {
  username: string;
  displayName: string;
  shortName: string;
  at: number;
};

export type StockFilter = "all" | "available" | "low" | "out" | "quick";
export type ProductSort = "newest" | "oldest" | "name" | "priceHigh" | "priceLow" | "stockLow";
export type PriceScope = "selected" | "category" | "all";
