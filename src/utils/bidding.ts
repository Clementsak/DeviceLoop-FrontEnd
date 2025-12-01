// src/utils/bidding.ts

export type BidStateMode = "empty" | "invalid" | "below" | "normal" | "buyout";

export interface BidDerivedState {
  mode: BidStateMode;
  midpoint: number | null;
  bandMin: number | null;
  bandMax: number | null;
  message: string | null;
}

/**
 * Computes midpoint, flexible band and validation state for the buyer bid.
 */
export function computeBidState(
  buyerMin: number | null,
  buyerMax: number | null,
  platformMin: number,
  platformMax: number
): BidDerivedState {
  if (
    buyerMin == null ||
    buyerMax == null ||
    Number.isNaN(buyerMin) ||
    Number.isNaN(buyerMax)
  ) {
    return {
      mode: "empty",
      midpoint: null,
      bandMin: null,
      bandMax: null,
      message: null,
    };
  }

  if (buyerMin <= 0 || buyerMax <= 0 || buyerMin > buyerMax) {
    return {
      mode: "invalid",
      midpoint: null,
      bandMin: null,
      bandMax: null,
      message: "Please ensure minimum is less than or equal to maximum and both are positive.",
    };
  }

  const midpoint = (buyerMin + buyerMax) / 2;

  // Midpoint below platform minimum
  if (midpoint < platformMin) {
    return {
      mode: "below",
      midpoint,
      bandMin: null,
      bandMax: null,
      message: `Your average (RM ${midpoint.toFixed(
        2
      )}) is below the platform minimum of RM ${platformMin.toFixed(
        2
      )}. Please raise your minimum or maximum bid.`,
    };
  }

  // Midpoint above platform maximum -> buyout
  if (midpoint > platformMax) {
    return {
      mode: "buyout",
      midpoint,
      bandMin: platformMax,
      bandMax: platformMax,
      message: `Your average (RM ${midpoint.toFixed(
        2
      )}) is above the platform maximum. This will be treated as a buy-out at RM ${platformMax.toFixed(
        2
      )}.`,
    };
  }

  // Normal case: midpoint is inside the platform range
  const fullRange = buyerMax - buyerMin;
  const halfRange = fullRange / 2;
  const flexibility = halfRange * 0.2; // twenty per cent of half-range

  const rawBandMin = midpoint - flexibility;
  const rawBandMax = midpoint + flexibility;

  // Clamp flexible band into platform range
  const bandMin = Math.max(rawBandMin, platformMin);
  const bandMax = Math.min(rawBandMax, platformMax);

  if (bandMin > bandMax) {
    // Very extreme case where band sits fully outside platform range
    return {
      mode: "invalid",
      midpoint,
      bandMin: null,
      bandMax: null,
      message:
        "Your chosen range is too far from the platform price. Please move your minimum and maximum closer.",
    };
  }

  return {
    mode: "normal",
    midpoint,
    bandMin,
    bandMax,
    message: `Flexible band (±20% of your midpoint, clamped into platform range): RM ${bandMin.toFixed(
      2
    )} – RM ${bandMax.toFixed(2)}.`,
  };
}
