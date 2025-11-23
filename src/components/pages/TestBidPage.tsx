// src/components/pages/TestBidPage.tsx
import React, { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function TestBidPage() {
  const [isOpen, setIsOpen] = useState(false);

  const [listingId, setListingId] = useState("");
  const [buyerMin, setBuyerMin] = useState("");
  const [buyerMax, setBuyerMax] = useState("");
  const [bidPrice, setBidPrice] = useState(""); // final chosen bid inside band

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Derived midpoint + ±10% band based on buyerMin / buyerMax
  const pricingHints = useMemo(() => {
    const min = Number(buyerMin);
    const max = Number(buyerMax);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min >= max) {
      return null;
    }

    const midpoint = (min + max) / 2;
    const bandWidth = (max - min) * 0.1; // 10%
    let lower = clamp(midpoint - bandWidth, min, max);
    let upper = clamp(midpoint + bandWidth, min, max);

    // If band collapses (very narrow range), just use midpoint
    if (upper - lower < 1) {
      lower = upper = midpoint;
    }

    return { min, max, midpoint, lower, upper };
  }, [buyerMin, buyerMax]);

  // Whenever buyerMin / buyerMax change and we have a valid band,
  // initialise bidPrice to the midpoint (or keep it clamped in the band).
  React.useEffect(() => {
    if (!pricingHints) return;

    const { midpoint, lower, upper } = pricingHints;
    const current = Number(bidPrice);

    if (!Number.isFinite(current) || current < lower || current > upper) {
      setBidPrice(midpoint.toFixed(2));
    }
  }, [pricingHints]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!listingId.trim()) {
      setError("Please enter a valid listing ID.");
      return;
    }

    const bid = Number(bidPrice);
    const min = buyerMin ? Number(buyerMin) : NaN;
    const max = buyerMax ? Number(buyerMax) : NaN;

    if (!Number.isFinite(bid) || bid <= 0) {
      setError("Please enter a valid bid price (via min / max).");
      return;
    }

    const payload: any = {
      listingId: listingId.trim(),
      bidPrice: bid,
    };

    if (Number.isFinite(min)) payload.buyerMin = min;
    if (Number.isFinite(max)) payload.buyerMax = max;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/buyer/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // send session cookie
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setResult(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-semibold mb-4">Test Bid Modal</h1>
      <p className="mb-4 text-sm text-white/70">
        Make sure you are logged in as a <strong>buyer</strong> and that you
        already have at least one <strong>active continuous listing</strong>.
      </p>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-forest-600 px-4 py-2 font-medium hover:bg-forest-500 transition-colors"
      >
        Open Bid Modal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Place Test Bid</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm space-y-1">
                <span>Listing ID</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  placeholder="LISTREQ#USER#002#..."
                  value={listingId}
                  onChange={e => setListingId(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm space-y-1">
                  <span>Buyer minimum (RM)</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={buyerMin}
                    onChange={e => setBuyerMin(e.target.value)}
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span>Buyer maximum (RM)</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={buyerMax}
                    onChange={e => setBuyerMax(e.target.value)}
                  />
                </label>
              </div>

              {pricingHints && (
                <div className="rounded-xl bg-black/30 px-3 py-2 text-xs text-white/80 space-y-1">
                  <p>
                    Midpoint suggestion:{" "}
                    <span className="font-semibold">
                      RM {pricingHints.midpoint.toFixed(2)}
                    </span>
                  </p>
                  <p>
                    Flexible band (±10% within your range):{" "}
                    <span className="font-semibold">
                      RM {pricingHints.lower.toFixed(2)} – RM{" "}
                      {pricingHints.upper.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              <label className="block text-sm space-y-1">
                <span>Final bid price (RM)</span>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={bidPrice}
                  onChange={e => setBidPrice(e.target.value)}
                  disabled={!pricingHints}
                />
                {!pricingHints && (
                  <p className="text-xs text-amber-400 mt-1">
                    Enter a valid buyer minimum and maximum first.
                  </p>
                )}
              </label>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-forest-600 px-4 py-2 text-sm font-medium hover:bg-forest-500 disabled:opacity-60"
                  disabled={loading || !pricingHints}
                >
                  {loading ? "Submitting..." : "Submit bid"}
                </button>
              </div>
            </form>

            {error && (
              <p className="mt-4 text-sm text-red-400">Error: {error}</p>
            )}

            {result && (
              <div className="mt-4 text-xs">
                <p className="font-semibold mb-1">Result:</p>
                <pre className="max-h-64 overflow-auto rounded-xl bg-black/40 p-3">
                  {result}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
