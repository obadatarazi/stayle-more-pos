import {
  apiDeleteSale,
  apiGetStore,
  apiPutStore,
  apiPutSettings,
  apiUpsertExchange,
  apiDeleteExchange,
  apiUpsertExpense,
  apiDeleteExpense,
  apiUpsertProduct,
  apiUpsertSale,
  isCloudEnabled,
} from "./api";

export type CloudProduct = {
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

export type CloudSale = {
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

export type CloudExpense = {
  id: number;
  category: string;
  categoryAr: string;
  amount: number;
  dueDate: string;
};

export type CloudSettings = {
  usdRate: number;
};

export type CloudExchange = {
  id: number;
  date: string;
  direction: "sypToUsd" | "usdToSyp";
  sypAmount: number;
  usdAmount: number;
  note?: string;
  doneBy?: string;
  doneByName?: string;
};

export type CloudStore = {
  products: CloudProduct[];
  sales: CloudSale[];
  expenses: CloudExpense[];
  settings: CloudSettings;
  // Optional on replace: omitting it leaves the server's exchange log untouched.
  exchanges?: CloudExchange[];
};

const mapProduct = (row: Record<string, unknown>): CloudProduct => ({
  sku: String(row.sku),
  name: String(row.name || ""),
  nameAr: String(row.nameAr || row.name_ar || ""),
  category: String(row.category || "أخرى"),
  cost: Number(row.cost || 0),
  price: Number(row.price || 0),
  costUsd: Number(row.costUsd ?? row.cost_usd ?? 0),
  usdRate: Number(row.usdRate ?? row.usd_rate ?? 0),
  initialStock: Number(row.initialStock ?? row.initial_stock ?? 0),
  reorderLevel: Number(row.reorderLevel ?? row.reorder_level ?? 5),
  quickSale: Boolean(row.quickSale ?? row.quick_sale ?? false),
});

const mapSale = (row: Record<string, unknown>): CloudSale => ({
  id: Number(row.id),
  date: String(row.date),
  sku: String(row.sku),
  quantity: Number(row.quantity || 0),
  unitPrice:
    row.unitPrice === null || row.unitPrice === undefined
      ? row.unit_price === null || row.unit_price === undefined
        ? undefined
        : Number(row.unit_price)
      : Number(row.unitPrice),
  unitCost:
    row.unitCost === null || row.unitCost === undefined
      ? row.unit_cost === null || row.unit_cost === undefined
        ? undefined
        : Number(row.unit_cost)
      : Number(row.unitCost),
  unitCostUsd:
    row.unitCostUsd === null || row.unitCostUsd === undefined
      ? row.unit_cost_usd === null || row.unit_cost_usd === undefined
        ? undefined
        : Number(row.unit_cost_usd)
      : Number(row.unitCostUsd),
  soldBy:
    row.soldBy === null || row.soldBy === undefined || row.soldBy === ""
      ? row.sold_by === null || row.sold_by === undefined || row.sold_by === ""
        ? undefined
        : String(row.sold_by)
      : String(row.soldBy),
  soldByName:
    row.soldByName === null || row.soldByName === undefined || row.soldByName === ""
      ? row.sold_by_name === null || row.sold_by_name === undefined || row.sold_by_name === ""
        ? undefined
        : String(row.sold_by_name)
      : String(row.soldByName),
});

const mapExpense = (row: Record<string, unknown>): CloudExpense => ({
  id: Number(row.id),
  category: String(row.category || ""),
  categoryAr: String(row.categoryAr || row.category_ar || ""),
  amount: Number(row.amount || 0),
  dueDate: String(row.dueDate || row.due_date || ""),
});

const mapExchange = (row: Record<string, unknown>): CloudExchange => ({
  id: Number(row.id),
  date: String(row.date || ""),
  direction: row.direction === "usdToSyp" ? "usdToSyp" : "sypToUsd",
  sypAmount: Number(row.sypAmount ?? row.syp_amount ?? 0),
  usdAmount: Number(row.usdAmount ?? row.usd_amount ?? 0),
  note: row.note ? String(row.note) : undefined,
  doneBy: row.doneBy ? String(row.doneBy) : undefined,
  doneByName: row.doneByName ? String(row.doneByName) : undefined,
});

export async function fetchCloudStore(): Promise<CloudStore> {
  if (!isCloudEnabled) throw new Error("Cloud is not configured");
  const data = await apiGetStore();
  return {
    products: (data.products || []).map((row) => mapProduct(row)),
    sales: (data.sales || []).map((row) => mapSale(row)),
    expenses: (data.expenses || []).map((row) => mapExpense(row)),
    settings: { usdRate: Number(data.settings?.usdRate || 0) },
    exchanges: (data.exchanges || []).map((row) => mapExchange(row)),
  };
}

export async function upsertCloudProduct(product: CloudProduct) {
  if (!isCloudEnabled) return;
  await apiUpsertProduct(product);
}

export async function insertCloudSale(sale: CloudSale) {
  if (!isCloudEnabled) return;
  await apiUpsertSale(sale);
}

export async function deleteCloudSale(id: number) {
  if (!isCloudEnabled) return;
  await apiDeleteSale(id);
}

export async function insertCloudExpense(expense: CloudExpense) {
  if (!isCloudEnabled) return;
  await apiUpsertExpense(expense);
}

export async function deleteCloudExpense(id: number) {
  if (!isCloudEnabled) return;
  await apiDeleteExpense(id);
}

export async function insertCloudExchange(exchange: CloudExchange) {
  if (!isCloudEnabled) return;
  await apiUpsertExchange(exchange);
}

export async function deleteCloudExchange(id: number) {
  if (!isCloudEnabled) return;
  await apiDeleteExchange(id);
}

export async function saveCloudSettings(settings: CloudSettings) {
  if (!isCloudEnabled) return;
  await apiPutSettings(settings);
}

export async function replaceCloudStore(store: CloudStore) {
  if (!isCloudEnabled) return;
  await apiPutStore(store);
}

export function subscribeCloudStore(onChange: () => void) {
  if (!isCloudEnabled) return () => undefined;

  const timer = window.setInterval(() => {
    onChange();
  }, 15000);

  const onFocus = () => onChange();
  window.addEventListener("focus", onFocus);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", onFocus);
  };
}
