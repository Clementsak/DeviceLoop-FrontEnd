// src/components/api/admin.ts
const API = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

export type Role = "buyers" | "sellers" | "admin";
export type Verified = "pending" | "verified" | "rejected";

export type AdminUser = {
  user_pk: string;
  email?: string | null;
  role: Role;
  isVerified: boolean;
  verifiedStatus: Verified;
  lastLogin?: string | null;
  groups: string[];
};

export type Paged<T> = { items: T[]; cursor?: string | null };

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function get<T>(path: string) {
  const r = await fetch(`${API}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}
async function del(path: string) {
  const r = await fetch(`${API}${path}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function patch<TBody extends object, TRes = any>(path: string, body: TBody) {
  const r = await fetch(`${API}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as TRes;
}
async function post<TBody extends object, TRes = any>(path: string, body: TBody) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as TRes;
}

// --- Users ---
export async function adminListUsers(params: {
  q?: string;
  role?: Role;
  verified?: Verified;
  limit?: number;
  cursor?: string | null;
}): Promise<Paged<AdminUser>> {
  const query = buildQuery({
    q: params.q?.trim(),
    role: params.role,
    verified: params.verified,
    limit: params.limit,
    cursor: params.cursor ?? undefined,
  });
  return get<Paged<AdminUser>>(`/admin/users${query}`);
}

export async function adminChangeRole(user_pk: string, newRole: Extract<Role, "buyers" | "sellers">) {
  return patch(`/admin/users/${encodeURIComponent(user_pk)}/role`, { newRole });
}

export async function adminDeleteUser(user_pk: string) {
  return del(`/admin/users/${encodeURIComponent(user_pk)}`);
}

// --- Verification queue ---
export type VerifyQueueItem = {
  user_pk: string;
  submittedAt?: string;
  type: "VerifyUser" | "VerifySeller";
  data?: Record<string, any>;
  sellerProfile?: Record<string, any>;
};

export async function adminGetVerifyQueue(
  kind: "user" | "seller",
  limit = 25,
  cursor?: string | null
): Promise<Paged<VerifyQueueItem>> {
  const qs = new URLSearchParams({ type: kind, limit: String(limit) });
  if (cursor) qs.set("cursor", cursor);
  return get<Paged<VerifyQueueItem>>(`/admin/verify/queue?${qs.toString()}`);
}

export async function adminVerifyDecision(
  user_pk: string,
  kind: "user" | "seller",
  decision: "approve" | "reject",
  reason?: string
) {
  return post(`/admin/verify/${encodeURIComponent(user_pk)}/decision`, { type: kind, decision, reason });
}

export type AdminOrderRow = {
  listingId: string;
  marketKey?: string;
  sellerPk?: string;
  buyerPk?: string;
  brand?: string;
  model?: string;
  variant?: string;
  grade?: string;
  paymentStatus: "pending" | "paid";
  paidAt?: string | null;
  tradePrice?: number;
  listingStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function adminGetOrders(
  paymentStatus: "all" | "pending" | "paid" = "all"
) {
  const qs = new URLSearchParams();
  if (paymentStatus !== "all") qs.set("paymentStatus", paymentStatus);

  const suffix = qs.toString();
  const path = suffix ? `/admin/orders?${suffix}` : "/admin/orders";

  return get<{ ok: boolean; items: AdminOrderRow[] }>(path);
}
