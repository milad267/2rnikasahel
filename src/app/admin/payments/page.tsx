"use client";

import { useState, useEffect } from "react";
import { Save, CreditCard, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_GATEWAYS = [
  { slug: "zarinpal", name: "زرین‌پال", desc: "درگاه واسط زرین‌پال", fields: [{ key: "merchant_id", label: "کد بازرگانی (Merchant ID)", type: "text" }] },
  { slug: "sandbox", name: "درگاه تست (Sandbox)", desc: "برای تست و توسعه", fields: [] },
  { slug: "idpay", name: "آیدی پی (IDPay)", desc: "درگاه واسط IDPay", fields: [{ key: "api_key", label: "API Key", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "payir", name: "پی‌آر (Pay.ir)", desc: "درگاه واسط Pay.ir", fields: [{ key: "api_key", label: "API Key", type: "text" }] },
  { slug: "zibal", name: "زیبال (Zibal)", desc: "درگاه واسط زیبال", fields: [{ key: "merchant_id", label: "کد بازرگانی", type: "text" }] },
];

export default function PaymentsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function get(key: string, fallback = ""): string { return settings[`payment.${key}`] || fallback; }
  function getActive(): string[] {
    const raw = settings["payment.active_gateways"];
    return Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : ["sandbox"]);
  }

  function setActive(slug: string, active: boolean) {
    const current = getActive();
    const updated = active ? [...current, slug] : current.filter((s: string) => s !== slug);
    updateSetting("payment.active_gateways", updated);
  }

  function isActive(slug: string): boolean { return getActive().includes(slug); }

  async function updateSetting(key: string, value: any) {
    setSettings(prev => ({ ...prev, [`payment.${key}`]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("payment."));
    let errors = 0;
    for (const key of keys) {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key], group: "payment" }),
      });
      if (!(await res.json()).ok) errors++;
    }
    if (errors === 0) toast.success("✅ تنظیمات پرداخت ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا در ذخیره`);
    setSaving(false);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><CreditCard className="size-6 text-petrol-600" strokeWidth={1.6} /> درگاه‌های پرداخت</h1>
          <p className="mt-1 text-sm text-slate-500">فعال‌سازی و تنظیم درگاه‌های پرداخت آنلاین</p>
        </div>
        <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save className="size-4" /> {saving ? "..." : "ذخیره"}</button>
      </div>

      <div className="grid gap-4">
        {DEFAULT_GATEWAYS.map(gw => {
          const active = isActive(gw.slug);
          const isExpanded = expanded === gw.slug;
          return (
            <div key={gw.slug} className={`rounded-2xl border bg-white p-5 shadow-sm ${active ? "border-emerald-200" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    <CreditCard className="size-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{gw.name}</h3>
                    <p className="text-[11px] text-slate-500">{gw.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={active} onChange={e => setActive(gw.slug, e.target.checked)} className="peer sr-only" />
                    <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
                  </label>
                  {gw.fields.length > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : gw.slug)} className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && gw.fields.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {gw.fields.map(f => (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-medium text-slate-700">{f.label}</label>
                      {f.type === "checkbox" ? (
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={get(`${gw.slug}.${f.key}`) === "true"} onChange={e => updateSetting(`${gw.slug}.${f.key}`, e.target.checked ? "true" : "false")} className="size-4 accent-petrol-600" />
                          <span className="text-xs text-slate-600">فعال</span>
                        </label>
                      ) : (
                        <input type="text" value={get(`${gw.slug}.${f.key}`)} onChange={e => updateSetting(`${gw.slug}.${f.key}`, e.target.value)} dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
