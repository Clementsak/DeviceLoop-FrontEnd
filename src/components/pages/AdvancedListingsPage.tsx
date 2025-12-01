// src/components/pages/AdvancedListingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  api_getMarkets,
  type MarketSummary,
} from "../api/api";
import { BidWizardModal } from "../reusables/BidWizardModal";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

type GradeFilter = "All" | "A" | "B" | "C";

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Not provided";
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdvancedListingsPage() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedModel, setSelectedModel] = useState<string>("All");
  const [selectedGrade, setSelectedGrade] = useState<GradeFilter>("All");

  // Bid wizard state (for now user still selects device in the wizard)
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const items = await api_getMarkets();
        setMarkets(items);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load markets.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // ======== Filters ========
  const categories = useMemo(
    () =>
      Array.from(
        new Set(markets.map(m => m.category).filter(Boolean) as string[])
      ).sort(),
    [markets]
  );

  const filteredByCategory = useMemo(
    () =>
      selectedCategory === "All"
        ? markets
        : markets.filter(m => m.category === selectedCategory),
    [markets, selectedCategory]
  );

  const brands = useMemo(
    () =>
      Array.from(
        new Set(filteredByCategory.map(m => m.brand).filter(Boolean) as string[])
      ).sort(),
    [filteredByCategory]
  );

  const filteredByBrand = useMemo(
    () =>
      selectedBrand === "All"
        ? filteredByCategory
        : filteredByCategory.filter(m => m.brand === selectedBrand),
    [filteredByCategory, selectedBrand]
  );

  const models = useMemo(
    () =>
      Array.from(
        new Set(filteredByBrand.map(m => m.model).filter(Boolean) as string[])
      ).sort(),
    [filteredByBrand]
  );

  const filteredByModel = useMemo(
    () =>
      selectedModel === "All"
        ? filteredByBrand
        : filteredByBrand.filter(m => m.model === selectedModel),
    [filteredByBrand, selectedModel]
  );

  const finalMarkets = useMemo(
    () =>
      selectedGrade === "All"
        ? filteredByModel
        : filteredByModel.filter(m => m.grade === selectedGrade),
    [filteredByModel, selectedGrade]
  );

  function resetFilters() {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedModel("All");
    setSelectedGrade("All");
  }

  return (
    <div className="max-w-6xl mx-auto p-6 text-forest-900 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">
            Advanced market view
          </h1>
          <p className="text-sm text-forest-800/80">
            View all active markets (device + grade) with platform ranges,
            seller ranges, and auction modes.
          </p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="px-3 py-2 rounded-lg border border-forest-700 text-sm"
        >
          Reset filters
        </button>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="flex flex-col text-xs gap-1">
          <span className="font-semibold">Category</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-forest-700 px-2 py-1 text-sm bg-white"
          >
            <option value="All">All</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs gap-1">
          <span className="font-semibold">Brand</span>
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="rounded-lg border border-forest-700 px-2 py-1 text-sm bg-white"
          >
            <option value="All">All</option>
            {brands.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs gap-1">
          <span className="font-semibold">Model</span>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="rounded-lg border border-forest-700 px-2 py-1 text-sm bg-white"
          >
            <option value="All">All</option>
            {models.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs gap-1">
          <span className="font-semibold">Grade</span>
          <select
            value={selectedGrade}
            onChange={e =>
              setSelectedGrade(e.target.value as GradeFilter)
            }
            className="rounded-lg border border-forest-700 px-2 py-1 text-sm bg-white"
          >
            <option value="All">All</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
        </label>
      </div>

      {loading && (
        <p className="text-sm text-forest-800">Loading markets…</p>
      )}
      {error && (
        <p className="text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && finalMarkets.length === 0 && (
        <p className="text-sm text-forest-800">
          No markets found for the selected filters.
        </p>
      )}

      {!loading && !error && finalMarkets.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-forest-700/40 bg-forest-50">
          <table className="min-w-full text-sm">
            <thead className="bg-forest-700 text-forest-50">
              <tr>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-left">Storage / RAM</th>
                <th className="px-3 py-2 text-left">Platform range</th>
                <th className="px-3 py-2 text-left">Seller range</th>
                <th className="px-3 py-2 text-left">Listings</th>
                <th className="px-3 py-2 text-left">Modes</th>
                <th className="px-3 py-2 text-left">Release info</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {finalMarkets.map(m => (
                <tr
                  key={m.marketKey}
                  className="border-t border-forest-700/10"
                >
                  <td className="px-3 py-2 align-top">
                    <div className="font-semibold">
                      {m.brand ?? "Unknown"} {m.model ?? ""}
                    </div>
                    <div className="text-xs text-forest-800/80">
                      {m.category ?? "-"} • Market key: {m.marketKey}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    Grade {m.grade}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {m.storage ?? "-"} / {m.ram ?? "-"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {formatMoney(m.platformMin)} –{" "}
                    {formatMoney(m.platformMax)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {formatMoney(m.sellerRangeMin)} –{" "}
                    {formatMoney(m.sellerRangeMax)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div>{m.numListings} active</div>
                    <div className="text-xs text-forest-800/80">
                      C {m.numContinuous} • I {m.numInterval} • E{" "}
                      {m.numEndOfWindow}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="text-xs text-forest-800/90">
                      {m.numContinuous > 0 && <div>Continuous</div>}
                      {m.numInterval > 0 && <div>Interval</div>}
                      {m.numEndOfWindow > 0 && (
                        <div>End-of-window</div>
                      )}
                      {m.numContinuous === 0 &&
                        m.numInterval === 0 &&
                        m.numEndOfWindow === 0 && <div>-</div>}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-forest-800/90">
                    <div>Release price: {formatMoney(m.releasePrice)}</div>
                    <div>
                      Release date: {m.releaseDate ?? "Not provided"}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <button
                      type="button"
                      onClick={() => setWizardOpen(true)}
                      className="px-3 py-1 rounded-lg bg-forest-700 text-forest-50 text-xs font-medium hover:bg-forest-800"
                    >
                      Create bid
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generic wizard – for now device is selected inside the modal */}
      <BidWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        mode="interval"
        onSubmit={async payload => {
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
              mode: payload.mode,
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
        }}
      />
    </div>
  );
}
