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

// api.ts

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {

  // Build headers from caller
  const headers = new Headers(options.headers as HeadersInit | undefined);

  // Always accept JSON
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // Only set Content-Type if we actually have a body and it's not FormData
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(API_BASE + path, {
    credentials: "include",
    ...options,
    headers,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
  }

  return json as T;
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
  return res as { ok: boolean; count: number };
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
  | "TRADE_MATCHED"
  | "BID_EXPIRED"
  | "LISTING_EXPIRED_NO_MATCH"
  | "PAYMENT_COMPLETED";

export interface BuyerNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
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
    ok?: boolean;
    items?: any[];
    unreadCount?: number;
  }>("/buyer/notifications");

  const rawItems = res.items ?? [];

  const allowed: NotificationType[] = [
  "TRADE_MATCHED",
  "BID_EXPIRED",
  "LISTING_EXPIRED_NO_MATCH",
  "PAYMENT_COMPLETED",
];

const items: BuyerNotification[] = (rawItems ?? [])
  .map((n) => {
    // raw type can come from "type" or "Type"
    const rawType = String(n.type ?? n.Type ?? "").trim().toUpperCase();

    // Strict: only keep the 4 canonical types
    if (!allowed.includes(rawType as NotificationType)) {
      return null;
    }

    // Read flag: handle boolean or legacy string values
    const readVal = n.isRead ?? n.Read ?? false;
    const isRead =
      typeof readVal === "boolean"
        ? readVal
        : String(readVal).trim().toLowerCase() === "true";

    return {
      id: String(n.id ?? n.SK ?? ""),
      type: rawType as NotificationType,
      title: String(n.title ?? "Update on your bids and listings"),
      message: String(n.message ?? ""),
      createdAt: String(n.createdAt ?? n.CreatedAt ?? ""),
      isRead,
    } as BuyerNotification;
  })
  .filter((x): x is BuyerNotification => x !== null);

  const unreadCount =
    res.unreadCount ?? items.filter((n) => !n.isRead).length;

  return { items, unreadCount };
}


// POST /buyer/notifications/mark-read
export async function api_markNotificationsRead(payload: {
  ids?: string[]; // optional; empty = mark all
}): Promise<void> {
  await api_post("/buyer/notifications/mark-read", payload);
}

export async function getListingDetails(listingId: string) {
  const encodedId = encodeURIComponent(listingId);

  const resp = await fetch(`${API_BASE}/buyer/listings/${encodedId}`, {
    credentials: "include",
  });

  if (!resp.ok) {
    throw new Error(`Failed to load listing details: ${resp.status}`);
  }

  return resp.json();
}

export async function signGetImage(key: string): Promise<string> {
  const res = await api_get<{ url: string }>(
    `/files/sign-get?key=${encodeURIComponent(key)}`
  );
  return res.url;
}

export type AuctionMode = "continuous" | "interval" | "end_of_window";

export interface MarketSummary {
  marketKey: string;
  devicePk: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
  storage: string | null;
  ram: string | null;
  grade: "A" | "B" | "C";
  numListings: number;
  numContinuous: number;
  numInterval: number;
  numEndOfWindow: number;
  sellerRangeMin: number | null;
  sellerRangeMax: number | null;
  platformMin: number | null;
  platformMax: number | null;
  releasePrice: number | null;
  releaseDate: string | null;
  numBids: number;
  numBidders: number;
}

export async function api_getMarkets(params?: {
  category?: string;
  brand?: string;
  model?: string;
  grade?: string;
}): Promise<MarketSummary[]> {
  const search = new URLSearchParams();

  if (params?.category && params.category !== "All") {
    search.set("category", params.category);
  }
  if (params?.brand && params.brand !== "All") {
    search.set("brand", params.brand);
  }
  if (params?.model && params.model !== "All") {
    search.set("model", params.model);
  }
  if (params?.grade && params.grade !== "All") {
    search.set("grade", params.grade.toUpperCase());
  }

  const qs = search.toString();
  const path = qs ? `/buyer/markets?${qs}` : "/buyer/markets";

  const res = await api_get<{ ok: boolean; items: MarketSummary[] }>(path);
  return res.items ?? [];
}

// ==============================
// Buyer – Purchases (Cart)
// ==============================

export interface BuyerPurchase {
  listingId: string;           // PK of the listing request
  marketKey?: string;
  brand?: string;
  model?: string;
  variant?: string;
  grade?: string;
  sellerPk?: string;
  auctionMode?: string | null;
  status: string;              // listing status: ended / active / expired
  paymentStatus: string;       // "pending" | "paid"
  tradePrice: number | null;
  matchedAt?: string | null;
  paidAt?: string | null;
}

// GET /buyer/purchases
export async function api_getPurchases(): Promise<BuyerPurchase[]> {
  const res = await api_get<{ ok: boolean; items: BuyerPurchase[] }>(
    "/buyer/purchases"
  );

  // Backend returns { ok: true, items: [...] }
  const items = res.items ?? [];

  // Ensure listingId is always present and non-empty
  return items.map((it) => {
    const listingId =
      it.listingId ?? (it as any).pk ?? (it as any).listingPk ?? "";

    return {
      ...it,
      listingId,
    };
  });
}

// POST /buyer/purchases/<listingId>/pay
export async function api_payForPurchase(listingId: string): Promise<void> {
  if (!listingId) {
    throw new Error("Missing listingId");
  }
  await api_post(`/buyer/purchases/${encodeURIComponent(listingId)}/pay`, {});
}
