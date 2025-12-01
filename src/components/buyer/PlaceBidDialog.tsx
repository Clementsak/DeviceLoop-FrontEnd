// src/components/buyer/PlaceBidDialog.tsx
import { useMemo, useState } from "react";
import { computeBidState, type BidStateMode } from "../../utils/bidding";

type PlaceBidDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    buyerMin: number;
    buyerMax: number;
    finalBid: number;
  }) => Promise<void> | void;

  deviceLabel: string;
  gradeLabel: string;
  platformMin: number;
  platformMax: number;
};

export function PlaceBidDialog({
  isOpen,
  onClose,
  onSubmit,
  deviceLabel,
  gradeLabel,
  platformMin,
  platformMax,
}: PlaceBidDialogProps) {
  const [buyerMinText, setBuyerMinText] = useState("");
  const [buyerMaxText, setBuyerMaxText] = useState("");
  const [finalBidText, setFinalBidText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const buyerMin = buyerMinText === "" ? null : Number(buyerMinText);
  const buyerMax = buyerMaxText === "" ? null : Number(buyerMaxText);
  const finalBid = finalBidText === "" ? null : Number(finalBidText);

  const derived = useMemo(
    () => computeBidState(buyerMin, buyerMax, platformMin, platformMax),
    [buyerMin, buyerMax, platformMin, platformMax]
  );

  // When state enters buyout, auto-fill final bid as platform max
  if (derived.mode === "buyout" && finalBidText !== platformMax.toString()) {
    // This will run on render; safe but we guard to prevent infinite loop
    setTimeout(() => setFinalBidText(platformMax.toString()), 0);
  }

  const isFinalBidValid = (() => {
    if (finalBid == null || Number.isNaN(finalBid)) return false;
    if (derived.mode === "buyout") {
      return finalBid === platformMax;
    }
    if (derived.mode !== "normal") return false;
    if (derived.bandMin == null || derived.bandMax == null) return false;

    return (
      finalBid >= derived.bandMin &&
      finalBid <= derived.bandMax &&
      finalBid >= platformMin &&
      finalBid <= platformMax
    );
  })();

  const canSubmit =
    isOpen &&
    derived.mode !== "empty" &&
    derived.mode !== "invalid" &&
    derived.mode !== "below" &&
    finalBid != null &&
    isFinalBidValid &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!canSubmit || finalBid == null || buyerMin == null || buyerMax == null) {
      setSubmitError("Please complete all fields with valid values.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        buyerMin,
        buyerMax,
        finalBid,
      });
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitting(false);
      setSubmitError(
        err?.message ?? "There was a problem submitting your bid. Please try again."
      );
    }
  }

  if (!isOpen) return null;

  const showFinalBidInput = derived.mode === "normal" || derived.mode === "buyout";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-slate-950 p-6 text-white shadow-xl"
      >
        <div className="mb-4">
          <div className="text-sm font-semibold text-slate-400">
            {deviceLabel}
          </div>
          <div className="text-xs text-slate-500">
            {gradeLabel} • Platform range RM {platformMin.toFixed(2)} – RM{" "}
            {platformMax.toFixed(2)}
          </div>
        </div>

        {/* Buyer minimum / maximum */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Buyer minimum (RM)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={buyerMinText}
              onChange={e => setBuyerMinText(e.target.value)}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Buyer maximum (RM)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={buyerMaxText}
              onChange={e => setBuyerMaxText(e.target.value)}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Midpoint and band */}
        <div className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300">
          {derived.midpoint != null && (
            <div>Midpoint of your range: RM {derived.midpoint.toFixed(2)}</div>
          )}
          {derived.bandMin != null && derived.bandMax != null && (
            <div>
              Flexible band (±20% of your midpoint, clamped into platform range): RM{" "}
              {derived.bandMin.toFixed(2)} – RM {derived.bandMax.toFixed(2)}
            </div>
          )}
          {derived.message && (
            <div
              className={
                derived.mode === "below" || derived.mode === "invalid"
                  ? "mt-1 text-amber-400"
                  : derived.mode === "buyout"
                  ? "mt-1 text-emerald-400"
                  : "mt-1 text-slate-400"
              }
            >
              {derived.message}
            </div>
          )}
        </div>

        {/* Final bid price */}
        {showFinalBidInput && (
          <div className="mt-4">
            <label className="block text-sm mb-1">Final bid price (RM)</label>
            <input
              type="number"
              step="0.01"
              value={finalBidText}
              onChange={e => {
                if (derived.mode === "buyout") {
                  // lock to platform maximum for buyout case
                  setFinalBidText(platformMax.toString());
                } else {
                  setFinalBidText(e.target.value);
                }
              }}
              disabled={derived.mode === "buyout"}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
            {!isFinalBidValid && finalBidText !== "" && (
              <p className="mt-1 text-xs text-amber-400">
                Final bid must stay within the flexible band and platform range.
              </p>
            )}
          </div>
        )}

        {/* Footer buttons */}
        <div className="mt-6 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
          >
            Cancel
          </button>

          <div className="flex flex-col items-end gap-1">
            {submitError && (
              <div className="text-xs text-red-400 max-w-xs text-right">
                {submitError}
              </div>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-sm font-semibold"
            >
              {derived.mode === "buyout"
                ? `Submit buy-out (RM ${platformMax.toFixed(2)})`
                : "Submit bid"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
