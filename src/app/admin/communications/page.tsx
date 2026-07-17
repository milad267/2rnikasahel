"use client";

import { useState, useEffect } from "react";
import { Save, MessageSquare, Send, Mail, Phone, Settings2, HelpCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabKey = "sms" | "email";

const SMS_PROVIDERS = [
  { slug: "kavenegar", name: "کاوه‌نگار", site: "kavenegar.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "ghasedak", name: "قاصدک", site: "ghasedak.me", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "melipayamak", name: "ملی پیامک", site: "payamak-panel.com", fields: [{ key: "username", label: "نام کاربری", type: "text" }, { key: "password", label: "رمز عبور", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "farazsms", name: "فراز اس‌ام‌اس (ippanel)", site: "ippanel.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "smsir", name: "SMS.ir", site: "sms.ir", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "raygansms", name: "رایگان اس‌ام‌اس", site: "raygansms.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "asanak", name: "آسانک", site: "asanak.ir", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "parandsms", name: "پرند اس‌ام‌اس", site: "parandsms.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "niazmandi", name: "نیازمندی", site: "niazmandi.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "sabapayamak", name: "صبا پیامک", site: "sabapayamak.com", fields: [{ key: "username", label: "نام کاربری", type: "text" }, { key: "password", label: "رمز عبور", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "payamresan", name: "پیام رسان", site: "payamresan.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "amootsms", name: "آموت اس‌ام‌اس", site: "amootsms.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "fanap", name: "فناپ (پیامک)", site: "fanap.ir", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "sentsms", name: "Sent SMS", site: "sentsms.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "smscall", name: "SMS Call", site: "smscall.ir", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "postgah", name: "پستگاه", site: "postgah.com", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
  { slug: "smsfa", name: "SMSFA", site: "smsfa.net", fields: [{ key: "api_key", label: "API Key", type: "password" }, { key: "sender", label: "شماره فرستنده", type: "text" }] },
];

export default function CommunicationsPage() {
  const [tab, setTab] = useState<TabKey>("sms");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function get(prefix: string, key: string, fallback = ""): string { return settings[`${prefix}.${key}`] || fallback; }
  function getActiveProvider(): string { return settings["sms.active_provider"] || "kavenegar"; }

  async function updateSetting(key: string, value: any) { setSettings(prev => ({ ...prev, [key]: value })); }

  async function saveAll() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("sms.") || k.startsWith("email."));
    let errors = 0;
    await Promise.all(keys.map(async (key) => {
      const group = key.startsWith("sms.") ? "sms" : "email";
      try {
        const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: settings[key], group }) });
        if (!(await res.json()).ok) errors++;
      } catch { errors++; }
    }));
    if (errors === 0) toast.success("✅ تنظیمات ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  async function sendTest() {
    if (tab === "sms") {
      if (!testPhone.trim()) { toast.error("شماره موبایل را وارد کنید"); return; }
      setSending(true);
      try {
        const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: testPhone.trim(), type: "phone" }) });
        const data = await res.json();
        if (data.ok) toast.success("✅ ارسال شد" + (data.devCode ? ` (کد: ${data.devCode})` : ""));
        else toast.error(data.error || "خطا");
      } catch { toast.error("خطا"); }
    } else {
      if (!testEmail.trim()) { toast.error("ایمیل مقصد را وارد کنید"); return; }
      setSending(true);
      try {
        const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: testEmail.trim(), type: "email" }) });
        const data = await res.json();
        if (data.ok) toast.success("✅ ارسال شد" + (data.devCode ? ` (کد: ${data.devCode})` : ""));
        else toast.error(data.error || "خطا");
      } catch { toast.error("خطا"); }
    }
    setSending(false);
  }

  async function sendBroadcast() {
    if (!broadcastMessage.trim()) { toast.error("متن پیام را وارد کنید"); return; }

    const confirmed = window.confirm(
      `آیا از ارسال پیامک همگانی به همه کاربران اطمینان دارید؟\n\nمتن: "${broadcastMessage.trim()}"`
    );
    if (!confirmed) return;

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/admin/communications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMessage.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setBroadcastResult(data.data);
        toast.success(`✅ پیامک همگانی ارسال شد (${data.data.success} موفق، ${data.data.failed} ناموفق از ${data.data.total})`);
      } else {
        toast.error(data.error || "خطا در ارسال همگانی");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    }
    setBroadcasting(false);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  const activeSmsProvider = SMS_PROVIDERS.find(p => p.slug === getActiveProvider()) || SMS_PROVIDERS[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <MessageSquare className="size-6 text-petrol-600" strokeWidth={1.6} />
            ارتباطات
          </h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت پیامک و ایمیل فروشگاه</p>
        </div>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Save className="size-4" /> {saving ? "..." : "ذخیره همه"}
        </button>
      </div>

      {/* تب‌های اصلی */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5">
        {[
          { key: "sms" as TabKey, label: "پنل پیامک", icon: MessageSquare },
          { key: "email" as TabKey, label: "پنل ایمیل", icon: Mail },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-semibold transition-all flex-1 justify-center",
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}>
              <Icon className="size-3.5" strokeWidth={1.7} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── تب پیامک ─── */}
      {tab === "sms" && (
        <div className="space-y-4">
          {/* انتخاب ارائه‌دهنده */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-900">ارائه‌دهنده پیامک</h2>
            <select value={getActiveProvider()} onChange={e => updateSetting("sms.active_provider", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
              {SMS_PROVIDERS.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
            <p className="mt-2 text-[11px] text-slate-500">این ارائه‌دهنده برای ارسال کد OTP و اعلان‌های پیامکی استفاده می‌شود.</p>
          </div>

          {/* تنظیمات ارائه‌دهنده فعال */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">تنظیمات {activeSmsProvider.name}</h3>
              <a href={`https://${activeSmsProvider.site}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-[10px] font-medium text-petrol-600 hover:underline">
                {activeSmsProvider.site} <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeSmsProvider.fields.map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{f.label}</label>
                  <input type={f.type === "password" ? "password" : "text"}
                    value={get("sms", `${activeSmsProvider.slug}.${f.key}`)}
                    onChange={e => updateSetting(`sms.${activeSmsProvider.slug}.${f.key}`, e.target.value)}
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500" />
                </div>
              ))}
            </div>
          </div>

          {/* ارسال تست */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">ارسال پیامک تست (OTP)</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-700">شماره موبایل</label>
                <input type="text" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="09123456789" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <button onClick={sendTest} disabled={sending || !testPhone}
                className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                <Send className="size-4" /> {sending ? "..." : "ارسال تست"}
              </button>
            </div>
          </div>

          {/* ارسال همگانی */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h3 className="mb-1 text-sm font-bold text-slate-900">📣 ارسال همگانی به کاربران</h3>
            <p className="mb-3 text-xs text-slate-500">پیامک به تمام کاربرانی که شماره موبایل ثبت کرده‌اند ارسال می‌شود</p>
            <div className="space-y-3">
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="متن پیام همگانی..."
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{broadcastMessage.length}/500</span>
                <button
                  onClick={sendBroadcast}
                  disabled={broadcasting || !broadcastMessage.trim()}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-amber-700 transition-colors"
                >
                  {broadcasting ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      در حال ارسال...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" /> ارسال برای همه کاربران
                    </>
                  )}
                </button>
              </div>
              {broadcastResult && (
                <div className="rounded-xl bg-white p-3 text-xs space-y-1">
                  <p className="font-semibold text-slate-900">✅ نتیجه ارسال همگانی:</p>
                  <p className="text-slate-600">کل: {broadcastResult.total} کاربر</p>
                  <p className="text-emerald-600">موفق: {broadcastResult.success}</p>
                  {broadcastResult.failed > 0 && (
                    <p className="text-red-500">ناموفق: {broadcastResult.failed}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* راهنما */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900">
            <p className="font-semibold mb-1">📖 راهنمای راه‌اندازی پیامک:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>یک ارائه‌دهنده پیامک از لیست بالا انتخاب کنید.</li>
              <li>در سایت ارائه‌دهنده ثبت‌نام کنید و API Key دریافت کنید.</li>
              <li>اطلاعات را در فیلدهای بالا وارد کنید.</li>
              <li>با دکمه "ارسال تست" صحت تنظیمات را بررسی کنید.</li>
              <li>پس از تأیید، دکمه "ذخیره همه" را بزنید.</li>
            </ol>
            <p className="mt-2 text-blue-700">💡 بیشتر ارائه‌دهنده‌ها دارای پنل رایگان تست هستند.</p>
          </div>
        </div>
      )}

      {/* ─── تب ایمیل ─── */}
      {tab === "email" && (
        <div className="space-y-4">
          {/* SMTP */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-900">تنظیمات SMTP</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">هاست SMTP</label>
                <input type="text" value={get("email", "smtp.host")}
                  onChange={e => updateSetting("email.smtp.host", e.target.value)} placeholder="smtp.gmail.com" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">مثال: smtp.gmail.com, mail.yourdomain.com</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">پورت</label>
                <input type="text" value={get("email", "smtp.port")}
                  onChange={e => updateSetting("email.smtp.port", e.target.value)} placeholder="587" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">پورت‌های رایج: 587 (TLS), 465 (SSL), 25</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">نام کاربری</label>
                <input type="text" value={get("email", "smtp.user")}
                  onChange={e => updateSetting("email.smtp.user", e.target.value)} placeholder="user@gmail.com" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">رمز عبور</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={get("email", "smtp.pass")}
                    onChange={e => updateSetting("email.smtp.pass", e.target.value)} placeholder="••••••••" dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-petrol-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <Eye className="size-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">ایمیل فرستنده</label>
                <input type="text" value={get("email", "smtp.from")}
                  onChange={e => updateSetting("email.smtp.from", e.target.value)} placeholder="noreply@dornika.co" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">رمز App (Gmail)</label>
                <input type="text" value={get("email", "gmail.app_password")}
                  onChange={e => updateSetting("email.gmail.app_password", e.target.value)} placeholder="xxxx xxxx xxxx xxxx" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">برای Gmail باید رمز App جداگانه بسازید</p>
              </div>
            </div>
          </div>

          {/* ایمیل خودمیزبان (Self-hosted) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <h2 className="mb-1 text-sm font-bold text-slate-900">📧 ایمیل خودمیزبان (سرور اختصاصی)</h2>
            <p className="mb-4 text-xs text-slate-500">از آنجایی که پروژه روی سرور خودتان نصب می‌شود، می‌توانید از سرویس SMTP محلی استفاده کنید.</p>
            
            <div className="space-y-4">
              {/* گزینه sendmail (پیش‌فرض لینوکس) */}
              <div className="rounded-xl border border-emerald-200 bg-white p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="mailer" checked={get("email", "mailer") !== "smtp"}
                    onChange={() => updateSetting("email.mailer", "sendmail")}
                    className="mt-0.5 size-4 accent-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Sendmail (محلی)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">ارسال ایمیل از طریق sendmail یا msmtp نصب شده روی سرور — نیازی به اطلاعات SMTP ندارد</p>
                    <p className="text-[10px] text-slate-400 mt-1">روش پیشنهادی برای سرورهای لینوکسی. کافیست sendmail روی سرور نصب باشد.</p>
                  </div>
                </label>
              </div>

              {/* گزینه SMTP خارجی */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="mailer" checked={get("email", "mailer") === "smtp"}
                    onChange={() => updateSetting("email.mailer", "smtp")}
                    className="mt-0.5 size-4 accent-petrol-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">SMTP (Gmail / Yandex / اختصاصی)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">ارسال از طریق سرویس SMTP خارجی مثل Gmail, Yandex یا SMTP هاست</p>
                  </div>
                </label>
              </div>

              {/* راهنمای نصب sendmail */}
              <details className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="text-xs font-bold text-slate-700 cursor-pointer">📖 راهنمای راه‌اندازی ایمیل روی سرور اختصاصی</summary>
                <div className="mt-3 space-y-3 text-xs text-slate-600 leading-6">
                  <div>
                    <p className="font-semibold text-slate-800">روش ۱: نصب sendmail (ساده)</p>
                    <code className="block bg-slate-100 p-2 rounded-lg mt-1 text-[11px] font-mono">
                      # اوبونتو/دبیان:<br/>
                      sudo apt-get install sendmail -y<br/>
                      sudo sendmailconfig<br/><br/>
                      # CentOS/RHEL:<br/>
                      sudo yum install sendmail -y<br/>
                      sudo systemctl start sendmail
                    </code>
                    <p className="mt-1">نودمیلر به صورت خودکار sendmail را شناسایی می‌کند. فقط کافیست گزینه sendmail را انتخاب کنید.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">روش ۲: نصب msmtp (سبک)</p>
                    <code className="block bg-slate-100 p-2 rounded-lg mt-1 text-[11px] font-mono">
                      sudo apt-get install msmtp msmtp-mta -y<br/><br/>
                      # تنظیمات: /etc/msmtprc<br/>
                      defaults<br/>
                      account default<br/>
                      host localhost<br/>
                      port 25
                    </code>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">روش ۳: SMTP از طریق Gmail (برای تست)</p>
                    <code className="block bg-slate-100 p-2 rounded-lg mt-1 text-[11px] font-mono">
                      host: smtp.gmail.com<br/>
                      port: 587<br/>
                      user: your-email@gmail.com<br/>
                      pass: (App Password ۱۶ رقمی)<br/>
                      from: your-email@gmail.com
                    </code>
                    <p className="mt-1 text-amber-700">⚠️ در Gmail باید احراز هویت دو مرحله‌ای فعال باشد و App Password ساخته شود.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">روش ۴: پست‌الکترونیکی سرور (Mailu/Mailcow)</p>
                    <p>برای راه‌اندازی کامل ایمیل روی سرور خودتان (شامل دریافت ایمیل)، می‌توانید از پکیج‌های متن‌باز مثل <strong>Mailu</strong>، <strong>Mailcow</strong> یا <strong>iRedMail</strong> استفاده کنید که یک سرور ایمیل کامل روی سرور شما راه می‌اندازند.</p>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* ارسال تست */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">ارسال ایمیل تست</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-700">ایمیل مقصد</label>
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <button onClick={sendTest} disabled={sending || !testEmail}
                className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                <Send className="size-4" /> {sending ? "..." : "ارسال تست"}
              </button>
            </div>
          </div>

          {/* راهنما */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900">
            <p className="font-semibold mb-1">📖 راهنمای راه‌اندازی ایمیل:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Gmail:</strong>先在 Google Account → Security → 2-Step Verification → App Passwords یک رمز App بسازید. host=smtp.gmail.com, port=587, user=your-email, pass=رمز App</li>
              <li><strong>Yandex:</strong> host=smtp.yandex.com, port=587, user=your-email, pass=your-password</li>
              <li><strong>Outlook/Hotmail:</strong> host=smtp-mail.outlook.com, port=587</li>
              <li><strong>سرویس اختصاصی:</strong> اطلاعات SMTP دریافتی از هاست خود را وارد کنید.</li>
              <li>برای Gmail حتماً از <strong>App Password</strong> استفاده کنید (نه رمز عبور خود).</li>
            </ol>
            <p className="mt-2 text-blue-700">💡 اگر از Gmail استفاده می‌کنید، ورود دو مرحله‌ای باید فعال باشد تا بتوانید App Password بسازید.</p>
          </div>
        </div>
      )}
    </div>
  );
}
