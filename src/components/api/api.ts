// src/components/api/api.ts

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

async function handleJson(res: Response) {
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export interface EditBidResponse {
  ok: boolean;
  marketKey: string;
  bidPk: string;
  bidSk: string;
  newBidPrice: number;
  editCount: number;
}

export const api = {
  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleJson(res);
  },

  async post<T = any>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleJson(res);
  },

  async put<T = any>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleJson(res);
  },
};

// ===== Auth / /api/me helpers (used by AuthContext etc.) =====

type MeResponse = {
  user: {
    sub: string;
    email?: string;
    phone_number?: string;
    role: "buyers" | "sellers" | "admin";
    groups: string[];
    verified: boolean;
  } | null;
};

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/api/me");
}

export function beginLogin() {
  window.location.href = `${API_BASE}/auth/login`;
}
export function beginLogout() {
  window.location.href = `${API_BASE}/auth/logout`;
}
export function beginSignup() {
  window.location.href = `${API_BASE}/auth/signup`;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
  }

  return (await res.json()) as T;
}

export function api_get<T>(path: string) {
  return request<T>(path);
}

export function api_post<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// api.ts (near the bottom)

// ---- Verification ----
export type BuyerVerifyPayload = {
  termsAccepted: boolean;
  coords?: { lat: number; lon: number; accuracy?: number | null } | null;
};

export async function submitBuyerVerification(payload: BuyerVerifyPayload) {
  return api_post("/api/verify/buyer", payload);
}

export type SellerRegisterPayload = {
  organisationName: string;
  organisationRegNo?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
};

export async function submitSellerRegistration(payload: SellerRegisterPayload) {
  return api_post("/api/verify/seller", payload);
}

export async function getNotificationsUnreadCount() {
  const res = await api.get("/buyer/notifications/unread-count");
  return res.data as { ok: boolean; count: number };
}

export async function getNotifications() {
  const res = await api.get("/buyer/notifications");
  return res.data as { ok: boolean; items: Notification[] };
}

export async function markAllNotificationsRead() {
  const res = await api.post("/buyer/notifications/mark-all-read");
  return res.data as { ok: boolean };
}

// ================== Bidding (buyer) ==================

export type BidStatus = "open" | "filled" | "cancelled" | "expired";

export interface MyBidSummary {
  bidSk: string;            // e.g. "BID#1763795...#USER#003"
  marketKey: string;        // e.g. "Device#070#C"
  deviceLabel: string;      // e.g. "Apple MacBook Air"
  grade?: string;           // e.g. "C"
  finalBidPrice: number;
  buyerMin?: number | null;
  buyerMax?: number | null;
  status: BidStatus;
  createdAt: string;        // ISO
  updatedAt?: string | null;
  remainingEdits?: number;  // how many edits still allowed
  matchedListingId?: string | null;
  matchedTradePrice?: number | null;
}

// ================== Notifications ==================

export type NotificationType =
  | "bid_filled"
  | "bid_outbid"
  | "listing_sold"
  | "listing_matched"
  | "system";

export interface BuyerNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO string
  isRead: boolean;
  bidSk?: string | null;
  listingId?: string | null;
}

// =============== Buyer bids & notifications API ===============

// GET /buyer/my-bids
export async function api_getMyBids(): Promise<MyBidSummary[]> {
  const res = await api_get<{ items: MyBidSummary[] }>("/buyer/my-bids");
  // backend returns { ok: true, items: [...] } OR just { items: [...] }
  // so we normalise:
  const items = (res as any).items ?? (res as any).bids ?? res;
  return items ?? [];
}

// POST /buyer/bids/edit
export async function api_editBid(payload: {
  bidSk: string;
  marketKey: string;
  bidPrice: number;
  buyerMin?: number | null;
  buyerMax?: number | null;
}): Promise<EditBidResponse> {
  const body = {
    bidSk: payload.bidSk,
    marketKey: payload.marketKey,
    bidPrice: payload.bidPrice,
    buyerMin: payload.buyerMin,
    buyerMax: payload.buyerMax,
  };

  const res = await api_post<EditBidResponse>("/buyer/bids/edit", body);
  return res;
}



// POST /buyer/bids/cancel
export async function api_cancelBid(payload: {
  marketKey: string;
  bidSk: string;
}): Promise<void> {
  await api_post("/buyer/bids/cancel", payload);
}

// GET /buyer/notifications
export async function api_getNotifications(): Promise<{
  items: BuyerNotification[];
  unreadCount: number;
}> {
  const res = await api_get<{
    items?: BuyerNotification[];
    notifications?: BuyerNotification[];
    unreadCount?: number;
  }>("/buyer/notifications");

  const items =
    res.items ?? res.notifications ?? ([] as BuyerNotification[]);
  const unreadCount = res.unreadCount ?? items.filter(n => !n.isRead).length;

  return { items, unreadCount };
}

// POST /buyer/notifications/mark-read
export async function api_markNotificationsRead(payload: {
  ids?: string[]; // optional; empty = mark all
}): Promise<void> {
  await api_post("/buyer/notifications/mark-read", payload);
}
