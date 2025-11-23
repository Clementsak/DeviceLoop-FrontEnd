// src/pages/BuyerListingsPage.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api_get } from "../api/api"; // adjust path if needed

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
}

type BuyerListingsResponse = {
    ok: boolean;
    items: PublicListingSummary[];
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

/** ========= Bid Modal ========= */

interface BidModalProps {
    open: boolean;
    onClose: () => void;
    listing: PublicListingSummary | null;
}

function BidModal({ open, onClose, listing }: BidModalProps) {
    const [buyerMin, setBuyerMin] = useState("");
    const [buyerMax, setBuyerMax] = useState("");
    const [bidPrice, setBidPrice] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    // Reset when listing changes or modal opens
    useEffect(() => {
        if (!open) {
            setBuyerMin("");
            setBuyerMax("");
            setBidPrice("");
            setError(null);
            setResult(null);
        }
    }, [open, listing?.listingId]);

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

        if (upper - lower < 1) {
            lower = upper = midpoint;
        }

        return { min, max, midpoint, lower, upper };
    }, [buyerMin, buyerMax]);

    useEffect(() => {
        if (!pricingHints) return;

        const { midpoint, lower, upper } = pricingHints;
        const current = Number(bidPrice);

        if (!Number.isFinite(current) || current < lower || current > upper) {
            setBidPrice(midpoint.toFixed(2));
        }
    }, [pricingHints]);

    if (!open || !listing) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setResult(null);

        const bid = Number(bidPrice);
        const min = buyerMin ? Number(buyerMin) : NaN;
        const max = buyerMax ? Number(buyerMax) : NaN;

        if (!Number.isFinite(bid) || bid <= 0) {
            setError("Please enter a valid bid price (via buyer minimum and maximum).");
            return;
        }

        const payload: any = {
            listingId: listing?.listingId,
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
                credentials: "include",
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 text-white" >
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Place Bid</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Listing summary */}
                <div className="mb-4 rounded-xl bg-black/30 px-3 py-2 text-xs text-white/80 space-y-1">
                    <p className="font-semibold">
                        {listing.brand} {listing.model}
                        {listing.variant ? ` • ${listing.variant}` : ""}
                    </p>
                    <p>
                        {listing.ram} • {listing.storage} • Grade {listing.grade}
                    </p>
                    <p>
                        Seller range:{" "}
                        <span className="font-semibold">
                            RM {listing.sellerMin.toFixed(2)} – RM {listing.sellerMax.toFixed(2)}
                        </span>
                    </p>
                    {typeof listing.currentHighestBid === "number" && (
                        <p>
                            Current highest bid: RM {listing.currentHighestBid.toFixed(2)}
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
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
                            onClick={onClose}
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
    );
}

/** ========= Filters + Listing grid ========= */

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

    const [bidModalOpen, setBidModalOpen] = useState(false);
    const [activeListing, setActiveListing] = useState<PublicListingSummary | null>(null);

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

    // Derived option sets, following the Category → Brand → Model → Variant → Spec → Grade chain
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
        () => Array.from(new Set(filteredByCategory.map(l => l.brand))).sort(),
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
                new Set(
                    filteredByModel.map(l => l.variant || "No variant")
                )
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
                new Set(
                    filteredByVariant.map(l => `${l.ram}/${l.storage}`)
                )
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

    const finalListings = useMemo(() => {
        let base =
            selectedGrade === "All"
                ? filteredBySpec
                : filteredBySpec.filter(l => l.grade === selectedGrade);

        // 🚀 Only continuous auctions shown on this page
        return base.filter(l => l.auctionMode === "continuous");
    }, [filteredBySpec, selectedGrade]);


    function openBid(listing: PublicListingSummary) {
        setActiveListing(listing);
        setBidModalOpen(true);
    }

    function resetFilters() {
        setSelectedCategory("All");
        setSelectedBrand("All");
        setSelectedModel("All");
        setSelectedVariant("All");
        setSelectedSpec("All");
        setSelectedGrade("All");
    }

    return (
        <div className="max-w-6xl mx-auto p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Browse Listings</h1>
                    <p className="text-white/60 text-sm">
                        Filter by device and place a bid using your budget range.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void load()}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={resetFilters}
                        className="px-3 py-2 text-sm text-white/80 hover:text-white"
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
                <p className="text-sm text-black/70">Loading listings…</p>
            )}
            {error && (
                <p className="text-sm text-red-400 mb-4">Error: {error}</p>
            )}

            {/* Listings grid */}
            {!loading && finalListings.length === 0 && (
                <p className="text-sm text-black/70 ">
                    No listings match your filters yet. Try broadening your search.
                </p>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-white">
                {finalListings.map(l => (
                    <article
                        key={l.listingId}
                        className="rounded-2xl bg-slate-900/70 border border-white/10 p-4 flex flex-col justify-between"
                    >
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold">
                                {l.brand} {l.model}
                            </h2>
                            <p className="text-sm text-black/70">
                                {l.category}
                                {l.variant ? ` • ${l.variant}` : ""}
                            </p>
                            <p className="text-xs text-black/60">
                                {l.ram} • {l.storage} • Grade {l.grade}
                            </p>
                            <p className="text-sm mt-2">
                                Seller range:{" "}
                                <span className="font-semibold">
                                    RM {l.sellerMin.toFixed(2)} – RM {l.sellerMax.toFixed(2)}
                                </span>
                            </p>
                            {typeof l.currentHighestBid === "number" && (
                                <p className="text-xs text-black/60">
                                    Current highest bid: RM {l.currentHighestBid.toFixed(2)}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                            <span>
                                Mode: {l.auctionMode} • Ends:{" "}
                                {new Date(l.auctionEndsAt).toLocaleString()}
                            </span>
                            <button
                                type="button"
                                onClick={() => openBid(l)}
                                className="rounded-xl bg-forest-600 px-3 py-1.5 text-xs font-medium hover:bg-forest-500 text-white"
                            >
                                Place bid
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            {/* Bid modal */}
            <BidModal
                open={bidModalOpen}
                onClose={() => setBidModalOpen(false)}
                listing={activeListing}
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
    extraAllLabel?: string; // optional custom label for "no selection"
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
            <span className="text-black/70">{label}</span>
            <select
                id={id}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
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
