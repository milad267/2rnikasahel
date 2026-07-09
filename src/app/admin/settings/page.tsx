"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Setting = { id: number; key: string; value: any; group: string; locale: string; };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phones, setPhones] = useState<{ label: string; number: string }[]>([]);
  const [emails, setEmails] = useState<{ label: string; email: string }[]>([]);
  const [socials, setSocials] = useState<{ label: string; url: string; icon: string }[]>([]);

  const brandName = settings.find(s => s.key === "brand.name")?.value || "درنیکا ساحل";
  const brandTagline = settings.find(s => s.key === "brand.tagline")?.value || "";
  const enamadCode = settings.find(s => s.key === "footer.enamad_code")?.value || "";

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      const arr: Setting[] = d.data || d;
      setSettings(arr);
      try {
        const p = JSON.parse(arr.find(s => s.key === "site.phones")?.value || "[]");
        const e = JSON.parse(arr.find(s => s.key === "site.emails")?.value || "[]");
        const soc = JSON.parse(arr.find(s => s.key === "site.socials")?.value || "[]");
        setPhones(Array.isArray(p) ? p : []);
        setEmails(Array.isArray(e) ? e : []);
        setSocials(Array.isArray(soc) ? soc : []);
      } catch {}
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // ذخیره لیست‌های پویا
      const brandNameInput = (document.getElementById("brandName") as HTMLInputElement)?.value;
      const brandTaglineInput = (document.getElementById("brandTagline") as HTMLInputElement)?.value;
      const enamadInput = (document.getElementById("enamadCode") as HTMLTextAreaElement)?.value;

      await Promise.all([
        ...(brandNameInput ? [fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "brand.name", value: brandNameInput, group: "brand" }) })] : []),
        ...(brandTaglineInput ? [fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "brand.tagline", value: brandTaglineInput, group: "brand" }) })] : []),
        ...(enamadInput !== undefined ? [fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "footer.enamad_code", value: enamadInput, group: "general" }) })] : []),
        fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.phones", value: JSON.stringify(phones) }) }),
        fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.emails", value: JSON.stringify(emails) }) }),
        fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.socials", value: JSON.stringify(socials) }) }),
      ]);
      toast.success("تنظیمات ذخیره شد ✓");
    } catch { toast.error("خطا در ذخیره"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">تنظیمات سایت</h1>
        <p className="mt-1 text-sm text-slate-500">مدیریت اطلاعات عمومی، تماس‌ها و شبکه‌های اجتماعی</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">اطلاعات عمومی</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">نام سایت</label><input id="brandName" defaultValue={brandName} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">شعار</label><input id="brandTagline" defaultValue={brandTagline} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
        </div>
      </div>

      {/* کد اناماد */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">نماد اعتماد الکترونیکی (Enamad)</h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">کد HTML اناماد</label>
          <textarea id="enamadCode" defaultValue={enamadCode} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono" placeholder="کد HTML دریافتی از enamad.ir را اینجا قرار دهید..." />
          <p className="mt-1.5 text-[10px] text-slate-500">کد اناماد را از سایت enamad.ir دریافت کنید. اگر کد وارد نشده باشد، آیکون پیش‌فرض نمایش داده می‌شود.</p>
        </div>
      </div>

      {/* شماره‌های تماس */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">شماره‌های تماس</h2>
        {phones.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input value={p.label} onChange={e => { const n = [...phones]; n[i].label = e.target.value; setPhones(n); }} placeholder="برچسب" className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
            <input value={p.number} onChange={e => { const n = [...phones]; n[i].number = e.target.value; setPhones(n); }} placeholder="شماره" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" dir="ltr" />
            <button onClick={() => setPhones(phones.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <button onClick={() => setPhones([...phones, { label: "", number: "" }])} className="flex items-center gap-1.5 text-xs font-medium text-petrol-600"><Plus className="size-4" /> افزودن شماره</button>
      </div>

      {/* ایمیل‌ها */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">ایمیل‌های تماس</h2>
        {emails.map((e, i) => (
          <div key={i} className="flex gap-2">
            <input value={e.label} onChange={ev => { const n = [...emails]; n[i].label = ev.target.value; setEmails(n); }} placeholder="برچسب" className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
            <input value={e.email} onChange={ev => { const n = [...emails]; n[i].email = ev.target.value; setEmails(n); }} placeholder="ایمیل" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" dir="ltr" />
            <button onClick={() => setEmails(emails.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <button onClick={() => setEmails([...emails, { label: "", email: "" }])} className="flex items-center gap-1.5 text-xs font-medium text-petrol-600"><Plus className="size-4" /> افزودن ایمیل</button>
      </div>

      {/* شبکه‌های اجتماعی */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">شبکه‌های اجتماعی</h2>
        {socials.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input value={s.label} onChange={e => { const n = [...socials]; n[i].label = e.target.value; setSocials(n); }} placeholder="برچسب" className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
            <select value={s.icon} onChange={e => { const n = [...socials]; n[i].icon = e.target.value; setSocials(n); }} className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none">
              <option value="social_instagram">اینستاگرام</option>
              <option value="social_telegram">تلگرام</option>
              <option value="social_whatsapp">واتساپ</option>
              <option value="social_website">وب‌سایت</option>
            </select>
            <input value={s.url} onChange={e => { const n = [...socials]; n[i].url = e.target.value; setSocials(n); }} placeholder="لینک" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" dir="ltr" />
            <button onClick={() => setSocials(socials.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <button onClick={() => setSocials([...socials, { label: "", url: "", icon: "social_instagram" }])} className="flex items-center gap-1.5 text-xs font-medium text-petrol-600"><Plus className="size-4" /> افزودن شبکه اجتماعی</button>
      </div>

      {/* Save */}
      <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 text-xs font-semibold text-white shadow-md disabled:opacity-50">
          <Save className="size-4" /> {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
      </div>
    </div>
  );
}
