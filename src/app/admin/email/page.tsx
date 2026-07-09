"use client";

import { useState, useEffect } from "react";
import { Save, Mail, Send, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function EmailPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function get(key: string, fallback = ""): string { return settings[`email.${key}`] || fallback; }

  async function updateSetting(key: string, value: any) {
    setSettings(prev => ({ ...prev, [`email.${key}`]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("email."));
    let errors = 0;
    for (const key of keys) {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key], group: "email" }),
      });
      if (!(await res.json()).ok) errors++;
    }
    if (errors === 0) toast.success("✅ تنظیمات ایمیل ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  async function sendTest() {
    if (!testEmail.trim()) { toast.error("ایمیل مقصد را وارد کنید"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: testEmail.trim(), type: "email" }),
      });
      const data = await res.json();
      if (data.ok) toast.success("✅ ایمیل تست ارسال شد" + (data.devCode ? ` (کد: ${data.devCode})` : ""));
      else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در ارسال"); }
    setSending(false);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Mail className="size-6 text-petrol-600" strokeWidth={1.6} /> تنظیمات ایمیل</h1>
          <p className="mt-1 text-sm text-slate-500">پیکربندی SMTP برای ارسال ایمیل‌های سیستمی</p>
        </div>
        <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save className="size-4" /> {saving ? "..." : "ذخیره"}</button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">هاست SMTP</label>
          <input type="text" value={get("smtp.host")} onChange={e => updateSetting("smtp.host", e.target.value)} placeholder="smtp.gmail.com" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">پورت</label>
          <input type="text" value={get("smtp.port")} onChange={e => updateSetting("smtp.port", e.target.value)} placeholder="587" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">نام کاربری</label>
          <input type="text" value={get("smtp.user")} onChange={e => updateSetting("smtp.user", e.target.value)} placeholder="user@gmail.com" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">رمز عبور</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={get("smtp.pass")} onChange={e => updateSetting("smtp.pass", e.target.value)} placeholder="••••••••" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-petrol-500" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"><Eye className="size-4" /></button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">ایمیل فرستنده</label>
          <input type="text" value={get("smtp.from")} onChange={e => updateSetting("smtp.from", e.target.value)} placeholder="noreply@dornika.co" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
        </div>
      </div>

      {/* تست ایمیل */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-900">ارسال ایمیل تست</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">ایمیل مقصد</label>
            <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
          </div>
          <button onClick={sendTest} disabled={sending || !testEmail} className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <Send className="size-4" /> {sending ? "..." : "ارسال تست"}
          </button>
        </div>
      </div>
    </div>
  );
}
