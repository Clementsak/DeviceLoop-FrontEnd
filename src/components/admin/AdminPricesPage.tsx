// src/components/admin/AdminPricesPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
    adminListPrices,
    exportPricesTable,
    adminImportPrices,
    updatePrices,
    type PriceRow,
} from "../api/admin/prices";
import { adminListBrands } from "../api/admin/devices";

type Cat = "All" | "Laptop" | "Smartphone" | "Tablet";

function deviceLabel(r: PriceRow) {
    if (r.device && r.device.trim()) return r.device;
    const parts = [
        r.brand,
        r.model,
        r.variant ?? "",
        r.storage ?? "",
        r.ram ?? "",
    ]
        .map((s) => (s || "").trim())
        .filter(Boolean);
    return parts.join(" ");
}

export default function AdminPricesPage() {
    const [category, setCategory] = useState<Cat>("All");
    const [brand, setBrand] = useState("");
    const [q, setQ] = useState("");
    const [active, setActive] = useState<"all" | "true" | "false">("all");
    const [limit, setLimit] = useState(25);
    const [cursor, setCursor] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [rows, setRows] = useState<PriceRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [brandOptions, setBrandOptions] = useState<string[]>([]);

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
                const items = await adminListBrands(category); // "Laptop" | "Smartphone" | "Tablet"
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
            const res = await adminListPrices({
                category,
                brand: brand || undefined,
                q: q || undefined,
                active,
                limit,
                cursor: cur ?? undefined,
            });
            setRows(res.items);
            setNextCursor(res.cursor ?? null);
            setCursor(cur ?? null);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void fetchPage(null);
    }, [category, brand, q, active, limit]);

    async function download(name: string, blob: Blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }

    const exportParams = useMemo(
        () => ({ category, brand: brand || undefined, q: q || undefined, active }),
        [category, brand, q, active]
    );

    return (
        <div className="max-w-none mx-auto p-6 text-black">
            <header className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">Prices</h1>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
                        onClick={async () =>
                            download("prices.xlsx", await exportPricesTable(exportParams))
                        }
                    >
                        Export: visible table
                    </button>

                    <label className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer">
                        Import (.csv/.xlsx)
                        <input
                            type="file"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                try {
                                    const res = await adminImportPrices(f);
                                    const head = `Import done: created=${res.created}, updated=${res.updated}, skipped=${res.skipped}, errors=${res.errors?.length ?? 0}`;
                                    if (!res.errors?.length) alert(head);
                                    else {
                                        const lines = res.errors
                                            .map((er: any) => `Row ${er.row}, ${er.reason}`)
                                            .join("\n");
                                        const csv =
                                            "row,reason\n" +
                                            res.errors
                                                .map(
                                                    (er: any) =>
                                                        `${er.row},"${(er.reason || "")
                                                            .replace(/"/g, '""')
                                                            .replace(/\n/g, " ")}"`
                                                )
                                                .join("\n");
                                        const url = URL.createObjectURL(
                                            new Blob([csv], { type: "text/csv" })
                                        );
                                        const w = window.open("", "_blank", "width=640,height=600");
                                        if (w) {
                                            w.document.write(
                                                `<pre>${head}\n\n${lines}</pre><p><a href="${url}" download="import_errors.csv">Download errors.csv</a></p>`
                                            );
                                        } else alert(head + "\n\n" + lines);
                                    }
                                } finally {
                                    e.currentTarget.value = "";
                                    void fetchPage(cursor);
                                }
                            }}
                        />
                    </label>
                </div>
            </header>

            {/* Filters */}
            <div className="grid md:grid-cols-6 gap-3 mb-4">
                <select
                    className="rounded border px-3 py-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Cat)}
                >
                    <option>All</option>
                    <option>Laptop</option>
                    <option>Smartphone</option>
                    <option>Tablet</option>
                </select>

                {category === "All" ? (
                    <input
                        className="rounded border px-3 py-2"
                        placeholder="Brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                    />
                ) : (
                    <select
                        className="rounded border px-3 py-2"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                    >
                        <option value="">All brands</option>
                        {brandOptions.map((b) => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                )}

                <input
                    className="rounded border px-3 py-2 md:col-span-2"
                    placeholder="Search model or variant"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />

                <select
                    className="rounded border px-3 py-2"
                    value={active}
                    onChange={(e) => setActive(e.target.value as any)}
                >
                    <option value="all">All status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <select
                    className="rounded border px-3 py-2"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                >
                    {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                            {n}/page
                        </option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-xl border">
                <table className="w-full text-sm min-w-[1400px] table-fixed">
                    <colgroup>
                        <col className="w-[140px]" /> {/* PK */}
                        <col className="w-[110px]" /> {/* Category */}
                        <col className="w-[420px]" /> {/* Device */}
                        <col className="w-[110px]" /> {/* Active */}
                        <col className="w-[170px]" /> {/* Updated */}
                        <col className="w-[110px]" /> {/* A_MAX */}
                        <col className="w-[110px]" /> {/* A_MIN */}
                        <col className="w-[110px]" /> {/* B_MAX */}
                        <col className="w-[110px]" /> {/* B_MIN */}
                        <col className="w-[110px]" /> {/* C_MAX */}
                        <col className="w-[110px]" /> {/* C_MIN */}
                        <col className="w-[120px]" /> {/* Actions */}
                    </colgroup>

                    <thead className="bg-gray-100 sticky top-0 z-10 text-xs">
                        <tr className="text-left">
                            <th className="p-2">PK</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Device</th>
                            <th className="p-2">Active</th>
                            <th className="p-2">Updated</th>
                            <th className="p-2">A_MAX</th>
                            <th className="p-2">A_MIN</th>
                            <th className="p-2">B_MAX</th>
                            <th className="p-2">B_MIN</th>
                            <th className="p-2">C_MAX</th>
                            <th className="p-2">C_MIN</th>
                            <th className="p-2 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="text-[13px]">
                        {rows.map((r) => (
                            <tr key={r.pk} className="border-t align-top odd:bg-gray-50">
                                <td className="p-2 font-mono truncate">{r.pk}</td>
                                <td className="p-2">{r.category}</td>
                                <td className="p-2">
                                    <div
                                        className="leading-tight line-clamp-2"
                                        title={deviceLabel(r)}
                                    >
                                        {deviceLabel(r)}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs ${r.active ? "bg-green-200" : "bg-red-200"
                                            }`}
                                    >
                                        {r.active ? "TRUE" : "FALSE"}
                                    </span>
                                </td>
                                <td className="p-2 whitespace-nowrap">
                                    {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "-"}
                                </td>

                                <td className="p-2">{r.Grade_A_MAX ?? ""}</td>
                                <td className="p-2">{r.Grade_A_MIN ?? ""}</td>
                                <td className="p-2">{r.Grade_B_MAX ?? ""}</td>
                                <td className="p-2">{r.Grade_B_MIN ?? ""}</td>
                                <td className="p-2">{r.Grade_C_MAX ?? ""}</td>
                                <td className="p-2">{r.Grade_C_MIN ?? ""}</td>

                                <td className="p-2">
                                    <div className="flex items-center justify-end">
                                        <EditPriceButton row={r} onSaved={() => fetchPage(cursor)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!rows.length && !loading && (
                            <tr>
                                <td colSpan={12} className="p-6 text-center text-gray-500">
                                    No rows.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3">
                <div className="text-gray-600 text-sm">
                    {cursor ? "Page (cursor set)" : "First page"}
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
                        disabled={!cursor}
                        onClick={() => fetchPage(null)}
                    >
                        Reset
                    </button>
                    <button
                        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
                        disabled={!nextCursor}
                        onClick={() => fetchPage(nextCursor!)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

/* --- modal editor (unchanged logic; six fields) --- */
function EditPriceButton({
    row,
    onSaved,
}: {
    row: PriceRow;
    onSaved: () => void;
}) {
    const [open, setOpen] = useState(false);

    const [aMax, setAMax] = useState(row.Grade_A_MAX != null ? String(row.Grade_A_MAX) : "");
    const [aMin, setAMin] = useState(row.Grade_A_MIN != null ? String(row.Grade_A_MIN) : "");
    const [bMax, setBMax] = useState(row.Grade_B_MAX != null ? String(row.Grade_B_MAX) : "");
    const [bMin, setBMin] = useState(row.Grade_B_MIN != null ? String(row.Grade_B_MIN) : "");
    const [cMax, setCMax] = useState(row.Grade_C_MAX != null ? String(row.Grade_C_MAX) : "");
    const [cMin, setCMin] = useState(row.Grade_C_MIN != null ? String(row.Grade_C_MIN) : "");

    function reset() {
        setAMax(row.Grade_A_MAX != null ? String(row.Grade_A_MAX) : "");
        setAMin(row.Grade_A_MIN != null ? String(row.Grade_A_MIN) : "");
        setBMax(row.Grade_B_MAX != null ? String(row.Grade_B_MAX) : "");
        setBMin(row.Grade_B_MIN != null ? String(row.Grade_B_MIN) : "");
        setCMax(row.Grade_C_MAX != null ? String(row.Grade_C_MAX) : "");
        setCMin(row.Grade_C_MIN != null ? String(row.Grade_C_MIN) : "");
    }

    async function save() {
        const patch = {
            Grade_A_MAX: aMax.trim() ? Number(aMax) : null,
            Grade_A_MIN: aMin.trim() ? Number(aMin) : null,
            Grade_B_MAX: bMax.trim() ? Number(bMax) : null,
            Grade_B_MIN: bMin.trim() ? Number(bMin) : null,
            Grade_C_MAX: cMax.trim() ? Number(cMax) : null,
            Grade_C_MIN: cMin.trim() ? Number(cMin) : null,
        };
        await updatePrices(row.pk, patch);
        setOpen(false);
        onSaved();
    }

    if (!open) {
        return (
            <button
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => {
                    reset();
                    setOpen(true);
                }}
            >
                Edit
            </button>
        );
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-[560px] max-w-[95vw] rounded-xl bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                        Edit grades — <span className="font-mono">{row.pk}</span>
                    </h3>
                    <button
                        className="text-gray-500 hover:text-black"
                        onClick={() => {
                            setOpen(false);
                            reset();
                        }}
                    >
                        ✕
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Grade_A_MAX" value={aMax} setValue={setAMax} />
                    <Field label="Grade_A_MIN" value={aMin} setValue={setAMin} />
                    <Field label="Grade_B_MAX" value={bMax} setValue={setBMax} />
                    <Field label="Grade_B_MIN" value={bMin} setValue={setBMin} />
                    <Field label="Grade_C_MAX" value={cMax} setValue={setCMax} />
                    <Field label="Grade_C_MIN" value={cMin} setValue={setCMin} />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
                        onClick={() => {
                            setOpen(false);
                            reset();
                        }}
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

function Field({
    label,
    value,
    setValue,
}: {
    label: string;
    value: string;
    setValue: (v: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">{label}</span>
            <input
                type="number"
                step="0.01"
                className="rounded border px-2 py-1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
        </label>
    );
}
