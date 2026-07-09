"use client";

import { useState, useEffect } from "react";
import { Save, MessageSquare, Send, Phone, History, Settings2 } from "lucide-react";
import { toast } from "sonner";

const SMS_PROVIDERS = [
  { slug: "kavenegar", name: "کاوه‌نگار", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "ghasedak", name: "قاصدک", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "melipayamak", name: "ملی پیامک", fields: [{ key: "username", label: "نام کاربری", type: "text" }, { key: "password", label: "رمز عبور", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "farazsms", name: "فراز اس‌ام‌اس", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "smsir", name: "SMS.ir", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "raygansms", name: "رایگان اس‌ام‌اس", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "asanak", name: "آسانک", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "parandsms", name: "پرند اس‌ام‌اس", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
];

export default function SmsPage() {
  const [tab, setTab] = useState<"settings" | "send" | "history">("settings");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function get(key: string, fallback = ""): string { return settings[`sms.${key}`] || fallback; }
  function getActiveProvider(): string { return settings["sms.active_provider"] || "kavenegar"; }

  async function updateSetting(key: string, value: any) {
    setSettings(prev => ({ ...prev, [`sms.${key}`]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("sms."));
    let errors = 0;
    for (const key of keys) {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key], group: "sms" }),
      });
      if (!(await res.json()).ok) errors++;
    }
    if (errors === 0) toast.success("✅ تنظیمات پیامک ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  async function sendTest() {
    if (!testPhone.trim()) { toast.error("شماره موبایل را وارد کنید"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: testPhone.trim(), type: "phone" }),
      });
      const data = await res.json();
      if (data.ok) toast.success("✅ پیامک تست ارسال شد" + (data.devCode ? ` (کد: ${data.devCode})` : ""));
      else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در ارسال"); }
    setSending(false);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  const activeProvider = SMS_PROVIDERS.find(p => p.slug === getActiveProvider()) || SMS_PROVIDERS[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><MessageSquare className="size-6 text-petrol-600" strokeWidth={1.6} /> مدیریت پیامک</h1>
          <p className="mt-1 text-sm text-slate-500">تنظیم و ارسال پیامک</p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5">
        {[
          { id: "settings" as const, label: "تنظیمات", icon: Settings2 },
          { id: "send" as const, label: "ارسال تست", icon: Send },
          { id: "history" as const, label: "تاریخچه", icon: History },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="size-3.5" strokeWidth={1.7} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && (
        <div className="space-y-4">
          {/* انتخاب ارائه‌دهنده فعال */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">ارائه‌دهنده فعال</h3>
            <select value={getActiveProvider()} onChange={e => updateSetting("active_provider", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
              {SMS_PROVIDERS.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
            <p className="mt-2 text-[11px] text-slate-500">این ارائه‌دهنده برای ارسال کد OTP و پیامک‌های سیستمی استفاده می‌شود.</p>
          </div>

          {/* تنظیمات ارائه‌دهنده فعال */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">تنظیمات {activeProvider.name}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeProvider.fields.map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{f.label}</label>
                  <input type={f.type === "password" ? "password" : "text"}
                    value={get(`${activeProvider.slug}.${f.key}`)}
                    onChange={e => updateSetting(`${activeProvider.slug}.${f.key}`, e.target.value)}
                    dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500" />
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <Save className="size-4" /> {saving ? "..." : "ذخیره تنظیمات"}
          </button>
        </div>
      )}

      {tab === "send" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-900">ارسال پیامک تست</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">شماره موبایل</label>
              <input type="text" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="09123456789" dir="ltr"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
            </div>
            <button onClick={sendTest} disabled={sending || !testPhone}
              className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              <Send className="size-4" /> {sending ? "در حال ارسال..." : "ارسال پیامک تست (OTP)"}
            </button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
          <History className="mx-auto mb-2 size-8 text-slate-300" strokeWidth={1.3} />
          تاریخچه پیامک‌ها به زودی اضافه می‌شود.
        </div>
      )}
    </div>
  );
}
