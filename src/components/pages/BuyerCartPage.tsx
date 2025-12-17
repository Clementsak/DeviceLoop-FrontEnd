import { useEffect, useState } from "react";
import {
  api_getPurchases,
  api_payForPurchase,
  type BuyerPurchase,
} from "../api/api";

function formatDateTime(iso?: string | null) {
  if (!iso) return "Not provided";
  const d = new Date(iso);
  return d.toLocaleString();
}

function maskUserId(pk?: string) {
  if (!pk) return "Unknown";
  if (pk.length <= 4) return pk;
  return pk.slice(0, 2) + "***" + pk.slice(-2);
}

export default function BuyerCartPage() {
  const [items, setItems] = useState<BuyerPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api_getPurchases();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function payNow(listingId: string) {
    try {
  setError(null);
  setPaying(true);
  await api_payForPurchase(listingId);
  await load();
} catch (e: any) {
  setError(e?.message ?? "Payment failed.");
} finally {
  setPaying(false);
}
  }

  async function payAll() {
    const pendingIds = items
      .filter((x) => x.paymentStatus === "pending")
      .map((x) => x.listingId)
      .filter(Boolean);

    if (pendingIds.length === 0) return;

    try {
      setPaying(true);
      for (const id of pendingIds) {
        await api_payForPurchase(id);
      }
      await load();
    } finally {
      setPaying(false);
    }
  }

if (loading)
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-slate-900">
      Loading cart…
    </div>
  );

  const pending = items.filter((x) => x.paymentStatus === "pending");
  const history = items.filter((x) => x.paymentStatus === "paid");

  return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-900">
    <h1 className="text-2xl font-bold">Your Cart</h1>
    {error && (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {error}
  </div>
)}


      {/* Pending purchases */}
      <section>
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-xl font-semibold">Pending Payment</h2>
          {pending.length > 0 && (
            <button
      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-forest-700 text-white hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paying}
              onClick={payAll}
            >
              {paying ? "Processing…" : `Pay all (${pending.length})`}
            </button>
          )}
        </div>

{pending.length === 0 && (
  <div className="text-slate-600">No pending payments.</div>
)}

        <div className="space-y-3">
          {pending.map((p) => (
            <div
              key={p.listingId}
className="border border-forest-200 rounded-2xl p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <div className="font-semibold">
                  {p.brand} {p.model} {p.variant ? `(${p.variant})` : ""}{" "}
                  {p.grade ? `(${p.grade})` : ""}
                </div>
                <div className="text-sm text-slate-700">
                  Matched at: {formatDateTime(p.matchedAt)}
                </div>
                <div className="text-sm text-slate-700">
                  Seller: {maskUserId(p.sellerPk)}
                </div>
                <div className="text-sm text-slate-700">
                  Auction mode: {p.auctionMode ?? "Not provided"}
                </div>
                <div className="text-xs text-slate-500">
                  Listing status: {p.status || "ended"}
                </div>
              </div>

              <div className="sm:text-right">
                <div className="font-semibold mb-1">
                  Price: RM {p.tradePrice ?? 0}
                </div>
                <button
                  className="px-4 py-1 rounded bg-blue-700 text-white disabled:opacity-50"
                  disabled={paying}
                  onClick={() => payNow(p.listingId)}
                >
                  {paying ? "Processing…" : "Pay Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment history */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Payment History</h2>
        {history.length === 0 && <div>No previous purchases.</div>}

        <div className="space-y-3">
          {history.map((p) => (
            <div
              key={p.listingId}
className="border border-slate-200 rounded-2xl p-4 bg-forest-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <div className="font-semibold">
                  {p.brand} {p.model} {p.variant ? `(${p.variant})` : ""}{" "}
                  {p.grade ? `(${p.grade})` : ""}
                </div>
                <div className="text-sm text-gray-700">
                  Matched at: {formatDateTime(p.matchedAt)}
                </div>
                <div className="text-sm text-gray-700">
                  Paid at: {formatDateTime(p.paidAt)}
                </div>
                <div className="text-sm text-gray-700">
                  Seller: {maskUserId(p.sellerPk)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-forest-800">
                  Paid: RM {p.tradePrice ?? 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
