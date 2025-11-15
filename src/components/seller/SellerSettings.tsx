// src/components/seller/pages/SellerSettings.tsx
import { useEffect, useState } from "react";
import { SellerAPI, type SellerSettings as TSettings } from "../api/seller";

export function SellerSettings() {
  const [form, setForm] = useState<TSettings>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    SellerAPI.getSettings()
      .then(setForm)
      .catch(e => setErr(e.message));
  }, []);

  function set<K extends keyof TSettings>(k: K, v: TSettings[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function save() {
    try {
      setOk(false);
      await SellerAPI.putSettings(form);
      setOk(true);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Store Settings</h1>
      {err && <div className="text-red-600">{err}</div>}
      {ok && <div className="text-green-700">Saved.</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Text v={form.store_name ?? ""} onChange={v => set("store_name", v)} label="Store Name" />
        <Text v={form.store_logo_url ?? ""} onChange={v => set("store_logo_url", v)} label="Logo URL" />
        <Text v={form.support_email ?? ""} onChange={v => set("support_email", v)} label="Support Email" />
        <Text v={form.phone ?? ""} onChange={v => set("phone", v)} label="Phone" />
        <TextArea v={form.address ?? ""} onChange={v => set("address", v)} label="Address" className="md:col-span-2" />
        <TextArea v={form.shipping_policy ?? ""} onChange={v => set("shipping_policy", v)} label="Shipping Policy" className="md:col-span-2" />
        <TextArea v={form.return_policy ?? ""} onChange={v => set("return_policy", v)} label="Return Policy" className="md:col-span-2" />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form.notifications?.email}
            onChange={e => set("notifications", { ...(form.notifications ?? {}), email: e.target.checked })}
          />
          <span>Email notifications</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form.notifications?.sms}
            onChange={e => set("notifications", { ...(form.notifications ?? {}), sms: e.target.checked })}
          />
          <span>SMS notifications</span>
        </label>
      </div>

      <button onClick={save} className="rounded-xl px-4 py-2 bg-forest-600 text-white">Save</button>
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
      <textarea value={props.v} onChange={e => props.onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 h-28" />
    </label>
  );
}
