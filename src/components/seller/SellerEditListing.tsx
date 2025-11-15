// src/components/seller/pages/SellerEditListing.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type Listing, type ListingUpsert , SellerAPI } from "../api/seller";

export function SellerEditListing() {
  const { id } = useParams();
  const nav = useNavigate();
  const [orig, setOrig] = useState<Listing | null>(null);
  const [form, setForm] = useState<ListingUpsert>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    SellerAPI.getListing(id)
      .then(x => {
        setOrig(x);
        setForm({
          Title: x.Title,
          Category: x.Category,
          Brand: x.Brand,
          Model: x.Model,
          Storage: x.Storage ?? "",
          ConditionGrade: x.ConditionGrade,
          Description: x.Description ?? "",
          PriceStart: x.PriceStart,
          PriceFloor: x.PriceFloor,
          IsActive: x.IsActive,
          Status: x.Status,
        });
      })
      .catch(e => setErr(e.message));
  }, [id]);

  function set<K extends keyof ListingUpsert>(k: K, v: ListingUpsert[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function save() {
    if (!id) return;
    setBusy(true);
    try {
      await SellerAPI.updateListing(id, form);
      nav("/seller/listings");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err) return <div className="text-red-600">{err}</div>;
  if (!orig) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Listing</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Text v={form.Title ?? ""} onChange={v => set("Title", v)} label="Title" />
        <Text v={form.Category ?? ""} onChange={v => set("Category", v)} label="Category" />
        <Text v={form.Brand ?? ""} onChange={v => set("Brand", v)} label="Brand" />
        <Text v={form.Model ?? ""} onChange={v => set("Model", v)} label="Model" />
        <Text v={form.Storage ?? ""} onChange={v => set("Storage", v)} label="Storage" />
        <Text v={form.ConditionGrade ?? ""} onChange={v => set("ConditionGrade", v)} label="Condition Grade" />
        <Text v={String(form.PriceStart ?? "")} onChange={v => set("PriceStart", v ? Number(v) : undefined)} label="Starting Price (RM)" />
        <Text v={String(form.PriceFloor ?? "")} onChange={v => set("PriceFloor", v ? Number(v) : undefined)} label="Floor Price (RM)" />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!form.IsActive} onChange={e => set("IsActive", e.target.checked)} />
          <span>Active</span>
        </label>
        <Text v={form.Status ?? ""} onChange={v => set("Status", v)} label="Status" />
        <TextArea v={form.Description ?? ""} onChange={v => set("Description", v)} label="Description" className="md:col-span-2" />
      </div>

      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="rounded-xl px-4 py-2 bg-forest-600 text-white">
          Save
        </button>
        <button disabled={busy} onClick={() => history.back()} className="rounded-xl px-4 py-2 bg-gray-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Text(props: { v: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="space-y-1">
      <span className="text-sm text-gray-600">{props.label}</span>
      <input value={props.v} onChange={e => props.onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
    </label>
  );
}
function TextArea(props: { v: string; onChange: (v: string) => void; label: string; className?: string }) {
  return (
    <label className={`space-y-1 ${props.className ?? ""}`}>
      <span className="text-sm text-gray-600">{props.label}</span>
      <textarea value={props.v} onChange={e => props.onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 h-32" />
    </label>
  );
}
