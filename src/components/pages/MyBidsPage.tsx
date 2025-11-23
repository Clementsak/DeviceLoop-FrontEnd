import { useEffect, useState } from "react";
import {
  api_getMyBids,
  api_editBid,
  api_cancelBid,
  type MyBidSummary,
} from "../api/api";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

interface EditBidModalProps {
  bid: MyBidSummary | null;
  onClose: () => void;
  onSaved: (updated: MyBidSummary) => void;
}

function EditBidModal({ bid, onClose, onSaved }: EditBidModalProps) {
  const [buyerMin, setBuyerMin] = useState<string>("");
  const [buyerMax, setBuyerMax] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    e.preventDefault();
    setError(null);

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit bid</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="text-sm text-white/70 space-y-1">
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
                className="w-full rounded-xl bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-forest-500"
                value={buyerMin}
                onChange={e => setBuyerMin(e.target.value)}
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="block">Buyer maximum (RM)</span>
              <input
                type="number"
                className="w-full rounded-xl bg:white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-forest-500"
                value={buyerMax}
                onChange={e => setBuyerMax(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm space-y-1 block">
            <span className="block">Final bid price (RM)</span>
            <input
              type="number"
              className="w-full rounded-xl bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-forest-500"
              value={finalPrice}
              onChange={e => setFinalPrice(e.target.value)}
              required
            />
          </label>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/20 text-sm hover:bg-white/5"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || remainingEdits <= 0}
              className="px-4 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 disabled:bg-forest-900 text-sm font-semibold"
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
    <div className="max-w-6xl mx-auto p-6 text-white space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My bids</h1>
          <p className="text-white/60 text-sm">
            View and manage all device bids you have placed.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="overflow-x-auto rounded-2xl bg-slate-900/80">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
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
                <tr key={bid.bidSk} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{bid.deviceLabel}</div>
                    <div className="text-xs text-white/60">
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
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-white/10">
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
                      disabled={!isOpen || remainingEdits <= 0}
                      onClick={() => setSelectedBid(bid)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs disabled:opacity-40"
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
          onClose={() => setSelectedBid(null)}
          onSaved={handleUpdatedBid}
        />
      )}
    </div>
  );
}
