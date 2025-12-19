import { useEffect, useState } from "react";
import { adminGetOrders, type AdminOrderRow } from "../api/admin/admin";

export default function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"all" | "pending" | "paid">("all");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetOrders(paymentStatus);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-emerald-950">Orders</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-emerald-800/80">Payment</label>
          <select
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-emerald-50">
              <tr className="text-left">
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Listing</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Seller</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Buyer</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Trade price</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Payment</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Paid at</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.listingId} className="border-t border-slate-100">
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.listingId}</td>
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.sellerPk || "-"}</td>
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.buyerPk || "-"}</td>
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.tradePrice ?? "-"}</td>
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.paymentStatus}</td>
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.paidAt || "-"}</td>
                  <td className="p-6 text-center text-sm text-emerald-800/70">{o.listingStatus || "-"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={7}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
