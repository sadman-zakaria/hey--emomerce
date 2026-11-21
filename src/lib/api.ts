import type {
  Banner,
  Category,
  MediaItem,
  Order,
  Product,
  User,
} from "./types";

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

export type BootstrapPayload = {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  mode: string;
};

export type AuthPayload = {
  token: string;
  user: User;
};

export type ProductInput = Omit<Product, "id" | "createdAt">;
export type CategoryInput = Omit<Category, "id" | "productCount">;
export type BannerInput = Omit<Banner, "id">;
export type UserInput = Omit<User, "id" | "createdAt"> & { password?: string };
export type OrderInput = Omit<Order, "id" | "orderNumber" | "createdAt" | "paymentStatus">;
export type AdminStats = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalCustomers: number;
  lowStockProducts: Product[];
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
};

const env = import.meta.env;
const configuredBase = env["VITE_API_URL"] as string | undefined;

export const API_BASE = (configuredBase?.trim() || "http://localhost:4000/api").replace(/\/+$/, "");

const ADMIN_TOKEN_KEY = "maison.admin.token";
const USER_TOKEN_KEY = "maison.user.token";
const OFFLINE_KEY = "maison.admin.offline";

export class ApiError extends Error {
  status: number;
  offline: boolean;
  details: unknown;

  constructor(message: string, status = 0, offline = false, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.offline = offline;
    this.details = details;
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readToken(key: string): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(key);
}

function writeToken(key: string, token: string | null) {
  if (!canUseStorage()) return;
  if (token) window.localStorage.setItem(key, token);
  else window.localStorage.removeItem(key);
}

export function getToken(): string | null {
  return readToken(ADMIN_TOKEN_KEY);
}

export function setToken(token: string | null) {
  writeToken(ADMIN_TOKEN_KEY, token);
}

export function getUserToken(): string | null {
  return readToken(USER_TOKEN_KEY);
}

export function setUserToken(token: string | null) {
  writeToken(USER_TOKEN_KEY, token);
}

export function getOfflineSession(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(OFFLINE_KEY) === "1";
}

export function setOfflineSession(enabled: boolean) {
  if (!canUseStorage()) return;
  if (enabled) window.localStorage.setItem(OFFLINE_KEY, "1");
  else window.localStorage.removeItem(OFFLINE_KEY);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  token?: string | null;
  timeoutMs?: number;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const token = options.token !== undefined ? options.token : getToken();
  if (options.auth !== false && token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
    signal: controller.signal,
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(
      "Could not reach the API server. Check that the backend is running and VITE_API_URL is correct.",
      0,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    const details =
      payload && typeof payload === "object" && "details" in payload
        ? (payload as { details: unknown }).details
        : undefined;
    throw new ApiError(message, response.status, false, details);
  }

  return payload as T;
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  health: () => request<{ ok: boolean; mode: string }>("/health", { timeoutMs: 4000 }),

  bootstrap: () => request<BootstrapPayload>("/bootstrap"),

  login: (email: string, password: string) =>
    request<AuthPayload>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  adminLogin: (email: string, password: string) =>
    request<AuthPayload>("/auth/admin/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  register: (name: string, email: string, password: string) =>
    request<AuthPayload>("/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    }),

  me: () => request<{ user: User }>("/auth/me"),

  customerMe: (token = getUserToken()) =>
    request<{ user: User }>("/auth/me", { token }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  account: {
    orders: (token = getUserToken()) =>
      request<{ items: Order[]; total: number }>("/account/orders", { token }),
    updateProfile: (name: string, token = getUserToken()) =>
      request<{ user: User }>("/account/profile", {
        method: "PATCH",
        body: { name },
        token,
      }),
  },

  createOrder: (body: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    city: string;
    zipCode: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
  }) => request<Order>("/orders", { method: "POST", body, auth: false }),

  admin: {
    stats: () => request<AdminStats>("/admin/stats"),

    products: {
      list: (params: Record<string, string | number | boolean | undefined> = {}) =>
        request<Paginated<Product>>(`/admin/products${queryString(params)}`),
      create: (body: ProductInput) =>
        request<Product>("/admin/products", { method: "POST", body }),
      update: (id: string, body: Partial<ProductInput>) =>
        request<Product>(`/admin/products/${id}`, { method: "PATCH", body }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/admin/products/${id}`, { method: "DELETE" }),
    },

    categories: {
      list: () => request<Category[]>("/admin/categories"),
      create: (body: CategoryInput) =>
        request<Category>("/admin/categories", { method: "POST", body }),
      update: (id: string, body: Partial<CategoryInput>) =>
        request<Category>(`/admin/categories/${id}`, { method: "PATCH", body }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/admin/categories/${id}`, { method: "DELETE" }),
    },

    banners: {
      list: () => request<Banner[]>("/admin/banners"),
      create: (body: BannerInput) =>
        request<Banner>("/admin/banners", { method: "POST", body }),
      update: (id: string, body: Partial<BannerInput>) =>
        request<Banner>(`/admin/banners/${id}`, { method: "PATCH", body }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/admin/banners/${id}`, { method: "DELETE" }),
    },

    orders: {
      list: (params: Record<string, string | number | boolean | undefined> = {}) =>
        request<Paginated<Order>>(`/admin/orders${queryString(params)}`),
      get: (id: string) => request<Order>(`/admin/orders/${id}`),
      updateStatus: (id: string, status: Order["status"]) =>
        request<Order>(`/admin/orders/${id}/status`, {
          method: "PATCH",
          body: { status },
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/admin/orders/${id}`, { method: "DELETE" }),
    },

    users: {
      list: (params: Record<string, string | number | boolean | undefined> = {}) =>
        request<User[]>(`/admin/users${queryString(params)}`),
      create: (body: UserInput) => request<User>("/admin/users", { method: "POST", body }),
      update: (id: string, body: Partial<UserInput>) =>
        request<User>(`/admin/users/${id}`, { method: "PATCH", body }),
      remove: (id: string) => request<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
    },

    media: {
      list: () => request<MediaItem[]>("/admin/media"),
      create: (body: { name: string; dataUrl: string }) =>
        request<MediaItem>("/admin/media", { method: "POST", body }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/admin/media/${id}`, { method: "DELETE" }),
    },
  },
};