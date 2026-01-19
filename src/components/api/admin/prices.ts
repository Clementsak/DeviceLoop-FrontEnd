// src/components/api/prices.ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

export type PriceRow = {
  pk: string;
  category: "Laptop" | "Smartphone" | "Tablet";
  brand: string;
  model: string;
  variant?: string | null;
  storage?: string | null;
  ram?: string | null;

  // display-only (may come from server; if not, we’ll build it on the client)
  device?: string;

  active: boolean;
  updatedAt?: string | null;

  Grade_A_MAX?: number | null;
  Grade_A_MIN?: number | null;
  Grade_B_MAX?: number | null;
  Grade_B_MIN?: number | null;
  Grade_C_MAX?: number | null;
  Grade_C_MIN?: number | null;
};

export async function adminListPrices(params: {
  category: "All" | "Laptop" | "Smartphone" | "Tablet";
  brand?: string;
  q?: string;
  active: "all" | "true" | "false";
  limit?: number;
  cursor?: string | null;
}) {
  const sp = new URLSearchParams();
  sp.set("category", params.category);
  if (params.brand) sp.set("brand", params.brand);
  if (params.q) sp.set("q", params.q);
  sp.set("active", params.active);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", params.cursor);

  const res = await fetch(`${API_BASE}/admin/devices/prices?${sp.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load prices");
  return res.json() as Promise<{ items: PriceRow[]; cursor?: string | null }>;
}

export async function updatePrices(
  pk: string,
  patch: Partial<
    Pick<
      PriceRow,
      | "Grade_A_MAX"
      | "Grade_A_MIN"
      | "Grade_B_MAX"
      | "Grade_B_MIN"
      | "Grade_C_MAX"
      | "Grade_C_MIN"
    >
  >
) {
  const res = await fetch(`${API_BASE}/admin/devices/prices/${encodeURIComponent(pk)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

export async function exportPricesTable(params: {
  category: "All" | "Laptop" | "Smartphone" | "Tablet";
  brand?: string;
  q?: string;
  active: "all" | "true" | "false";
}) {
  const sp = new URLSearchParams();
  sp.set("category", params.category);
  if (params.brand) sp.set("brand", params.brand);
  if (params.q) sp.set("q", params.q);
  sp.set("active", params.active);

  const res = await fetch(`${API_BASE}/admin/devices/prices/export/table?${sp.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Export failed");
  return await res.blob();
}

export async function adminImportPrices(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/admin/devices/prices/import`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Import failed");
  return res.json() as Promise<{
    ok: boolean;
    created: number;
    updated: number;
    skipped: number;
    errors?: any[];
  }>;
}
