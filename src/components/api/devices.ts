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
};

export type Paged<T> = { items: T[]; cursor?: string | null };

function qstr(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && String(v).trim() !== "") u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && String(v).trim() !== "") qs.set(k, String(v));
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

// LIST
export async function adminListDevices(params: {
  category?: string;          // "All" | "Laptop" | ...
  brand?: string;
  q?: string;
  active?: "all" | "true" | "false";
  limit?: number;
  cursor?: string | null;
}): Promise<Paged<DeviceRow>> {
  const qs = qstr(params as any);
  const r = await fetch(`${API}/admin/devices${qs}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export async function adminListBrands(category: "Laptop"|"Smartphone"|"Tablet") {
  const r = await fetch(`${API}/admin/devices/brands?category=${encodeURIComponent(category)}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const j = await r.json();
  return j.items as string[];
}

// CREATE
export async function createDevice(body: {
  category: "Laptop" | "Smartphone" | "Tablet";
  brand: string;
  model: string;
  variant?: string;
  active?: boolean;
  isModified?: boolean;
}) {
  return jsonFetch<{ ok: true; device: DeviceRow }>(`/admin/devices`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// UPDATE
export async function updateDevice(
  pk: string,
  body: Partial<{
    category: "Laptop" | "Smartphone" | "Tablet";
    brand: string;
    model: string;
    variant: string | null;
    active: boolean;
    isModified: boolean;
  }>
) {
  return jsonFetch<{ ok: true; device: DeviceRow }>(`/admin/devices/${encodeURIComponent(pk)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// TOGGLE ACTIVE
export async function setDeviceActive(pk: string, active: boolean) {
  return jsonFetch<{ ok: true; pk: string; active: boolean }>(
    `/admin/devices/${encodeURIComponent(pk)}/active`,
    { method: "POST", body: JSON.stringify({ active }) }
  );
}

// DELETE (soft by default; add ?hard=true if you want to hard delete)
export async function deleteDevice(pk: string, hard = false) {
  const q = hard ? "?hard=true" : "";
  return jsonFetch<{ ok: true }>(`/admin/devices/${encodeURIComponent(pk)}${q}`, {
    method: "DELETE",
  });
}

// Bulk import upsert
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

export async function adminExportDevicesTable(params: {
  category?: "All" | "Laptop" | "Smartphone" | "Tablet";
  brand?: string;
  q?: string;
  active?: "all" | "true" | "false";
}): Promise<Blob> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.brand)    qs.set("brand", params.brand);
  if (params.q)        qs.set("q", params.q);
  if (params.active)   qs.set("active", params.active);
  const r = await fetch(`${API}/admin/devices/export/table?${qs.toString()}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return await r.blob();
}

export async function adminExportDevicesGrouped(params: {
  category?: "All" | "Laptop" | "Smartphone" | "Tablet";
  brand?: string;
  q?: string;
  active?: "all" | "true" | "false";
}): Promise<Blob> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.brand)    qs.set("brand", params.brand);
  if (params.q)        qs.set("q", params.q);
  if (params.active)   qs.set("active", params.active);
  const r = await fetch(`${API}/admin/devices/export/grouped?${qs.toString()}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return await r.blob();
}

export async function exportTableXlsx(params: {
  category?: string; brand?: string; q?: string;
  active?: "all"|"true"|"false";
}) {
  const qs = qstr(params as any);
  const r = await fetch(`${API}/admin/devices/export/table${qs}`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.blob(); // caller downloads
}

export async function exportGroupedXlsx(params: {
  category?: string; brand?: string; q?: string;
  active?: "all"|"true"|"false";
}) {
  const qs = qstr(params as any);
  const r = await fetch(`${API}/admin/devices/export/grouped${qs}`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.blob();
}
