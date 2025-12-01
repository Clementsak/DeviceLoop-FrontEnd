// src/components/bids/BidWizardModal.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  type DeviceOption,
  fetchDeviceOptions,
} from "../../components/api/seller"; // adjust path if needed:contentReference[oaicite:1]{index=1}

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

export type AuctionMode = "continuous" | "interval" | "end_of_window";

export interface ListingForBid {
  listingId: string;
  devicePk: string;
  category: string;
  brand: string;
  model: string;
  variant: string | null;
  storage: string;
  ram: string;
  grade: "A" | "B" | "C";
  sellerMin: number;
  sellerMax: number;
  currentHighestBid?: number | null;
}

export interface PlatformRangeInfo {
  platformMin: number;
  platformMax: number;
  releasePrice?: number | null;
  releaseDateIso?: string | null;
  activeListings?: number | null;
}

export interface BidWizardSubmitPayload {
  mode: AuctionMode;
  listingId?: string; // present for continuous
  devicePk: string;
  grade: "A" | "B" | "C";
  buyerMin: number;
  buyerMax: number;
  finalBid: number;
  bandLow: number;
  bandHigh: number;
  isBuyout: boolean;
}

interface BidWizardModalProps {
  open: boolean;
  onClose: () => void;

  /** If provided, we treat this as a continuous listing bid flow. */
  listing?: ListingForBid | null;

  /** Mode used when sending payload. */
  mode: AuctionMode;

  /** Optional callback so parent can post to backend. */
  onSubmit?: (payload: BidWizardSubmitPayload) => Promise<void> | void;
}

/* ===========================================================
   Helper: fetch platform range + meta for a device + grade
   You can point this at any backend endpoint you like.
   Example backend route idea:
   GET /buyer/device-market?devicePk=...&grade=A
   =========================================================== */
async function fetchPlatformRange(
  devicePk: string,
  grade: "A" | "B" | "C"
): Promise<PlatformRangeInfo> {
  const url = `${API_BASE}/buyer/device-market?devicePk=${encodeURIComponent(
    devicePk
  )}&grade=${encodeURIComponent(grade)}`;

  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to load platform range (HTTP ${res.status})`);
  }

  const json = await res.json();
  // Shape here is flexible; adapt to your backend.
  return {
    platformMin: json.platformMin,
    platformMax: json.platformMax,
    releasePrice: json.releasePrice ?? null,
    releaseDateIso: json.releaseDateIso ?? null,
    activeListings: json.activeListings ?? null,
  };
}

type Step = "selectDevice" | "reviewAndBid";

export function BidWizardModal({
  open,
  onClose,
  listing,
  mode,
  onSubmit,
}: BidWizardModalProps) {
  const [step, setStep] = useState<Step>(
    listing ? "reviewAndBid" : "selectDevice"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ===== Device catalogue (for interval / end-of-window flows) =====
  const [options, setOptions] = useState<DeviceOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedStorageRam, setSelectedStorageRam] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<"A" | "B" | "C">("A");
  const [selectedDevicePk, setSelectedDevicePk] = useState("");

  // Load device options when needed
  useEffect(() => {
    if (!open || listing) return; // continuous flow does not need catalogue

    let cancelled = false;
    (async () => {
      try {
        const items = await fetchDeviceOptions();
        if (!cancelled) setOptions(items);
      } catch (err) {
        console.error(err);
        if (!cancelled)
          setError("Failed to load device catalogue. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, listing]);

  // Derived dropdown lists (same logic pattern as SellerNewListing):contentReference[oaicite:2]{index=2}
  const categories = useMemo(
    () =>
      Array.from(new Set(options.map(o => o.category).filter(Boolean))).sort(),
    [options]
  );

  const brands = useMemo(() => {
    if (!selectedCategory) return [];
    return Array.from(
      new Set(
        options.filter(o => o.category === selectedCategory).map(o => o.brand)
      )
    ).sort();
  }, [options, selectedCategory]);

  const models = useMemo(() => {
    if (!selectedCategory || !selectedBrand) return [];
    return Array.from(
      new Set(
        options
          .filter(
            o => o.category === selectedCategory && o.brand === selectedBrand
          )
          .map(o => o.model)
      )
    ).sort();
  }, [options, selectedCategory, selectedBrand]);

  const variants = useMemo(() => {
    if (!selectedCategory || !selectedBrand || !selectedModel) return [];
    const opts = options.filter(
      o =>
        o.category === selectedCategory &&
        o.brand === selectedBrand &&
        o.model === selectedModel
    );
    const allVariants = Array.from(
      new Set(opts.map(o => o.variant || "").filter(Boolean))
    ).sort();
    return allVariants;
  }, [options, selectedCategory, selectedBrand, selectedModel]);

  const storageRamOptions = useMemo(() => {
    if (!selectedCategory || !selectedBrand || !selectedModel) return [];
    const opts = options.filter(
      o =>
        o.category === selectedCategory &&
        o.brand === selectedBrand &&
        o.model === selectedModel &&
        (!selectedVariant || !o.variant || o.variant === selectedVariant)
    );
    const all = Array.from(
      new Set(
        opts.map(o => {
          const storage = o.storage || "";
          const ram = o.ram || "";
          return ram ? `${storage} / ${ram}` : storage;
        })
      )
    ).filter(Boolean);
    return all.sort();
  }, [options, selectedCategory, selectedBrand, selectedModel, selectedVariant]);

  // Keep selectedDevicePk in sync
  useEffect(() => {
    if (
      !selectedCategory ||
      !selectedBrand ||
      !selectedModel ||
      !selectedStorageRam
    ) {
      setSelectedDevicePk("");
      return;
    }

    const match = options.find(o => {
      if (
        o.category !== selectedCategory ||
        o.brand !== selectedBrand ||
        o.model !== selectedModel
      )
        return false;

      if (variants.length > 0 && selectedVariant) {
        if ((o.variant || "") !== selectedVariant) return false;
      }

      const storage = (o.storage || "").trim();
      const ram = (o.ram || "").trim();
      const label = ram ? `${storage} / ${ram}` : storage;

      return label === selectedStorageRam;
    });

    setSelectedDevicePk(match?.pk || "");
  }, [
    options,
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedVariant,
    selectedStorageRam,
    variants.length,
  ]);

  // ===== Platform range (for both flows) =====
  const [platformInfo, setPlatformInfo] = useState<PlatformRangeInfo | null>(
    null
  );

  const effectiveDevicePk = listing?.devicePk ?? selectedDevicePk;
  const effectiveGrade = listing?.grade ?? selectedGrade;

  const loadPlatformRange = useCallback(async () => {
    if (!effectiveDevicePk || !effectiveGrade) return;
    // For continuous listings we already know sellerMin / sellerMax.
    if (listing) {
      setPlatformInfo({
        platformMin: listing.sellerMin,
        platformMax: listing.sellerMax,
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const info = await fetchPlatformRange(effectiveDevicePk, effectiveGrade);
      setPlatformInfo(info);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Failed to load platform price range for this device."
      );
    } finally {
      setLoading(false);
    }
  }, [effectiveDevicePk, effectiveGrade, listing]);

  useEffect(() => {
    if (!open) return;
    if (!effectiveDevicePk || !effectiveGrade) return;
    void loadPlatformRange();
  }, [open, effectiveDevicePk, effectiveGrade, loadPlatformRange]);

  // ===== Pricing inputs and derived values =====
  const [buyerMin, setBuyerMin] = useState("");
  const [buyerMax, setBuyerMax] = useState("");
  const [finalBid, setFinalBid] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Reset when modal opens or listing changes
  useEffect(() => {
    if (!open) return;

    // Step depends on whether we are in continuous mode (listing) or catalogue mode
    setStep(listing ? "reviewAndBid" : "selectDevice");

    // Clear price and status fields
    setBuyerMin("");
    setBuyerMax("");
    setFinalBid("");
    setError(null);
    setInfoMessage(null);
    setSuccessMsg(null);

    // If we are using the device catalogue (no specific listing),
    // also clear all the selection dropdowns so step 1 is "fresh".
    if (!listing) {
      setSelectedCategory("");
      setSelectedBrand("");
      setSelectedModel("");
      setSelectedVariant("");
      setSelectedStorageRam("");
      setSelectedGrade("A");
      setSelectedDevicePk("");
    }
  }, [open, listing?.listingId]);


  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  const pricingDerived = useMemo(() => {
    if (!platformInfo) return null;

    const platformMin = platformInfo.platformMin;
    const platformMax = platformInfo.platformMax;

    const min = Number(buyerMin);
    const max = Number(buyerMax);

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min <= 0 ||
      max <= 0 ||
      min >= max
    ) {
      return {
        platformMin,
        platformMax,
        midpoint: null,
        isBuyout: false,
        blockingError: "Please enter a valid minimum and maximum.",
        bandLow: null,
        bandHigh: null,
      };
    }

    const midpoint = (min + max) / 2;
    let isBuyout = false;
    let blockingError: string | null = null;

    if (midpoint < platformMin) {
      blockingError = `Your average (RM ${midpoint.toFixed(
        2
      )}) is below the platform minimum (RM ${platformMin.toFixed(
        2
      )}). Please increase your range.`;
    } else if (midpoint > platformMax) {
      // Treat as buy-out: we will clamp final bid to platform maximum.
      isBuyout = true;
    }

    const parsedFinal = Number(finalBid || midpoint);
    const finalClamped = clamp(parsedFinal || midpoint, platformMin, platformMax);

    const bandLow = clamp(finalClamped * 0.8, min, platformMax);
    const bandHigh = clamp(finalClamped * 1.2, platformMin, max);

    // Ensure band is inside both user range and platform range
    const bandLowClamped = clamp(bandLow, platformMin, platformMax);
    const bandHighClamped = clamp(bandHigh, platformMin, platformMax);

    if (bandHighClamped < bandLowClamped) {
      blockingError =
        blockingError ??
        "The flexible band can not be calculated with this range. Please widen your range.";
    }

    return {
      platformMin,
      platformMax,
      midpoint,
      isBuyout,
      blockingError,
      bandLow: bandLowClamped,
      bandHigh: bandHighClamped,
      finalSuggested: finalClamped,
    };
  }, [buyerMin, buyerMax, finalBid, platformInfo]);

  useEffect(() => {
    if (!pricingDerived) {
      setInfoMessage(null);
      return;
    }
    if (pricingDerived.blockingError) {
      setInfoMessage(pricingDerived.blockingError);
      return;
    }
    if (pricingDerived.isBuyout) {
      setInfoMessage(
        `Your average is above the platform maximum. This will be treated as a buy-out at RM ${pricingDerived.platformMax.toFixed(
          2
        )}.`
      );
      return;
    }

    setInfoMessage(
      "Your midpoint and flexible band are within the platform range."
    );
  }, [pricingDerived]);

  // ===== Validation for step navigation =====
  function validateSelectDeviceStep(): boolean {
    if (listing) return true; // no device selection in continuous flow

    if (!selectedCategory || !selectedBrand || !selectedModel) {
      setError("Please select a category, brand, and model.");
      return false;
    }
    if (variants.length > 0 && !selectedVariant) {
      setError("Please select a variant.");
      return false;
    }
    if (!selectedStorageRam || !selectedDevicePk) {
      setError("Please select a valid storage and random access memory option.");
      return false;
    }
    if (!selectedGrade) {
      setError("Please select a device grade.");
      return false;
    }
    setError(null);
    return true;
  }

  // ===== Submit handler =====
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pricingDerived || !platformInfo) return;

    const min = Number(buyerMin);
    const max = Number(buyerMax);
    const bid = Number(finalBid);

    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(bid)) {
      setError("Please enter valid numerical values for all fields.");
      return;
    }

    if (pricingDerived.blockingError) {
      setError(pricingDerived.blockingError);
      return;
    }

    const { platformMin, platformMax } = pricingDerived;

    // Enforce platform min/max ONLY at submit time for the final bid
    if (bid < platformMin || bid > platformMax) {
      setError(
        `Final bid must be within the platform range (RM ${platformMin.toFixed(
          2
        )} – RM ${platformMax.toFixed(2)}).`
      );
      return;
    }

    const bandLow = pricingDerived.bandLow!;
    const bandHigh = pricingDerived.bandHigh!;

    if (bid < bandLow || bid > bandHigh) {
      setError(
        `Final bid must stay within your flexible band (RM ${bandLow.toFixed(
          2
        )} – RM ${bandHigh.toFixed(2)}).`
      );
      return;
    }

    const devicePk = effectiveDevicePk;
    if (!devicePk) {
      setError("No device selected.");
      return;
    }

    const payload: BidWizardSubmitPayload = {
      mode,
      listingId: listing?.listingId,
      devicePk,
      grade: effectiveGrade,
      buyerMin: min,
      buyerMax: max,
      finalBid: bid,
      bandLow,
      bandHigh,
      isBuyout: pricingDerived.isBuyout,
    };

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      if (onSubmit) {
        await onSubmit(payload);
      } else if (listing && mode === "continuous") {
        // Default: same backend you already use in BuyerListingsPage:contentReference[oaicite:3]{index=3}
        const res = await fetch(`${API_BASE}/buyer/bids`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            listingId: listing.listingId,
            bidPrice: bid,
            buyerMin: min,
            buyerMax: max,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            (json && (json.error || json.message)) || `HTTP ${res.status}`;
          throw new Error(msg);
        }
      } else {
        // Fallback for interval / end-of-window if onSubmit is not provided
        console.warn(
          "BidWizardModal submitted without onSubmit handler. Payload:",
          payload
        );
      }

      setSuccessMsg("Your bid has been submitted successfully.");

      // Auto-close the modal after a successful submission
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to submit bid.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const showDeviceSelection = !listing;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 text-white">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {listing ? "Place Bid" : "Create Bid Request"}
          </h2>
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-white"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Step badges */}
        <div className="mb-4 flex gap-4 text-xs">
          {showDeviceSelection && (
            <StepBadge
              label="Device details"
              active={step === "selectDevice"}
              index={1}
            />
          )}
          <StepBadge
            label="Price and bid"
            active={step === "reviewAndBid"}
            index={showDeviceSelection ? 2 : 1}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-lg border border-emerald-500 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-100">
            {successMsg}
          </div>
        )}

        {/* Step content */}
        {step === "selectDevice" && showDeviceSelection && (
          <DeviceSelectionStep
            categories={categories}
            brands={brands}
            models={models}
            variants={variants}
            storageRamOptions={storageRamOptions}
            selectedCategory={selectedCategory}
            selectedBrand={selectedBrand}
            selectedModel={selectedModel}
            selectedVariant={selectedVariant}
            selectedStorageRam={selectedStorageRam}
            selectedGrade={selectedGrade}
            setSelectedCategory={setSelectedCategory}
            setSelectedBrand={setSelectedBrand}
            setSelectedModel={setSelectedModel}
            setSelectedVariant={setSelectedVariant}
            setSelectedStorageRam={setSelectedStorageRam}
            setSelectedGrade={setSelectedGrade}
          />
        )}

        {step === "reviewAndBid" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Device summary */}
            <div className="rounded-xl bg-black/25 px-3 py-2 text-xs text-white/80 space-y-1">
              {listing ? (
                <>
                  <p className="font-semibold">
                    {listing.brand} {listing.model}
                    {listing.variant ? ` • ${listing.variant}` : ""}
                  </p>
                  <p>
                    {listing.ram} • {listing.storage} • Grade {listing.grade}
                  </p>
                </>
              ) : (
                <p className="font-semibold">
                  Selected device: {selectedBrand} {selectedModel}{" "}
                  {selectedVariant && `• ${selectedVariant}`} • Grade{" "}
                  {selectedGrade}
                </p>
              )}

              {platformInfo && (
                <>
                  <p>
                    Platform range for this grade:{" "}
                    <span className="font-semibold">
                      RM {platformInfo.platformMin.toFixed(2)} – RM{" "}
                      {platformInfo.platformMax.toFixed(2)}
                    </span>
                  </p>
                  {typeof platformInfo.activeListings === "number" && (
                    <p>
                      Current active listings: {platformInfo.activeListings}
                    </p>
                  )}
                  {platformInfo.releaseDateIso && (
                    <p>
                      Release date:{" "}
                      {new Date(
                        platformInfo.releaseDateIso
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {typeof platformInfo.releasePrice === "number" && (
                    <p>
                      Original price at launch: RM{" "}
                      {platformInfo.releasePrice.toFixed(2)}
                    </p>
                  )}
                </>
              )}

              {listing &&
                typeof listing.currentHighestBid === "number" &&
                listing.currentHighestBid !== null && (
                  <p>
                    Current highest bid: RM{" "}
                    {listing.currentHighestBid.toFixed(2)}
                  </p>
                )}
            </div>

            {/* Buyer range inputs */}
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <label className="space-y-1">
                <span>Buyer minimum (RM)</span>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={buyerMin}
                  onChange={e => setBuyerMin(e.target.value)}
                  step="1.00"
                />
              </label>

              <label className="space-y-1">
                <span>Buyer maximum (RM)</span>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={buyerMax}
                  onChange={e => setBuyerMax(e.target.value)}
                  step="1.00"
                />
              </label>
            </div>

            {/* Midpoint and flexible band */}
            {pricingDerived && pricingDerived.midpoint && (
              <div className="rounded-xl bg-black/30 px-3 py-2 text-xs text-white/80 space-y-1">
                <p>
                  Midpoint of your range:{" "}
                  <span className="font-semibold">
                    RM {pricingDerived.midpoint.toFixed(2)}
                  </span>
                </p>
                <p>
                  Flexible band (±20% of final bid, clamped into your range and
                  platform range):{" "}
                  {pricingDerived.bandLow && pricingDerived.bandHigh ? (
                    <span className="font-semibold">
                      RM {pricingDerived.bandLow.toFixed(2)} – RM{" "}
                      {pricingDerived.bandHigh.toFixed(2)}
                    </span>
                  ) : (
                    "Not available yet"
                  )}
                </p>
              </div>
            )}

            {/* Final bid */}
            <label className="block text-sm space-y-1">
              <span>Final bid price (RM)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={finalBid}
                onChange={e => setFinalBid(e.target.value)}
                disabled={!pricingDerived || !!pricingDerived.blockingError}
                step="1.00"
              />
              {!pricingDerived && (
                <p className="mt-1 text-xs text-amber-400">
                  Enter a valid buyer minimum and maximum first.
                </p>
              )}
            </label>

            {infoMessage && (
              <p className="text-xs text-emerald-300">{infoMessage}</p>
            )}

            {/* Footer buttons */}
            <div className="mt-4 flex justify-end gap-3">
              {showDeviceSelection && (
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                  onClick={() => setStep("selectDevice")}
                  disabled={loading}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-forest-600 px-4 py-2 text-sm font-medium hover:bg-forest-500 disabled:opacity-60"
                disabled={
                  loading ||
                  !pricingDerived ||
                  !!pricingDerived.blockingError ||
                  !platformInfo
                }
              >
                {loading ? "Submitting..." : "Submit bid"}
              </button>
            </div>
          </form>
        )}

        {/* Step navigation footer for device selection */}
        {step === "selectDevice" && showDeviceSelection && (
          <div className="mt-5 flex justify-end gap-3 text-sm">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-gray-300 hover:bg-white/5"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!validateSelectDeviceStep()) return;
                setStep("reviewAndBid");
              }}
              className="rounded-xl bg-forest-600 px-5 py-2 text-white hover:bg-forest-500 disabled:opacity-60"
              disabled={loading}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Small step badge and device selection subcomponent ===== */

function StepBadge({
  label,
  active,
  index,
}: {
  label: string;
  active: boolean;
  index: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
          active ? "bg-forest-600 text-white" : "bg-white/10 text-white/60"
        }`}
      >
        {index}
      </div>
      <span className={active ? "font-medium" : "text-white/60"}>{label}</span>
    </div>
  );
}

function DeviceSelectionStep(props: {
  categories: string[];
  brands: string[];
  models: string[];
  variants: string[];
  storageRamOptions: string[];

  selectedCategory: string;
  selectedBrand: string;
  selectedModel: string;
  selectedVariant: string;
  selectedStorageRam: string;
  selectedGrade: "A" | "B" | "C";

  setSelectedCategory: Dispatch<SetStateAction<string>>;
  setSelectedBrand: Dispatch<SetStateAction<string>>;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setSelectedVariant: Dispatch<SetStateAction<string>>;
  setSelectedStorageRam: Dispatch<SetStateAction<string>>;
  setSelectedGrade: Dispatch<SetStateAction<"A" | "B" | "C">>;
}) {
  const {
    categories,
    brands,
    models,
    variants,
    storageRamOptions,
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedVariant,
    selectedStorageRam,
    selectedGrade,
    setSelectedCategory,
    setSelectedBrand,
    setSelectedModel,
    setSelectedVariant,
    setSelectedStorageRam,
    setSelectedGrade,
  } = props;

  const hasVariants = variants.length > 0;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-white/70">
        Start by selecting the exact device and grade for which you want to
        place a bid. All options come from the verified device catalogue.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Category */}
        <label className="space-y-1">
          <span className="font-medium">Category *</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setSelectedBrand("");
              setSelectedModel("");
              setSelectedVariant("");
              setSelectedStorageRam("");
            }}
          >
            <option value="">Select category…</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Brand */}
        <label className="space-y-1">
          <span className="font-medium">Brand *</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            value={selectedBrand}
            onChange={e => {
              setSelectedBrand(e.target.value);
              setSelectedModel("");
              setSelectedVariant("");
              setSelectedStorageRam("");
            }}
            disabled={!selectedCategory}
          >
            <option value="">Select brand…</option>
            {brands.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        {/* Model */}
        <label className="space-y-1">
          <span className="font-medium">Model *</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            value={selectedModel}
            onChange={e => {
              setSelectedModel(e.target.value);
              setSelectedVariant("");
              setSelectedStorageRam("");
            }}
            disabled={!selectedBrand}
          >
            <option value="">Select model…</option>
            {models.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        {/* Variant (optional) */}
        {hasVariants && (
          <label className="space-y-1">
            <span className="font-medium">
              Variant (for example: Dual Sim, Graphics Processing Unit, Processor)
            </span>
            <select
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              value={selectedVariant}
              onChange={e => {
                setSelectedVariant(e.target.value);
                setSelectedStorageRam("");
              }}
              disabled={!selectedModel}
            >
              <option value="">Select variant…</option>
              {variants.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Storage / random access memory */}
        <label className="space-y-1 md:col-span-2">
          <span className="font-medium">Storage / random access memory *</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            value={selectedStorageRam}
            onChange={e => setSelectedStorageRam(e.target.value)}
            disabled={!selectedModel}
          >
            <option value="">Select storage / random access memory…</option>
            {storageRamOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {/* Grade */}
        <label className="space-y-1 md:col-span-2">
          <span className="font-medium">Device grade *</span>
          <div className="flex gap-3">
            {(["A", "B", "C"] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(g)}
                className={`rounded-full px-4 py-2 text-sm ${
                  selectedGrade === g
                    ? "bg-forest-600 text-white"
                    : "border border-white/20 text-white/80"
                }`}
              >
                Grade {g}
              </button>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}
