import { useEffect, useState } from "react";
import {
  api_getMyBids,
  api_editBid,
  api_cancelBid,
  type MyBidSummary,
  api_getMarkets
} from "../api/api";
import { useAuth } from "../../auth/AuthContext";


function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

interface EditBidModalProps {
  bid: MyBidSummary | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (updated: MyBidSummary) => void;
}

function EditBidModal({ bid, canEdit, onClose, onSaved }: EditBidModalProps) {
  const [buyerMin, setBuyerMin] = useState<string>("");
  const [buyerMax, setBuyerMax] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformMin, setPlatformMin] = useState<number | null>(null);
  const [platformMax, setPlatformMax] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlatformInfo() {
      if (!bid?.marketKey) return;

      try {
        const markets = await api_getMarkets(); // returns MarketSummary[]
        const match = markets.find((m) => m.marketKey === bid.marketKey);

        if (cancelled) return;

        if (match) {
          setPlatformMin(match.platformMin ?? null);
          setPlatformMax(match.platformMax ?? null);
        } else {
          setPlatformMin(null);
          setPlatformMax(null);
        }
      } catch (e) {
        if (cancelled) return;
        setPlatformMin(null);
        setPlatformMax(null);
      }
    }

    loadPlatformInfo();
    return () => {
      cancelled = true;
    };
  }, [bid?.marketKey]);

  function validatePrices(): string | null {
    if (platformMin == null || platformMax == null) return null; // can't validate yet

    const min = buyerMin === "" ? null : Number(buyerMin);
    const max = buyerMax === "" ? null : Number(buyerMax);
    const finalP = finalPrice === "" ? null : Number(finalPrice);

    // numeric checks
    const nums = [min, max, finalP].filter(v => v != null) as number[];
    if (nums.some(v => Number.isNaN(v))) return "Prices must be valid numbers.";

    // platform bounds
    if (min != null && (min < platformMin || min > platformMax)) {
      return `Buyer minimum must be within platform range (RM ${platformMin}–RM ${platformMax}).`;
    }
    if (max != null && (max < platformMin || max > platformMax)) {
      return `Buyer maximum must be within platform range (RM ${platformMin}–RM ${platformMax}).`;
    }
    if (finalP != null && (finalP < platformMin || finalP > platformMax)) {
      return `Final bid price must be within platform range (RM ${platformMin}–RM ${platformMax}).`;
    }

    // internal consistency
    if (min != null && max != null && min > max) return "Buyer minimum cannot exceed buyer maximum.";
    if (finalP != null && min != null && finalP < min) return "Final bid price cannot be below buyer minimum.";
    if (finalP != null && max != null && finalP > max) return "Final bid price cannot exceed buyer maximum.";

    return null;
  }
  const priceValidationError = validatePrices();

  useEffect(() => {
    if (!bid) return;
    setBuyerMin(bid.buyerMin != null ? String(bid.buyerMin) : "");
    setBuyerMax(bid.buyerMax != null ? String(bid.buyerMax) : "");
    setFinalPrice(String(bid.finalBidPrice));
    setError(null);
  }, [bid]);

  if (!bid) return null;

  const remainingEdits = bid.remainingEdits ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // ✅ must be first

    if (!canEdit) {
      setError("Your buyer account must be approved by an admin before you can edit bids.");
      return;
    }

    // ✅ do not allow edits until platform range is loaded (prevents bypassing limits)
    if (platformMin == null || platformMax == null) {
      setError("Platform range is still loading. Please wait a moment and try again.");
      return;
    }

    if (priceValidationError) {
      setError(priceValidationError);
      return;
    }

    if (!bid) {
      setError("Bid is not loaded yet.");
      return;
    }

    const parsedFinal = Number(finalPrice);
    const parsedMin = buyerMin ? Number(buyerMin) : null;
    const parsedMax = buyerMax ? Number(buyerMax) : null;

    if (!Number.isFinite(parsedFinal) || parsedFinal <= 0) {
      setError("Please enter a valid final bid price.");
      return;
    }

    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setError("Buyer minimum cannot be greater than buyer maximum.");
      return;
    }

    try {
      setSubmitting(true);
      const resp = await api_editBid({
        bidSk: bid.bidSk,
        marketKey: bid.marketKey,
        bidPrice: parsedFinal,
        buyerMin: parsedMin,
        buyerMax: parsedMax,
      });

      const updatedBid: MyBidSummary = {
        ...bid,
        finalBidPrice: resp.newBidPrice ?? parsedFinal,
        buyerMin: parsedMin,
        buyerMax: parsedMax,
        remainingEdits: Math.max(3 - resp.editCount, 0),
        updatedAt: new Date().toISOString(),
      };

      onSaved(updatedBid);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to edit bid.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-3">
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200">

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit bid</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
          >
            ×
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <div className="font-medium">{bid.deviceLabel}</div>
          <div>Market: {bid.marketKey}</div>
          <div>Status: {bid.status}</div>
          <div>Remaining edits: {remainingEdits}</div>
        </div>

        {remainingEdits <= 0 && (
          <div className="text-amber-400 text-sm">
            You have used all edits for this bid. You can still cancel it and
            place a new bid.
          </div>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="block">Buyer minimum (RM)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                value={buyerMin}
                onChange={e => setBuyerMin(e.target.value)}
                disabled={!canEdit || submitting}
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="block">Buyer maximum (RM)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                value={buyerMax}
                onChange={e => setBuyerMax(e.target.value)}
                disabled={!canEdit || submitting}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-slate-600">Platform range</div>
              <div className="font-semibold text-slate-900">
                {platformMin != null && platformMax != null
                  ? `RM ${platformMin.toFixed(2)} – RM ${platformMax.toFixed(2)}`
                  : "Loading..."}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-slate-600">Edits remaining</div>
              <div className="font-semibold text-slate-900">
                {remainingEdits}
              </div>
            </div>
          </div>

          {priceValidationError ? (
            <div className="text-sm text-red-700">{priceValidationError}</div>
          ) : null}


          <label className="text-sm space-y-1 block">
            <span className="block">Final bid price (RM)</span>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              value={finalPrice}
              onChange={e => setFinalPrice(e.target.value)}
              required
              disabled={!canEdit || submitting}
            />
          </label>

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {priceValidationError && (
            <div className="text-red-400 text-sm">{priceValidationError}</div>
          )}


          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                remainingEdits <= 0 ||
                !!priceValidationError ||
                !canEdit ||
                platformMin == null ||
                platformMax == null
              }
              className="px-4 py-2 rounded-xl bg-forest-600 text-white hover:bg-forest-500 disabled:opacity-50 text-sm font-semibold"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyBidsPage() {
  const [bids, setBids] = useState<MyBidSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBid, setSelectedBid] = useState<MyBidSummary | null>(null);
  const { me, login } = useAuth();

  // same rule as bid creation: must be admin-approved verified buyer
  const canEditBids = !!me && me.role === "buyers" && me.verified === true;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const items = await api_getMyBids();
      setBids(items);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to fetch bids.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleUpdatedBid(updated: MyBidSummary) {
    setBids(prev =>
      prev.map(b => (b.bidSk === updated.bidSk ? updated : b))
    );
  }

  async function handleCancelBid(bid: MyBidSummary) {
    if (!window.confirm("Cancel this bid? You cannot undo this.")) return;
    try {
      await api_cancelBid({ bidSk: bid.bidSk, marketKey: bid.marketKey });
      setBids(prev =>
        prev.map(b =>
          b.bidSk === bid.bidSk ? { ...b, status: "cancelled" } : b
        )
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to cancel bid.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-forest-900 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My bids</h1>
          <p className="text-forest-700 text-sm">
            View and manage all device bids you have placed.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-forest-700 text-white hover:bg-forest-600 text-sm transition"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="text-red-700 text-sm">{error}</div>}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {bids.length === 0 && !loading ? (
          <div className="rounded-2xl border border-forest-200 bg-white p-4 text-sm text-forest-700">
            You have not placed any bids yet.
          </div>
        ) : (
          bids.map(bid => {
            const isOpen = bid.status === "open";
            const rangeText =
              bid.buyerMin != null || bid.buyerMax != null
                ? `RM ${bid.buyerMin ?? "-"} – RM ${bid.buyerMax ?? "-"}`
                : "-";
            const remainingEdits = bid.remainingEdits ?? 0;

            return (
              <div key={bid.bidSk} className="rounded-2xl border border-forest-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-forest-900">{bid.deviceLabel}</div>
                    <div className="text-xs text-forest-700">Grade {bid.grade ?? "-"}</div>
                    <div className="mt-1 text-xs text-forest-700 break-all">Market: {bid.marketKey}</div>
                  </div>

                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-forest-100 text-forest-800">
                    {bid.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-forest-700">Final bid</div>
                    <div className="text-forest-900">RM {bid.finalBidPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-forest-700">Buyer range</div>
                    <div className="text-forest-900">{rangeText}</div>
                  </div>
                  <div className="col-span-2 text-xs text-forest-700">
                    Created: {formatDateTime(bid.createdAt)}
                  </div>
                  <div className="col-span-2 text-xs text-forest-700">
                    Updated: {formatDateTime(bid.updatedAt)}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    disabled={!isOpen || remainingEdits <= 0 || !canEditBids}
                    onClick={() => {
                      setError(null);

                      if (!me) {
                        login();
                        return;
                      }
                      if (!canEditBids) {
                        setError("Your buyer account must be approved by an admin before you can edit bids.");
                        return;
                      }
                      setSelectedBid(bid);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-forest-700 text-white hover:bg-forest-600 text-xs disabled:opacity-40 transition"
                  >
                    Edit
                  </button>

                  <button
                    disabled={!isOpen}
                    onClick={() => handleCancelBid(bid)}
                    className="flex-1 px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-40 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Desktop table */}

      <div className="hidden md:block overflow-x-auto rounded-2xl border border-forest-200 bg-forest-50">
        <table className="min-w-full text-sm">
          <thead className="bg-forest-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Device</th>
              <th className="px-4 py-3 text-left font-medium">Market</th>
              <th className="px-4 py-3 text-right font-medium">
                Final bid (RM)
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Buyer range (RM)
              </th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Updated</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bids.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-white/50"
                >
                  You have not placed any bids yet.
                </td>
              </tr>
            )}

            {bids.map(bid => {
              const isOpen = bid.status === "open";
              const rangeText =
                bid.buyerMin != null || bid.buyerMax != null
                  ? `RM ${bid.buyerMin ?? "-"} – RM ${bid.buyerMax ?? "-"}`
                  : "-";

              const remainingEdits = bid.remainingEdits ?? 0;

              return (
                <tr key={bid.bidSk} className="border-t border-forest-200">
                  <td className="px-4 py-3">
                    <div className="font-medium">{bid.deviceLabel}</div>
                    <div className="text-xs text-forest-700">
                      Grade {bid.grade ?? "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{bid.marketKey}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    RM {bid.finalBidPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">{rangeText}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-forest-100 text-forest-800">
                      {bid.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatDateTime(bid.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatDateTime(bid.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      disabled={!isOpen || remainingEdits <= 0 || !canEditBids}
                      onClick={() => {
                        setError(null);

                        if (!me) {
                          login();
                          return;
                        }
                        if (!canEditBids) {
                          setError("Your buyer account must be approved by an admin before you can edit bids.");
                          return;
                        }
                        setSelectedBid(bid);
                      }}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-forest-700 text-white hover:bg-forest-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>

                    <button
                      disabled={!isOpen}
                      onClick={() => handleCancelBid(bid)}
                      className="px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedBid && (
        <EditBidModal
          bid={selectedBid}
          canEdit={canEditBids}
          onClose={() => setSelectedBid(null)}
          onSaved={handleUpdatedBid}
        />
      )}
    </div>
  );
}
