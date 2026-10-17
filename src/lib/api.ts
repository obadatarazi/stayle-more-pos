const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

export const isCloudEnabled = Boolean(API_URL);

const TOKEN_KEY = "style-more-api-token";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getApiToken(): string | null {
  try {
    const token = readStorage(TOKEN_KEY);
    if (token && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    }
    return token;
  } catch {
    return null;
  }
}

export function setApiToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("API is not configured");

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getApiToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload.data as T;
}

export type ApiUser = {
  username: string;
  displayName: string;
  shortName: string;
};

export async function apiLogin(username: string, password: string) {
  const data = await apiRequest<{ token: string; user: ApiUser }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setApiToken(data.token);
  return data.user;
}

export async function apiGetStore() {
  return apiRequest<{
    products: Array<Record<string, unknown>>;
    sales: Array<Record<string, unknown>>;
    expenses: Array<Record<string, unknown>>;
    settings?: { usdRate?: number };
    exchanges?: Array<Record<string, unknown>>;
  }>("/store");
}

export async function apiPutStore(store: unknown) {
  return apiRequest("/store", {
    method: "PUT",
    body: JSON.stringify(store),
  });
}

export async function apiUpsertExchange(exchange: unknown) {
  return apiRequest("/exchanges", {
    method: "POST",
    body: JSON.stringify(exchange),
  });
}

export async function apiDeleteExchange(id: number) {
  return apiRequest(`/exchanges/${id}`, { method: "DELETE" });
}

export async function apiPutSettings(settings: unknown) {
  return apiRequest("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function apiUpsertProduct(product: unknown) {
  return apiRequest("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function apiUpsertSale(sale: unknown) {
  return apiRequest("/sales", {
    method: "POST",
    body: JSON.stringify(sale),
  });
}

export async function apiDeleteSale(id: number) {
  return apiRequest(`/sales/${id}`, { method: "DELETE" });
}

export async function apiUpsertExpense(expense: unknown) {
  return apiRequest("/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}
