"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, CreditCard, Landmark, ChevronDown, ChevronUp, Star, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ALL_GATEWAYS, LIVE_GATEWAY_SLUGS } from "@/lib/gateways";

const AVAILABLE_GATEWAYS = ALL_GATEWAYS.filter((gateway) =>
  process.env.NODE_ENV !== "production" || gateway.slug !== "sandbox",
);

const ADVANCED_FIELDS = [
  { key: "request_url", label: "آدرس API ساخت پرداخت", type: "text" as const },
  { key: "verify_url", label: "آدرس API تأیید پرداخت", type: "text" as const },
  { key: "payment_url_template", label: "الگوی آدرس انتقال (از {token} استفاده کنید)", type: "text" as const },
  { key: "api_key", label: "کلید API", type: "password" as const },
  { key: "merchant_id", label: "کد پذیرنده / ترمینال", type: "text" as const },
  { key: "headers_json", label: "هدرهای اختصاصی (JSON)", type: "textarea" as const },
  { key: "request_body_template", label: "قالب درخواست ساخت پرداخت", type: "textarea" as const },
  { key: "verify_body_template", label: "قالب درخواست تأیید پرداخت", type: "textarea" as const },
  { key: "request_content_type", label: "Content-Type (پیش‌فرض application/json)", type: "text" as const },
  { key: "token_pattern", label: "الگوی پیدا کردن توکن در پاسخ", type: "text" as const },
  { key: "redirect_pattern", label: "الگوی پیدا کردن آدرس پرداخت در پاسخ", type: "text" as const },
  { key: "verify_success_pattern", label: "الگوی موفق بودن پاسخ تأیید", type: "text" as const },
  { key: "reference_pattern", label: "الگوی پیدا کردن کد پیگیری", type: "text" as const },
];

const REQUIRED_FIELDS: Partial<Record<string, string[]>> = {
  zarinpal: ["merchant_id"], zibal: ["merchant_id"], idpay: ["api_key"], payir: ["api_key"],
  sep: ["merchant_id"], saman: ["merchant_id"],
};

export default function PaymentsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function get(key: string, fallback = ""): string { return settings[`payment.${key}`] ?? fallback; }

  function getActive(): string[] {
    const raw = settings["payment.active_gateways"];
    if (Array.isArray(raw)) return raw;
    if (raw) { try { return JSON.parse(raw); } catch { return []; } }
    return [];
  }

  function getActiveGateway(): string { return settings["payment.active_gateway"] || "zarinpal"; }

  function setActive(slug: string, active: boolean) {
    const current = getActive();
    const updated = active ? Array.from(new Set([...current, slug])) : current.filter((s: string) => s !== slug);
    updateSetting("active_gateways", updated);
    if (active) setExpanded(slug);
    if (!active && getActiveGateway() === slug) {
      updateSetting("active_gateway", updated.find((item) => item !== "sandbox") || "");
    }
  }

  function isActive(slug: string): boolean { return getActive().includes(slug); }

  function setDefaultGateway(slug: string) { updateSetting("active_gateway", slug); }

  async function updateSetting(key: string, value: any) { setSettings(prev => ({ ...prev, [`payment.${key}`]: value })); }

  async function saveSettings() {
    const incomplete = getActive().filter((slug) => slug !== "sandbox").find((slug) => {
      const fields = REQUIRED_FIELDS[slug] || ["request_url", "verify_url"];
      return fields.some((field) => !get(`${slug}.${field}`).trim());
    });
    if (incomplete) {
      setExpanded(incomplete);
      toast.error("تنظیمات درگاه فعال‌شده کامل نیست.");
      return;
    }
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("payment."));
    let errors = 0;
    await Promise.all(keys.map(async (key) => {
      try {
        const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: settings[key], group: "payment" }) });
        if (!(await res.json()).ok) errors++;
      } catch { errors++; }
    }));
    if (errors === 0) toast.success("✅ تنظیمات پرداخت ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return AVAILABLE_GATEWAYS;
    const q = search.trim().toLowerCase();
    return AVAILABLE_GATEWAYS.filter(g => g.name.includes(q) || g.slug.includes(q) || g.desc.includes(q));
  }, [search]);

  const activeCount = getActive().filter(s => s !== "sandbox").length;

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <CreditCard className="size-6 text-petrol-600" strokeWidth={1.6} />
            درگاه‌های پرداخت
          </h1>
          <p className="mt-1 text-sm text-slate-500">{AVAILABLE_GATEWAYS.length} درگاه آماده اتصال · {activeCount} فعال</p>
        </div>
        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Save className="size-4" /> {saving ? "..." : "ذخیره"}
        </button>
      </div>

      {/* جستجو */}
      <div className="relative">
        <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal-400" strokeWidth={1.6} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی درگاه‌ها..." dir="rtl"
          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-xs outline-none focus:border-petrol-500" />
      </div>

      {/* لیست درگاه‌ها */}
      <div className="grid gap-3">
        {filtered.map((gw) => {
          const active = isActive(gw.slug);
          const isDefault = getActiveGateway() === gw.slug;
          const isExpanded = expanded === gw.slug;

          return (
            <div key={gw.slug}
              className={cn("rounded-2xl border bg-white p-4 shadow-sm transition-all",
                active ? (isDefault ? "border-petrol-400 ring-1 ring-petrol-200" : "border-emerald-200") : "border-slate-200 opacity-60"
              )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                    <CreditCard className="size-4" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{gw.name}</h3>
                      {gw.slug === "sandbox" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">تست</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{gw.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* دکمه پیش‌فرض */}
                  {active && (
                    <button onClick={() => setDefaultGateway(gw.slug)}
                      aria-label={`انتخاب ${gw.name} به‌عنوان درگاه پیش‌فرض`}
                      className={cn("rounded-lg px-2 py-1 text-[10px] font-semibold transition-all", isDefault ? "bg-petrol-100 text-petrol-700" : "bg-slate-100 text-slate-400 hover:bg-petrol-50 hover:text-petrol-600")}>
                      {isDefault ? <><Star className="inline size-3 fill-current" /> پیش‌فرض</> : "انتخاب"}
                    </button>
                  )}

                  {gw.slug !== "sandbox" && (
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" aria-label={`فعال‌سازی ${gw.name}`} checked={active} onChange={e => setActive(gw.slug, e.target.checked)} className="peer sr-only" />
                      <div className="h-5 w-9 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
                    </label>
                  )}

                  {gw.fields.length > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : gw.slug)} aria-label={`${isExpanded ? "بستن" : "باز کردن"} تنظیمات ${gw.name}`} className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && gw.fields.length > 0 && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {(LIVE_GATEWAY_SLUGS.includes(gw.slug) || gw.slug === "saman"
                    ? gw.fields
                    : Array.from(new Map([...gw.fields, ...ADVANCED_FIELDS].map((field) => [field.key, field])).values())
                  ).map(f => (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-medium text-slate-700">{f.label}</label>
                      {f.type === "checkbox" ? (
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={get(`${gw.slug}.${f.key}`) === "true"}
                            onChange={e => updateSetting(`${gw.slug}.${f.key}`, e.target.checked ? "true" : "false")} className="size-4 accent-petrol-600" />
                          <span className="text-xs text-slate-600">فعال</span>
                        </label>
                      ) : f.type === "textarea" ? (
                        <textarea value={get(`${gw.slug}.${f.key}`)}
                          onChange={e => updateSetting(`${gw.slug}.${f.key}`, e.target.value)} dir="ltr" rows={4}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-petrol-500" />
                      ) : (
                        <input type={f.type || "text"} value={get(`${gw.slug}.${f.key}`)}
                          onChange={e => updateSetting(`${gw.slug}.${f.key}`, e.target.value)} dir="ltr"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">درگاهی با این نام یافت نشد</div>
        )}
      </div>
    </div>
  );
}
