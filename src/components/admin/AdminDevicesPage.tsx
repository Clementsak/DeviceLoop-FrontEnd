// src/components/admin/AdminDevicesPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  adminListDevices,
  adminListBrands,
  exportGroupedXlsx,
  exportTableXlsx,
  adminImportDevices,
  type DeviceRow,
  createDevice,
  updateDevice,
  deleteDevice,
  setDeviceActive,
} from "../api/admin/devices";

type Cat = "All" | "Laptop" | "Smartphone" | "Tablet";

export default function AdminDevicesPage() {
  const [category, setCategory] = useState<Cat>("All");
  const [brand, setBrand] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);

  // refresh brand dropdown when category changes
  useEffect(() => {
    let cancel = false;
    async function loadBrands() {
      if (category === "All") {
        setBrandOptions([]);
        setBrand("");
        return;
      }
      try {
        const items = await adminListBrands(category);
        if (!cancel) setBrandOptions(items);
      } catch {
        if (!cancel) setBrandOptions([]);
      }
    }
    void loadBrands();
    return () => { cancel = true; };
  }, [category]);

  async function fetchPage(cur: string | null = null) {
    setLoading(true);
    try {
      const res = await adminListDevices({
        category, brand: brand || undefined, q: q || undefined,
        active, limit, cursor: cur ?? undefined
      });
      setRows(res.items);
      setNextCursor(res.cursor ?? null);
      setCursor(cur ?? null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void fetchPage(null); }, [category, brand, q, active, limit]);

  async function download(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  const exportParams = useMemo(() => ({ category, brand: brand || undefined, q: q || undefined, active }), [category, brand, q, active]);

  // Show server-side row errors and refresh the table
  async function handleImport(file: File) {
    try {
      const res = await adminImportDevices(file);
      const { created = 0, updated = 0, skipped = 0, errors = [] } = res;
      const head = `Import done: created=${created}, updated=${updated}, skipped=${skipped}, errors=${errors.length}`;

      if (!errors.length) {
        alert(head);
      } else {
        const lines = errors.map((e: any) => `Row ${e.row}, ${e.reason}`).join("\n");
        const csvHeader = "row,reason\n";
        const csvBody = errors
          .map((e: any) => `${e.row},"${(e.reason || "").replace(/"/g, '""')}"`)
          .join("\n");
        const blob = new Blob([csvHeader + csvBody], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const w = window.open("", "_blank", "width=600,height=600");
        if (w) {
          w.document.write(
            `<pre style="white-space:pre-wrap;font:12px/1.4 system-ui,sans-serif">${head}\n\n${lines}</pre>`
          );
          w.document.write(`<p><a download="import_errors.csv" href="${url}">Download errors.csv</a></p>`);
        } else {
          alert(head + "\n\n" + lines);
        }
      }
    } finally {
      // refresh current page
      void fetchPage(cursor);
    }
  }


  return (
    <div className="w-full min-w-0 p-6 text-black">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Devices</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={async () => download("devices_grouped.xlsx", await exportGroupedXlsx(exportParams))}
            title="Download an XLSX with 3 sheets (Laptop/Smartphone/Tablet)"
          >
            Export: 3 sheets
          </button>
          <button
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={async () => download("devices_table.xlsx", await exportTableXlsx(exportParams))}
            title="Download an XLSX of exactly the visible table"
          >
            Export: visible table
          </button>
          <label className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer">
            Import (.csv/.xlsx)
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                await handleImport(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
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

        {/* Brand: text when All, dropdown when specific category */}
        {category === "All" ? (
          <input className="rounded border px-3 py-2" placeholder="Brand"
            value={brand} onChange={e => setBrand(e.target.value)} />
        ) : (
          <select className="rounded border px-3 py-2"
            value={brand}
            onChange={e => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}

        <input className="rounded border px-3 py-2 md:col-span-2"
          placeholder="Search model or variant"
          value={q} onChange={e => setQ(e.target.value)} />

        <select className="rounded border px-3 py-2"
          value={active} onChange={e => setActive(e.target.value as any)}>
          <option value="all">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <select className="rounded border px-3 py-2"
          value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm min-w-[1300px] 2xl:min-w-[1600px]">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="p-3 w-[140px] whitespace-nowrap">PK</th>
              <th className="p-3 w-[120px] whitespace-nowrap">Category</th>
              <th className="p-3 w-[160px] whitespace-nowrap">Brand</th>
              <th className="p-3 whitespace-nowrap" >Model / Variant</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Storage</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">RAM</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Release</th>
              <th className="p-3 w-[110px] whitespace-nowrap">Active</th>
              <th className="p-3 w-[130px] whitespace-nowrap">isModified</th>
              <th className="p-3 w-[180px] whitespace-nowrap">Updated</th>
              <th className="p-3 w-[220px] whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.pk} className="border-t">
                <td className="p-3 font-mono">{d.pk}</td>
                <td className="p-3">{d.category}</td>
                <td className="p-3">{d.brand}</td>
                <td className="p-3">{d.model}{d.variant ? ` — ${d.variant}` : ""}</td>
                <td className="px-3 py-2">{d.storage ?? ""}</td>
                <td className="px-3 py-2">{d.ram ?? ""}</td>
                <td className="px-3 py-2">
                  {d.releaseDate ? d.releaseDate : ""}{d.releasePrice != null ? ` / ${d.releasePrice}` : ""}
                </td>
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
                      onClick={() => { if (confirm(`Delete ${d.pk}?`)) deleteDevice(d.pk).then(() => fetchPage(cursor)); }}
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
            disabled={!cursor} onClick={() => fetchPage(null)} title="Back to first page">Reset</button>
          <button className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            disabled={!nextCursor} onClick={() => fetchPage(nextCursor!)}>Next</button>
        </div>
      </div>
    </div>
  );
}

/* --- inline components --- */
// --- replace NewDeviceButton with this ---
function NewDeviceButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);

  // form state
  const [category, setCategory] = useState<"Laptop" | "Smartphone" | "Tablet">("Laptop");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");

  // NEW fields
  const [storage, setStorage] = useState("");
  const [ram, setRam] = useState("");
  const [releaseDate, setReleaseDate] = useState(""); // yyyy-mm-dd
  const [releasePrice, setReleasePrice] = useState(""); // string, we’ll parseFloat
  const [active, setActive] = useState(true);

  function reset() {
    setCategory("Laptop");
    setBrand("");
    setModel("");
    setVariant("");
    setStorage("");
    setRam("");
    setReleaseDate("");
    setReleasePrice("");
    setActive(true);
  }

  async function save() {
    if (!brand.trim() || !model.trim()) {
      alert("Brand and model are required");
      return;
    }

    await createDevice({
      category,
      brand: brand.trim(),
      model: model.trim(),
      variant: variant.trim() || undefined,
      storage: storage.trim() || undefined,
      ram: ram.trim() || undefined,
      releaseDate: releaseDate.trim() || undefined,
      releasePrice: releasePrice.trim() ? Number(releasePrice) : undefined,
      active,
      isModified: false,
    });

    // close + clear
    setOpen(false);
    reset();
    onCreated();
  }

  return (
    <>
      <button
        className="px-3 py-2 rounded-xl bg-forest-700 text-white hover:bg-forest-600 transition"
        onClick={() => { reset(); setOpen(true); }}
      >
        + New Device
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[720px] max-w-[95vw] rounded-xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Create device</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Category</span>
                <select
                  className="rounded border px-2 py-1"
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                >
                  <option>Laptop</option>
                  <option>Smartphone</option>
                  <option>Tablet</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Active</span>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                  <span>{active ? "TRUE" : "FALSE"}</span>
                </label>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Brand</span>
                <input className="rounded border px-2 py-1" value={brand} onChange={e => setBrand(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Model</span>
                <input className="rounded border px-2 py-1" value={model} onChange={e => setModel(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-sm text-gray-600">Variant (optional)</span>
                <input className="rounded border px-2 py-1" value={variant} onChange={e => setVariant(e.target.value)} />
              </label>

              {/* NEW fields */}
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Storage</span>
                <input className="rounded border px-2 py-1" placeholder="128GB" value={storage} onChange={e => setStorage(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">RAM</span>
                <input className="rounded border px-2 py-1" placeholder="4GB" value={ram} onChange={e => setRam(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Release date</span>
                <input type="date" className="rounded border px-2 py-1" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Release price</span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded border px-2 py-1"
                  value={releasePrice}
                  onChange={e => setReleasePrice(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => { setOpen(false); reset(); }}>
                Cancel
              </button>
              <button className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function EditDeviceButton({ row, onSaved }: { row: DeviceRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);

  // form state (pre-filled from row)
  const [category, setCategory] = useState<"Laptop" | "Smartphone" | "Tablet">(row.category);
  const [brand, setBrand] = useState(row.brand);
  const [model, setModel] = useState(row.model);
  const [variant, setVariant] = useState(row.variant ?? "");
  const [storage, setStorage] = useState(row.storage ?? "");
  const [ram, setRam] = useState(row.ram ?? "");
  const [releaseDate, setReleaseDate] = useState(row.releaseDate ?? ""); // yyyy-mm-dd
  const [releasePrice, setReleasePrice] = useState(
    row.releasePrice != null ? String(row.releasePrice) : ""
  );

  function resetToRow() {
    setCategory(row.category);
    setBrand(row.brand);
    setModel(row.model);
    setVariant(row.variant ?? "");
    setStorage(row.storage ?? "");
    setRam(row.ram ?? "");
    setReleaseDate(row.releaseDate ?? "");
    setReleasePrice(row.releasePrice != null ? String(row.releasePrice) : "");
  }

  async function save() {
    if (!brand.trim() || !model.trim()) {
      alert("Brand and model are required");
      return;
    }
    await updateDevice(row.pk, {
      category,
      brand: brand.trim(),
      model: model.trim(),
      variant: variant.trim() || null,
      storage: storage.trim() || null,
      ram: ram.trim() || null,
      releaseDate: releaseDate.trim() || null,
      // send a number if present, else null (backend coerces to Decimal)
      releasePrice: releasePrice.trim() ? Number(releasePrice) : null,
    } as any);

    setOpen(false);
    onSaved();
  }

  // simple keyboard support
  function onBackdropKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      resetToRow();
    }
  }

  if (!open) {
    return (
      <button
        className="px-3 py-1 rounded-xl bg-forest-700 text-white hover:bg-forest-600 transition"
        onClick={() => { resetToRow(); setOpen(true); }}
      >
        Edit
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={onBackdropKey}
    >
      <div className="w-[760px] max-w-[95vw] rounded-xl bg-white p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Edit device — <span className="font-mono">{row.pk}</span></h2>
          <button className="text-gray-500 hover:text-black" onClick={() => { setOpen(false); resetToRow(); }}>
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Category</span>
            <select
              className="rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-200"
              value={category}
              onChange={e => setCategory(e.target.value as any)}
            >
              <option>Laptop</option>
              <option>Smartphone</option>
              <option>Tablet</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Brand</span>
            <input className="rounded border px-2 py-1" value={brand} onChange={e => setBrand(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Model</span>
            <input className="rounded border px-2 py-1" value={model} onChange={e => setModel(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Variant (optional)</span>
            <input className="rounded border px-2 py-1" value={variant} onChange={e => setVariant(e.target.value)} />
          </label>

          {/* Extra details */}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Storage</span>
            <input className="rounded border px-2 py-1" placeholder="256GB" value={storage} onChange={e => setStorage(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">RAM</span>
            <input className="rounded border px-2 py-1" placeholder="16GB" value={ram} onChange={e => setRam(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Release date</span>
            <input type="date" className="rounded border px-2 py-1" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Release price</span>
            <input
              type="number"
              step="0.01"
              className="rounded border px-2 py-1"
              value={releasePrice}
              onChange={e => setReleasePrice(e.target.value)}
              placeholder="e.g. 5999"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded-xl border border-forest-300 text-forest-900 hover:bg-forest-100 transition"
            onClick={() => { setOpen(false); resetToRow(); }}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

