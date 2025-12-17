// src/pages/BuyerListingsPage.tsx
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { api_get } from "../api/api";
import { BidWizardModal } from "../reusables/BidWizardModal"; // <-- path to your modal
import { useAuth } from "../../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

type ListingStatus =
  | "unverified"
  | "verified"
  | "rejected"
  | "active"
  | "ended"
  | "cancelled";

type AuctionMode = "continuous" | "interval" | "end_of_window";

export interface PublicListingSummary {
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
  auctionMode: AuctionMode;
  auctionStartsAt: string;
  auctionEndsAt: string;
  status: ListingStatus;
  thumbnailUrl?: string | null;
}


type BuyerListingsResponse = {
  ok: boolean;
  items: PublicListingSummary[];
};

/** ================== Page ================== */

export default function BuyerListingsPage() {
  const [listings, setListings] = useState<PublicListingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedModel, setSelectedModel] = useState<string>("All");
  const [selectedVariant, setSelectedVariant] = useState<string>("All");
  const [selectedSpec, setSelectedSpec] = useState<string>("All"); // RAM/Storage combined
  const [selectedGrade, setSelectedGrade] = useState<string>("All");
  const { me, login } = useAuth();

  const canCreateBidRequest =
    !!me && me.role === "buyers" && me.verified === true;

  // New: global bid wizard modal
  const [wizardOpen, setWizardOpen] = useState(false);

  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api_get<BuyerListingsResponse>("/buyer/listings");
      setListings(res.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ======== Filter chains ========
  const categories = useMemo(
    () => Array.from(new Set(listings.map(l => l.category))).sort(),
    [listings]
  );

  const filteredByCategory = useMemo(
    () =>
      selectedCategory === "All"
        ? listings
        : listings.filter(l => l.category === selectedCategory),
    [listings, selectedCategory]
  );

  const brands = useMemo(
    () =>
      Array.from(new Set(filteredByCategory.map(l => l.brand))).sort(),
    [filteredByCategory]
  );

  const filteredByBrand = useMemo(
    () =>
      selectedBrand === "All"
        ? filteredByCategory
        : filteredByCategory.filter(l => l.brand === selectedBrand),
    [filteredByCategory, selectedBrand]
  );

  const models = useMemo(
    () => Array.from(new Set(filteredByBrand.map(l => l.model))).sort(),
    [filteredByBrand]
  );

  const filteredByModel = useMemo(
    () =>
      selectedModel === "All"
        ? filteredByBrand
        : filteredByBrand.filter(l => l.model === selectedModel),
    [filteredByBrand, selectedModel]
  );

  const variants = useMemo(
    () =>
      Array.from(
        new Set(filteredByModel.map(l => l.variant || "No variant"))
      ).sort(),
    [filteredByModel]
  );

  const filteredByVariant = useMemo(
    () =>
      selectedVariant === "All"
        ? filteredByModel
        : filteredByModel.filter(
          l =>
            (selectedVariant === "No variant" && !l.variant) ||
            l.variant === selectedVariant
        ),
    [filteredByModel, selectedVariant]
  );

  const specs = useMemo(
    () =>
      Array.from(
        new Set(filteredByVariant.map(l => `${l.ram}/${l.storage}`))
      ).sort(),
    [filteredByVariant]
  );

  const filteredBySpec = useMemo(
    () =>
      selectedSpec === "All"
        ? filteredByVariant
        : filteredByVariant.filter(
          l => `${l.ram}/${l.storage}` === selectedSpec
        ),
    [filteredByVariant, selectedSpec]
  );

  const grades = useMemo(
    () => Array.from(new Set(filteredBySpec.map(l => l.grade))).sort(),
    [filteredBySpec]
  );

  const finalListings = useMemo(
    () =>
      selectedGrade === "All"
        ? filteredBySpec
        : filteredBySpec.filter(l => l.grade === selectedGrade),
    [filteredBySpec, selectedGrade]);

  function resetFilters() {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedModel("All");
    setSelectedVariant("All");
    setSelectedSpec("All");
    setSelectedGrade("All");
  }

  return (
    <div className="max-w-6xl mx-auto p-6 text-forest-900 space-y-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">
            Browse Listings
          </h1>
          <p className="text-sm text-forest-700">
            Filter by device and view available listings. Use the bid wizard to
            create a new bid request based on your budget.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-forest-200 bg-white text-sm text-forest-800 hover:bg-forest-50 disabled:opacity-60"
          >
            Refresh
          </button>

          {/* New: global bid wizard trigger */}
          <button
            type="button"
            onClick={() => {
              setError(null);

              if (!me) {
                login();
                return;
              }

              if (!canCreateBidRequest) {
                setError("Your buyer account must be approved by an admin before you can create a bid request.");
                return;
              }

              setWizardOpen(true);
            }}
            disabled={!me || !canCreateBidRequest}
            className={[
              "rounded-xl px-4 py-2 text-white transition",
              !me || !canCreateBidRequest
                ? "bg-slate-400 cursor-not-allowed opacity-70"
                : "bg-forest-600 hover:bg-forest-700",
            ].join(" ")}
          >
            Create bid request
          </button>


          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm text-forest-700 hover:text-forest-900"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <FilterSelect
          label="Category"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={categories}
        />
        <FilterSelect
          label="Brand"
          value={selectedBrand}
          onChange={setSelectedBrand}
          options={brands}
        />
        <FilterSelect
          label="Model"
          value={selectedModel}
          onChange={setSelectedModel}
          options={models}
        />
        <FilterSelect
          label="Variant"
          value={selectedVariant}
          onChange={setSelectedVariant}
          options={variants}
          extraAllLabel="All"
        />
        <FilterSelect
          label="RAM / Storage"
          value={selectedSpec}
          onChange={setSelectedSpec}
          options={specs}
        />
        <FilterSelect
          label="Grade"
          value={selectedGrade}
          onChange={setSelectedGrade}
          options={grades}
        />
      </div>

      {loading && (
        <p className="text-sm text-forest-700">Loading listings…</p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-500">Error: {error}</p>
      )}

      {!loading && finalListings.length === 0 && (
        <p className="text-sm text-forest-700">
          No listings match your filters yet. Try broadening your search.
        </p>
      )}

      {/* Listing cards – lighter, greenish theme + "View details" */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {finalListings.map(l => (
          <article
            key={l.listingId}
            className="flex flex-col justify-between rounded-2xl border border-forest-100 bg-forest-50 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-3">
              {/* Thumbnail image – comes from backend photoFront/thumbnailUrl */}
              <div className="h-32 w-full overflow-hidden rounded-xl bg-forest-100 flex items-center justify-center">
                {l.thumbnailUrl ? (
                  <img
                    src={l.thumbnailUrl}
                    alt={`${l.brand} ${l.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-forest-500">
                    Device image coming soon
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-forest-900">
                  {l.brand} {l.model}
                </h2>
                <p className="text-sm text-forest-700">
                  {l.category}
                  {l.variant ? ` • ${l.variant}` : ""}
                </p>
                <p className="text-xs text-forest-600">
                  {l.ram} • {l.storage} • Grade {l.grade}
                </p>

                <p className="mt-2 text-sm text-forest-800">
                  Seller range:{" "}
                  <span className="font-semibold">
                    RM {l.sellerMin.toFixed(2)} – RM {l.sellerMax.toFixed(2)}
                  </span>
                </p>

                {typeof l.currentHighestBid === "number" && (
                  <p className="text-xs text-forest-600">
                    Current highest bid: RM {l.currentHighestBid.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mode: {l.auctionMode} • Ends:{" "}
                {new Date(l.auctionEndsAt).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/listings/${encodeURIComponent(l.listingId)}`)}
                className="rounded-xl bg-forest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-500"
              >
                View details
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Global bid wizard – create a NEW buyer bid request from the verified catalogue */}
      <BidWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        mode="continuous" // or "end_of_window" if you prefer
        onSubmit={async payload => {
          // payload = BidWizardSubmitPayload from the modal
          if (!canCreateBidRequest) {
            throw new Error("Your buyer account must be approved by an admin before you can create a bid request.");
          }
          const res = await fetch(`${API_BASE}/buyer/bids`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              devicePk: payload.devicePk,
              grade: payload.grade,
              mode: payload.mode, // "interval" here
              buyerMin: payload.buyerMin,
              buyerMax: payload.buyerMax,
              finalBid: payload.finalBid,
              bandLow: payload.bandLow,
              bandHigh: payload.bandHigh,
              isBuyout: payload.isBuyout,
            }),
          });

          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.ok) {
            const msg =
              (json && (json.error || json.message)) ||
              `HTTP ${res.status}`;
            throw new Error(msg);
          }

          // If you want the listings page to refresh after a successful bid:
          // await load();
        }}
      />

    </div>
  );
}


/** Small filter select component */

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  extraAllLabel?: string;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  extraAllLabel = "All",
}: FilterSelectProps) {
  const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-forest-700">{label}</span>
      <select
        id={id}
        className="rounded-xl border border-forest-100 bg-white px-2 py-1.5 text-xs text-forest-900"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="All">{extraAllLabel}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
