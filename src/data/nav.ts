import type { IconName, Tab } from "@/types/store";

export const navItems: { id: Tab; labelKey: string; shortKey: string; hintKey: string; icon: IconName }[] = [
  { id: "dashboard", labelKey: "nav.dashboard", shortKey: "nav.dashboardShort", hintKey: "nav.dashboardHint", icon: "grid" },
  { id: "products", labelKey: "nav.products", shortKey: "nav.productsShort", hintKey: "nav.productsHint", icon: "box" },
  { id: "sales", labelKey: "nav.sales", shortKey: "nav.salesShort", hintKey: "nav.salesHint", icon: "receipt" },
  { id: "expenses", labelKey: "nav.expenses", shortKey: "nav.expensesShort", hintKey: "nav.expensesHint", icon: "wallet" },
  { id: "exchange", labelKey: "nav.exchange", shortKey: "nav.exchangeShort", hintKey: "nav.exchangeHint", icon: "exchange" },
  { id: "reports", labelKey: "nav.reports", shortKey: "nav.reportsShort", hintKey: "nav.reportsHint", icon: "chart" },
  { id: "settings", labelKey: "nav.settings", shortKey: "nav.settingsShort", hintKey: "nav.settingsHint", icon: "settings" },
];

export const tabFromHash = (): Tab => {
  const hash = window.location.hash.replace("#", "");
  return navItems.some((item) => item.id === hash) ? (hash as Tab) : "dashboard";
};

export const mobileNavItems = navItems.filter((item) => item.id !== "settings" && item.id !== "exchange");
