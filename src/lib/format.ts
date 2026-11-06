import type { Expense, Product, Sale } from "@/types/store";

export const money = (amount: number) =>
  new Intl.NumberFormat("ar-SY-u-nu-latn", {
    style: "currency",
    currency: "SYP",
    maximumFractionDigits: 0,
  }).format(amount);

export const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);

export const salePrice = (sale: Sale, product?: Product) =>
  sale.unitPrice ?? product?.price ?? 0;

/** Cost is frozen on the sale so later product cost changes don't rewrite past profit. */
export const saleCost = (sale: Sale, product?: Product) =>
  sale.unitCost ?? product?.cost ?? 0;

export const saleCostUsd = (sale: Sale, product?: Product) =>
  sale.unitCostUsd ?? product?.costUsd ?? 0;

export const shortDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
};

/** Full day line for reports: weekday + day + month, e.g. "الجمعة · 6 نوفمبر". */
export const dayLabel = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const weekday = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long" }).format(parsed);
  const dayMonth = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "long",
  }).format(parsed);
  return `${weekday} · ${dayMonth}`;
};

/** Split parts for day-by-day cards: weekday + "6 نوفمبر". */
export const dayParts = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return { weekday: date, dayMonth: "" };
  return {
    weekday: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long" }).format(parsed),
    dayMonth: new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      day: "numeric",
      month: "long",
    }).format(parsed),
  };
};

/** Every ISO date (YYYY-MM-DD) in a YYYY-MM month, ascending. */
export const datesInMonth = (ym: string): string[] => {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return [];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
};

export const monthKey = (date: string) => String(date || "").slice(0, 7);

export const formatMonthLabel = (ym: string) => {
  const parsed = new Date(`${ym}-01T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return ym;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const isRentExpense = (expense: Expense) =>
  /إيجار|ايجار|rent/i.test(`${expense.category} ${expense.categoryAr}`);

/** Buying stock is not deducted from net profit: its cost is already counted when each item sells. */
export const isStockPurchase = (expense: Pick<Expense, "category" | "categoryAr">) =>
  /بضاعة/.test(`${expense.category} ${expense.categoryAr}`);

export const costFromUsd = (costUsd: number, usdRate: number) => Math.round(costUsd * usdRate);

export const excelDate = (value: string | number) => {
  if (typeof value === "number") {
    const parsed = new Date(Math.round((value - 25569) * 86400 * 1000));
    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
  }
  return String(value || "");
};

export const cellValue = (row: Record<string, string | number>, keys: string[]) => {
  const key = keys.find((candidate) => row[candidate] !== undefined);
  return key ? row[key] : "";
};
