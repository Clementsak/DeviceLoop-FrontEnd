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
      setPaying(true);
      await api_payForPurchase(listingId);
      await load();
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

  if (loading) return <div className="p-6">Loading cart…</div>;

  const pending = items.filter((x) => x.paymentStatus === "pending");
  const history = items.filter((x) => x.paymentStatus === "paid");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>

      {/* Pending purchases */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Pending Payment</h2>
          {pending.length > 0 && (
            <button
              className="px-4 py-1 rounded bg-green-700 text-white disabled:opacity-50"
              disabled={paying}
              onClick={payAll}
            >
              {paying ? "Processing…" : `Pay all (${pending.length})`}
            </button>
          )}
        </div>

        {pending.length === 0 && <div>No unpaid purchases.</div>}

        <div className="space-y-3">
          {pending.map((p) => (
            <div
              key={p.listingId}
              className="border rounded p-4 bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3"
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
                  Seller: {maskUserId(p.sellerPk)}
                </div>
                <div className="text-sm text-gray-700">
                  Auction mode: {p.auctionMode ?? "Not provided"}
                </div>
                <div className="text-xs text-gray-500">
                  Listing status: {p.status || "ended"}
                </div>
              </div>

              <div className="text-right">
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
              className="border rounded p-4 bg-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
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
                <div className="font-semibold text-green-700">
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
