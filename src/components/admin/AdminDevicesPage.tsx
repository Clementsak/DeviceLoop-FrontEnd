import { useEffect, useState } from "react";
import {
  adminListDevices,
  adminListBrands,
  adminExportDevicesGrouped,
  adminExportDevicesTable,
  adminImportDevices,
  type DeviceRow,
  createDevice,
  updateDevice,
  deleteDevice,
  setDeviceActive,
} from "../api/devices";

type Cat = "All" | "Laptop" | "Smartphone" | "Tablet";

export default function AdminDevicesPage() {
  const [category, setCategory] = useState<Cat>("All");
  const [brand, setBrand] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchPage(cur: string | null = null) {
    setLoading(true);
    try {
      const res = await listDevices({ category, brand, q, active, limit, cursor: cur ?? undefined });
      setRows(res.items);
      setNextCursor(res.cursor ?? null);
      setCursor(cur ?? null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void fetchPage(null); }, [category, brand, q, active, limit]);

  return (
    <div className="max-w-7xl mx-auto p-6 text-black">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Devices</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={() => exportDevicesZip(category)}
            title="Download CSV zip by category"
          >
            Export CSV
          </button>
          <NewDeviceButton onCreated={() => fetchPage(cursor)} />
        </div>
      </header>

      {/* Filters */}
      <div className="grid md:grid-cols-6 gap-3 mb-4">
        <select className="rounded border px-3 py-2"
          value={category} onChange={e => setCategory(e.target.value as Cat)}>
          <option>All</option>
          <option>Laptop</option>
          <option>Smartphone</option>
          <option>Tablet</option>
        </select>
        <input className="rounded border px-3 py-2" placeholder="Brand"
          value={brand} onChange={e => setBrand(e.target.value)} />
        <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Search model or variant"
          value={q} onChange={e => setQ(e.target.value)} />
        <select className="rounded border px-3 py-2"
          value={active} onChange={e => setActive(e.target.value as any)}>
          <option value="all">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select className="rounded border px-3 py-2"
          value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
          {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="p-3 w-[140px]">PK</th>
              <th className="p-3 w-[120px]">Category</th>
              <th className="p-3 w-[160px]">Brand</th>
              <th className="p-3">Model / Variant</th>
              <th className="p-3 w-[110px]">Active</th>
              <th className="p-3 w-[130px]">isModified</th>
              <th className="p-3 w-[180px]">Updated</th>
              <th className="p-3 w-[220px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.pk} className="border-t">
                <td className="p-3 font-mono">{d.pk}</td>
                <td className="p-3">{d.category}</td>
                <td className="p-3">{d.brand}</td>
                <td className="p-3">{d.model}{d.variant ? ` — ${d.variant}` : ""}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${d.active ? "bg-green-200" : "bg-red-200"}`}>
                    {d.active ? "TRUE" : "FALSE"}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${d.isModified ? "bg-yellow-200" : "bg-gray-200"}`}>
                    {d.isModified ? "TRUE" : "FALSE"}
                  </span>
                </td>
                <td className="p-3">{d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "-"}</td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    <EditDeviceButton row={d} onSaved={() => fetchPage(cursor)} />
                    <button
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                      onClick={() => setDeviceActive(d.pk, !d.active).then(() => fetchPage(cursor))}
                      title={d.active ? "Disable" : "Enable"}
                    >
                      {d.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500"
                      onClick={() => {
                        if (confirm(`Delete ${d.pk}?`)) deleteDevice(d.pk).then(() => fetchPage(cursor));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-gray-500">No devices.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-gray-600 text-sm">{cursor ? "Page (cursor set)" : "First page"}</div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            disabled={!cursor}
            onClick={() => fetchPage(null)}
            title="Back to first page">Reset</button>
          <button className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            disabled={!nextCursor}
            onClick={() => fetchPage(nextCursor!)}>Next</button>
        </div>
      </div>
    </div>
  );
}

/* --- Small inline components --- */

function NewDeviceButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"Laptop"|"Smartphone"|"Tablet">("Laptop");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");

  async function save() {
    if (!brand.trim() || !model.trim()) return alert("Brand and model are required");
    await createDevice({ category, brand, model, variant: variant || undefined });
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500"
        onClick={() => setOpen(true)}>
        + New Device
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <select className="rounded border px-2 py-1" value={category} onChange={e=>setCategory(e.target.value as any)}>
        <option>Laptop</option><option>Smartphone</option><option>Tablet</option>
      </select>
      <input className="rounded border px-2 py-1" placeholder="Brand" value={brand} onChange={e=>setBrand(e.target.value)} />
      <input className="rounded border px-2 py-1" placeholder="Model" value={model} onChange={e=>setModel(e.target.value)} />
      <input className="rounded border px-2 py-1" placeholder="Variant (optional)" value={variant} onChange={e=>setVariant(e.target.value)} />
      <button className="px-3 py-1 rounded bg-gray-200" onClick={()=>setOpen(false)}>Cancel</button>
      <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={save}>Save</button>
    </div>
  );
}

function EditDeviceButton({ row, onSaved }: { row: DeviceRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState(row.brand);
  const [model, setModel] = useState(row.model);
  const [variant, setVariant] = useState(row.variant ?? "");
  const [category, setCategory] = useState(row.category);
  const [isModified, setIsModified] = useState(row.isModified);

  async function save() {
    await updateDevice(row.pk, {
      brand, model, variant: variant || null, category, isModified
    } as any);
    setOpen(false);
    onSaved();
  }

  if (!open) return (
    <button className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
      onClick={() => setOpen(true)}>Edit</button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      <select className="rounded border px-2 py-1" value={category} onChange={e=>setCategory(e.target.value as any)}>
        <option>Laptop</option><option>Smartphone</option><option>Tablet</option>
      </select>
      <input className="rounded border px-2 py-1" value={brand} onChange={e=>setBrand(e.target.value)} />
      <input className="rounded border px-2 py-1" value={model} onChange={e=>setModel(e.target.value)} />
      <input className="rounded border px-2 py-1" placeholder="Variant" value={variant} onChange={e=>setVariant(e.target.value)} />
      <label className="inline-flex items-center gap-2 px-2">
        <input type="checkbox" checked={isModified} onChange={e=>setIsModified(e.target.checked)} />
        <span>isModified</span>
      </label>
      <button className="px-3 py-1 rounded bg-gray-200" onClick={()=>setOpen(false)}>Cancel</button>
      <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={save}>Save</button>
    </div>
  );
}
