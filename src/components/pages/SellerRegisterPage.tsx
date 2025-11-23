// src/pages/SellerRegisterPage.tsx
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { submitSellerRegistration } from "../api/api";

export default function SellerRegisterPage() {
  const { me, loading } = useAuth();
  const [form, setForm] = useState({
    organisationName: "",
    organisationRegNo: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.organisationName.trim()) {
      setError("Organisation name is required.");
      return;
    }

    try {
      setSubmitting(true);
      await submitSellerRegistration(form);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit seller registration.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!me) return <div className="p-6">You need to sign in first.</div>;
  if (me.role === "sellers" || me.role === "admin") {
    return (
      <div className="p-6">
        You already have seller access. Use the Seller dashboard instead.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Register as a seller</h1>
      <p className="text-black/70">
        Submit your basic organisation details. An admin will review and enable seller
        access if everything checks out.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Organisation name *</label>
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2"
            value={form.organisationName}
            onChange={(e) => update("organisationName", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Registration number</label>
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2"
            value={form.organisationRegNo}
            onChange={(e) => update("organisationRegNo", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Business address</label>
          <textarea
            className="w-full rounded-xl bg-white/5 px-3 py-2"
            rows={3}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium">Contact email</label>
            <input
              type="email"
              className="w-full rounded-xl bg-white/5 px-3 py-2"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Contact phone</label>
            <input
              className="w-full rounded-xl bg-white/5 px-3 py-2"
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Website</label>
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Notes for admin</label>
          <textarea
            className="w-full rounded-xl bg-white/5 px-3 py-2"
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        {success && (
          <div className="text-sm text-emerald-400">
            Seller registration submitted. An admin will review it.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary rounded-xl px-5 py-2"
        >
          {submitting ? "Submitting…" : "Submit registration"}
        </button>
      </form>
    </div>
  );
}
