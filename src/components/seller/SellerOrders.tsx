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
    const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);

        try {
            const data = await SellerAPI.getOrders({ paymentStatus: filter, limit: 100 });

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
    const unpaidCount = useMemo(() => rows.filter(r => r.paymentStatus === "unpaid").length, [rows]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Orders</h1>
                    <p className="text-sm text-gray-400">
                        Paid: {paidCount} · Unpaid: {unpaidCount}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                    >
                        <option value="all">All</option>
                        <option value="paid">Paid only</option>
                        <option value="unpaid">Unpaid only</option>
                    </select>

                    <button
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-2 text-sm"
                        onClick={load}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-950 border border-red-800 text-red-200 rounded p-3 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-3 text-xs text-gray-400 border-b border-gray-800">
                    <div className="col-span-3">Listing</div>
                    <div className="col-span-2">Market</div>
                    <div className="col-span-2">Trade price</div>
                    <div className="col-span-2">Payment</div>
                    <div className="col-span-3">Paid at</div>
                </div>

                {loading ? (
                    <div className="p-4 text-sm text-gray-300">Loading…</div>
                ) : rows.length === 0 ? (
                    <div className="p-4 text-sm text-gray-300">No orders found.</div>
                ) : (
                    rows.map((r) => (
                        <div key={r.listingId} className="grid grid-cols-12 px-4 py-3 text-sm border-b border-gray-800">
                            <div className="col-span-3">
                                <div className="font-medium">{r.brand || "-"} {r.model || ""}</div>
                                <div className="text-xs text-gray-400">{r.listingId}</div>
                            </div>
                            <div className="col-span-2 text-gray-200">{r.marketKey || "-"}</div>
                            <div className="col-span-2 text-gray-200">{formatMoney(r.tradePrice || 0)}</div>
                            <div className="col-span-2">
                                {r.paymentStatus === "paid" ? (
                                    <span className="px-2 py-1 rounded bg-green-900 text-green-200 text-xs">paid</span>
                                ) : (
                                    <span className="px-2 py-1 rounded bg-yellow-900 text-yellow-200 text-xs">unpaid</span>
                                )}
                            </div>
                            <div className="col-span-3 text-gray-200">{formatDate(r.paidAt)}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
