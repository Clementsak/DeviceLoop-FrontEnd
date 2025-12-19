import { useEffect, useState } from "react";
import { SellerAPI } from "../api/seller";

type SellerSettingsShape = {
  organisationName?: string;
  organisationRegNo?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
};

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-forest-200 bg-white p-4">
      <div className="text-xs font-semibold text-forest-700">{label}</div>
      <div className="mt-1 text-sm text-forest-900 whitespace-pre-wrap break-words">
        {value && value.trim() ? value : <span className="text-forest-400">Not provided</span>}
      </div>
    </div>
  );
}

export function SellerSettings() {
  const [data, setData] = useState<SellerSettingsShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const settings = (await SellerAPI.getSettings()) as SellerSettingsShape;
      setData(settings || {});
    } catch (e: any) {
      setErr(e?.message || "Failed to load store settings.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Store settings</h1>
          <p className="text-sm text-forest-700">
            These details come from your seller registration and are read-only here.
          </p>
        </div>

        <button
          onClick={load}
          className="h-10 rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white hover:bg-forest-800"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-forest-200 bg-forest-50 p-4">
        {loading ? (
          <div className="text-sm text-forest-700">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Organisation name" value={data?.organisationName} />
            <Field label="Organisation registration number" value={data?.organisationRegNo} />
            <Field label="Contact email" value={data?.contactEmail} />
            <Field label="Contact phone number" value={data?.contactPhone} />
            <Field label="Website" value={data?.website} />
            <div className="md:col-span-2">
              <Field label="Business address" value={data?.address} />
            </div>
            <div className="md:col-span-2">
              <Field label="Notes" value={data?.notes} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
