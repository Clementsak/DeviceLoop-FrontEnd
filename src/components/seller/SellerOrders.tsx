import { useEffect, useMemo, useState } from "react";
import { SellerAPI, type SellerOrderRow } from "../api/seller";

function formatDate(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function formatMoney(value: number) {
    return `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function SellerOrders() {
    const [rows, setRows] = useState<SellerOrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);

        try {
            const data = await SellerAPI.getOrders({ paymentStatus: filter });

            // ✅ THIS is why your UI was empty even though Network shows items
            setRows(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setRows([]); // keep UI consistent on errors
            setError(e?.message || "Failed to load orders");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const paidCount = useMemo(() => rows.filter(r => r.paymentStatus === "paid").length, [rows]);
    const pendingCount = useMemo(() => rows.filter(r => r.paymentStatus === "pending").length, [rows]);

    return (
  <div className="p-4 sm:p-6 space-y-4 bg-emerald-50/40 min-h-[calc(100vh-64px)]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-600">
          Paid: {paidCount} · Pending: {pendingCount}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <select
          className="w-full sm:w-auto bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="paid">Paid only</option>
          <option value="pending">Pending only</option>
        </select>

        <button
          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-60"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
    </div>

    {error && (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
        {error}
      </div>
    )}

    {/* Mobile: cards */}
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 text-sm text-slate-700">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 text-sm text-slate-700">
          No orders found.
        </div>
      ) : (
        rows.map((r, idx) => (
          <div
            key={`${r.listingId}-${r.paidAt ?? "nopaidat"}-${idx}`}
            className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  {r.brand || "-"} {r.model || ""}
                </div>
                <div className="text-xs text-slate-500 break-all">{r.listingId}</div>
                <div className="text-sm text-slate-700 mt-2">
                  <span className="text-slate-500">Market:</span> {r.marketKey || "-"}
                </div>
              </div>

              <div>
                {r.paymentStatus === "paid" ? (
                  <span className="inline-flex px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                    Pending
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Trade price</div>
                <div className="font-medium text-slate-900">{formatMoney(r.tradePrice || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Paid at</div>
                <div className="font-medium text-slate-900">{formatDate(r.paidAt)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>

    {/* Desktop: table */}
    <div className="hidden md:block bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-emerald-900 bg-emerald-50 border-b border-emerald-200">
        <div className="col-span-3">Listing</div>
        <div className="col-span-2">Market</div>
        <div className="col-span-2">Trade price</div>
        <div className="col-span-2">Payment</div>
        <div className="col-span-3">Paid at</div>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-slate-700">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-slate-700">No orders found.</div>
      ) : (
        rows.map((r, idx) => (
          <div
            key={`${r.listingId}-${r.paidAt ?? "nopaidat"}-${idx}`}
            className="grid grid-cols-12 px-4 py-3 text-sm border-b border-emerald-100"
          >
            <div className="col-span-3">
              <div className="font-semibold text-slate-900">{r.brand || "-"} {r.model || ""}</div>
              <div className="text-xs text-slate-500 break-all">{r.listingId}</div>
            </div>

            <div className="col-span-2 text-slate-800">{r.marketKey || "-"}</div>

            <div className="col-span-2 text-slate-900 font-medium">
              {formatMoney(r.tradePrice || 0)}
            </div>

            <div className="col-span-2">
              {r.paymentStatus === "paid" ? (
                <span className="inline-flex px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                  Paid
                </span>
              ) : (
                <span className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                  Pending
                </span>
              )}
            </div>

            <div className="col-span-3 text-slate-800">{formatDate(r.paidAt)}</div>
          </div>
        ))
      )}
    </div>
  </div>
);

}
