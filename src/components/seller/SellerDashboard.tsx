// src/components/seller/SellerDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SellerAPI, type SellerSummary } from "../api/seller";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-emerald-900">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-emerald-950">{value}</div>
      {hint ? <div className="mt-1 text-xs text-emerald-700/80">{hint}</div> : null}
    </div>
  );
}

export function SellerDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<SellerSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await SellerAPI.summary();
        if (!cancelled) setData(s);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-950">Seller dashboard</h1>
          <p className="mt-1 text-sm text-emerald-800/80">
            Overview of your seller activity and shortcuts to common actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={() => nav("/seller/listings/new")}
          >
            + New listing
          </button>
          <button
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            onClick={() => nav("/seller/listings")}
          >
            View listings
          </button>
          <button
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            onClick={() => nav("/seller/orders")}
          >
            View orders
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {!data && !err ? (
        <div className="mt-6 text-sm text-emerald-800/80">Loading…</div>
      ) : null}

      {data ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Active listings"
            value={data.listings_active ?? 0}
            hint="Listings currently available for matching."
          />
          <StatCard
            label="Pending payments"
            value={data.orders_pending ?? 0}
            hint="Matched trades waiting for payment."
          />
          <StatCard
            label="Pending requests"
            value={data.requests_pending ?? 0}
            hint="Listing requests awaiting review."
          />
        </div>
      ) : null}
    </div>
  );
}
