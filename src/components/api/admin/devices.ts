// src/components/api/devices.ts
const API = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

export type DeviceRow = {
  pk: string;
  category: "Laptop" | "Smartphone" | "Tablet";
  brand: string;
  model: string;
  variant?: string | null;
  active: boolean;
  isModified: boolean;
  updatedAt?: string | null;
  storage?: string | null;
  ram?: string | null;
  releaseDate?: string | null;   // keep as text (YYYY-MM-DD)
  releasePrice?: number | null;
};

export type Paged<T> = { items: T[]; cursor?: string | null };

// ---- utils ----
function qstr(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && String(v).trim() !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

// ---- GET helpers ----
async function jsonFetch<T>(
  path: string,
  init: RequestInit & { method: "POST" | "PATCH" | "DELETE" }
) {
  const r = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...init,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

// ---- LIST ----
export async function adminListDevices(params: {
  category: "All" | "Laptop" | "Smartphone" | "Tablet";
  brand?: string;
  q?: string;
  active: "all" | "true" | "false";
  limit?: number;
  cursor?: string | null;
}){
  const sp = new URLSearchParams();
  sp.set("category", params.category);
  if (params.brand) sp.set("brand", params.brand);
  if (params.q) sp.set("q", params.q);
  sp.set("active", params.active);
  sp.set("limit", String(params.limit ?? 25));       // ← ensure limit is sent
  if (params.cursor) sp.set("cursor", params.cursor);

  const res = await fetch(`${API}/admin/devices?${sp.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load devices");
  return res.json() as Promise<{ items: DeviceRow[]; cursor?: string | null }>;
}

export async function adminListBrands(category: "Laptop" | "Smartphone" | "Tablet") {
  const r = await fetch(`${API}/admin/devices/brands?category=${encodeURIComponent(category)}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const j = await r.json();
  return j.items as string[];
}

// ---- CRUD ----
export async function createDevice(body: {
  category: "Laptop" | "Smartphone" | "Tablet";
  brand: string;
  model: string;
  variant?: string;
  active?: boolean;
  isModified?: boolean;
  storage?: string;
  ram?: string;
  releaseDate?: string;
  releasePrice?: number;
}) {
  return jsonFetch<{ ok: true; device: DeviceRow }>(`/admin/devices`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateDevice(
  pk: string,
  body: Partial<{
    category: "Laptop" | "Smartphone" | "Tablet";
    brand: string;
    model: string;
    variant: string | null;
    active: boolean;
    isModified: boolean;
    storage: string | null;
    ram: string | null;
    releaseDate: string | null;
    releasePrice: number | null;

  }>
) {
  return jsonFetch<{ ok: true; device: DeviceRow }>(`/admin/devices/${encodeURIComponent(pk)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function setDeviceActive(pk: string, active: boolean) {
  return jsonFetch<{ ok: true; pk: string; active: boolean }>(
    `/admin/devices/${encodeURIComponent(pk)}/active`,
    { method: "POST", body: JSON.stringify({ active }) }
  );
}

export async function deleteDevice(pk: string, hard = false) {
  const q = hard ? "?hard=true" : "";
  return jsonFetch<{ ok: true }>(`/admin/devices/${encodeURIComponent(pk)}${q}`, {
    method: "DELETE",
  });
}

// ---- Import / Export ----
export async function adminImportDevices(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/admin/devices/import`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export async function exportTableXlsx(params: {
  category?: string; brand?: string; q?: string; active?: "all" | "true" | "false";
}) {
  const qs = qstr(params as any);
  const r = await fetch(`${API}/admin/devices/export/table${qs}`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.blob(); // <-- correct: response.blob()
}

export async function exportGroupedXlsx(params: {
  category?: string; brand?: string; q?: string; active?: "all" | "true" | "false";
}) {
  const qs = qstr(params as any);
  const r = await fetch(`${API}/admin/devices/export/grouped${qs}`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.blob(); // <-- correct: response.blob()
}
