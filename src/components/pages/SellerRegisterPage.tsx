// src/pages/SellerRegisterPage.tsx
import { type FormEvent, useEffect, useState } from "react";
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

  const labelClass = "block text-sm font-semibold text-slate-800";
  const inputClass =
    "w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400";

  useEffect(() => {
    if (!me) return;

    setForm((f) => ({
      ...f,
      // only fill if the user has not typed anything yet
      contactEmail: f.contactEmail || me.email || "",
      contactPhone: f.contactPhone || me.phone_number || "",
    }));
  }, [me?.email, me?.phone_number]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.organisationName.trim()) {
      setError("Organisation name is required.");
      return;
    }
        if (!form.organisationName.trim()) {
      setError("Organisation name is required.");
      return;
    }
    if (!form.organisationRegNo.trim()) {
      setError("Registration number is required.");
      return;
    }
    if (!form.address.trim()) {
      setError("Business address is required.");
      return;
    }
    if (!form.contactEmail.trim()) {
      setError("Contact email is required.");
      return;
    }
    if (!form.contactPhone.trim()) {
      setError("Contact phone number is required.");
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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
      <h1 className="text-2xl font-semibold">Register as a seller</h1>
      <p className="text-black/70">
        Submit your basic organisation details. An admin will review and enable seller
        access if everything checks out.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>Organisation name *</label>
          <input
            className={inputClass}
            required
            value={form.organisationName}
            onChange={(e) => update("organisationName", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Registration number*</label>
          <input
            className={inputClass}
            required
            value={form.organisationRegNo}
            onChange={(e) => update("organisationRegNo", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Business address*</label>
          <textarea
            className={inputClass}
            required
            rows={3}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Contact email*</label>
            <input
              type="email"
              className={inputClass}
              required
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Contact phone*</label>
            <input
              className={inputClass}
              required
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Website</label>
          <input
            className={inputClass}
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Notes for admin</label>
          <textarea
            className={inputClass}
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Seller registration submitted. Please wait for administrator review.
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
