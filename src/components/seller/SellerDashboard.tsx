// src/components/seller/SellerDashboard.tsx
import { useEffect, useState } from "react";
import { SellerAPI, type SellerSummary } from "../api/seller";

export function SellerDashboard() {
  const [data, setData] = useState<SellerSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    SellerAPI.summary()
      .then(setData)
      .catch((e: any) => setErr(e.message ?? String(e)));
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Seller Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Active listings" value={data.listings_active} />
        <Stat label="Pending orders" value={data.orders_pending} />
        <Stat label="Unread messages" value={data.messages_unread} />
        <Stat
          label="Next payout"
          value={
            data.next_payout?.amount
              ? `RM ${data.next_payout.amount.toFixed(2)}`
              : "—"
          }
          sub={data.next_payout?.date ?? ""}
        />
      </div>

      <p className="text-sm text-gray-500">
        Updated {new Date(data.generated_at).toLocaleString()}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub ? <div className="text-xs text-gray-400">{sub}</div> : null}
    </div>
  );
}
