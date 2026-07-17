"use client";

import { useState, useEffect } from "react";
import {
  Save, Bot, Send, Eye, EyeOff, RefreshCw, Webhook, Bell, MessageSquare,
  Settings, ListChecks, Plug, History, Inbox, Monitor, Play,
  Shield, Server, Zap, CheckCircle, XCircle, Globe, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabKey = "connection" | "notifications" | "messages" | "commands" | "logs";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "connection", label: "اتصال", icon: Monitor },
  { key: "notifications", label: "اعلان‌ها", icon: Bell },
  { key: "messages", label: "متن پیام‌ها", icon: MessageSquare },
  { key: "commands", label: "دستورات", icon: ListChecks },
  { key: "logs", label: "تاریخچه", icon: History },
];

const NOTIFICATION_EVENTS = [
  { key: "notify_new_order", label: "🛒 سفارش جدید", desc: "هنگام ثبت سفارش جدید" },
  { key: "notify_payment", label: "✅ پرداخت موفق", desc: "پس از تأیید پرداخت" },
  { key: "notify_new_user", label: "👤 ثبت‌نام کاربر", desc: "هنگام ثبت‌نام کاربر جدید" },
  { key: "notify_contact", label: "✉️ پیام تماس", desc: "هنگام ارسال پیام جدید از فرم تماس" },
  { key: "notify_status_change", label: "📦 تغییر وضعیت سفارش", desc: "هنگام تغییر وضعیت سفارش توسط ادمین" },
  { key: "notify_low_stock", label: "⚠️ موجودی کم", desc: "هشدار کاهش موجودی محصول" },
  { key: "notify_register", label: "🎉 ثبت سفارش جدید", desc: "اعلان ثبت سفارش به مدیر" },
  { key: "notify_daily_report", label: "📊 گزارش روزانه", desc: "ارسال خودکار گزارش فروش روزانه" },
];

export default function TelegramBotPage() {
  const [tab, setTab] = useState<TabKey>("connection");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testMessageStatus, setTestMessageStatus] = useState<string | null>(null);
  const [log, setLog] = useState<{ time: string; msg: string }[]>(([]));

  // VPN/Proxy state
  const [vpnTesting, setVpnTesting] = useState(false);
  const [vpnTestResult, setVpnTestResult] = useState<{ reachable: boolean; latency: number; message: string } | null>(null);

  // Proxy helpers
  function getProxy(key: string, fallback = ""): string { return settings[`proxy.${key}`] ?? fallback; }
  function getBoolProxy(key: string): boolean { return getProxy(key) === "true"; }
  async function updateProxySetting(key: string, value: any) { setSettings(prev => ({ ...prev, [`proxy.${key}`]: value })); }

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
    // اسکرول به پایین لاگ
  }, []);

  function get(key: string, fallback = ""): string { return settings[`telegram.${key}`] ?? fallback; }
  function getBool(key: string): boolean { return get(key) === "true"; }
  async function updateSetting(key: string, value: any) { setSettings(prev => ({ ...prev, [`telegram.${key}`]: value })); }

  function addLog(msg: string) {
    const now = new Date().toLocaleTimeString("fa-IR");
    setLog(prev => [{ time: now, msg }, ...prev].slice(0, 50));
  }

  async function telegramAction(action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/admin/telegram/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "پاسخ سرور نامعتبر بود" }));
    if (!response.ok || !data.ok) throw new Error(data.error || "عملیات ناموفق بود");
    return data;
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("telegram.") || k.startsWith("proxy."));
    let errors = 0;
    await Promise.all(keys.map(async (key) => {
      try {
        const group = key.startsWith("proxy.") ? "proxy" : "telegram";
        const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: settings[key], group }) });
        if (!(await res.json()).ok) errors++;
      } catch { errors++; }
    }));
    if (errors === 0) { toast.success("✅ ذخیره شد"); addLog("تنظیمات ذخیره شد"); }
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  async function testBot() {
    const token = get("bot_token");
    if (!token) { toast.error("توکن را وارد کنید"); return; }
    setTesting(true);
    try {
      const data = await telegramAction("test");
      toast.success(`✅ @${data.username} متصل است`);
      updateSetting("bot_username", data.username);
      addLog(`اتصال برقرار شد: @${data.username}`);
    } catch (error) { toast.error(`❌ ${(error as Error).message}`); }
    setTesting(false);
  }

  async function setupWebhook() {
    const token = get("bot_token");
    if (!token) return;
    setSettingWebhook(true);
    try {
      const baseUrl = get("webhook_url") || window.location.origin.replace(":3000", "") + "/api/telegram/webhook";
      const data = await telegramAction("setup-webhook", { url: baseUrl });
      toast.success("✅ وب‌هوک امن تنظیم شد");
      updateSetting("webhook_url", data.url);
      updateSetting("webhook_info", JSON.stringify(data.info || {}));
      addLog(`وب‌هوک تنظیم شد: ${data.url}`);
    } catch (error) { toast.error(`❌ ${(error as Error).message}`); }
    setSettingWebhook(false);
  }

  async function removeWebhook() {
    const token = get("bot_token");
    if (!token) return;
    try {
      await telegramAction("remove-webhook");
      toast.success("✅ وب‌هوک حذف شد");
      updateSetting("webhook_url", ""); updateSetting("webhook_info", "");
      addLog("وب‌هوک حذف شد");
    } catch (error) { toast.error(`❌ ${(error as Error).message}`); }
  }

  async function sendTestMessage() {
    const token = get("bot_token"); const chatId = get("default_chat_id");
    if (!token || !chatId) { toast.error("توکن و Chat ID را وارد کنید"); return; }
    try {
      await telegramAction("send-test");
      toast.success("✅ ارسال شد"); setTestMessageStatus("sent"); addLog(`پیام تست به ${chatId} ارسال شد`);
    } catch (error) { toast.error(`❌ ${(error as Error).message}`); setTestMessageStatus("failed"); }
  }

  async function testVpnConnection() {
    const link = getProxy("v2ray_link");
    const host = getProxy("host");
    const port = getProxy("port");
    if (!link && !host) { toast.error("لطفاً لینک V2Ray یا هاست و پورت پروکسی را وارد کنید"); return; }
    setVpnTesting(true);
    setVpnTestResult(null);
    try {
      const res = await fetch("/api/admin/instagram/vpn-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: link || undefined, host: host || undefined, port: port ? Number(port) : undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setVpnTestResult({ reachable: data.reachable, latency: data.latency, message: data.message });
        if (data.reachable) { toast.success("✅ اتصال VPN با موفقیت برقرار شد"); addLog(`VPN متصل شد (${data.latency}ms)`); }
        else { toast.error("❌ اتصال VPN برقرار نشد"); addLog("VPN قطع است"); }
      } else {
        toast.error(data.error || "خطا در تست VPN");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور برای تست VPN");
    }
    setVpnTesting(false);
  }

  async function setBotCommands() {
    const token = get("bot_token");
    if (!token) { toast.error("توکن را وارد کنید"); return; }
    try {
      await telegramAction("set-commands");
      toast.success("✅ دستورات تنظیم شدند"); addLog("دستورات ربات به‌روزرسانی شد");
    } catch (error) { toast.error(`❌ ${(error as Error).message}`); }
  }

  const webhookInfo = (() => { try { return JSON.parse(get("webhook_info")); } catch { return null; } })();

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Bot className="size-6 text-petrol-600" strokeWidth={1.6} />
            ربات تلگرام
          </h1>
          <p className="mt-1 text-sm text-slate-500">اتصال فروشگاه به ربات تلگرام برای اطلاع‌رسانی و مدیریت</p>
        </div>
        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Save className="size-4" /> {saving ? "..." : "ذخیره همه"}
        </button>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all",
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}>
              <Icon className="size-3.5" strokeWidth={1.7} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── تب اتصال ─── */}
      {tab === "connection" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Settings className="size-4 text-petrol-600" /> تنظیمات پایه
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">توکن ربات</label>
                <div className="relative">
                  <input type={showToken ? "text" : "password"} value={get("bot_token")}
                    onChange={e => updateSetting("bot_token", e.target.value)}
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-petrol-500 font-mono" />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">نام کاربری ربات</label>
                <input type="text" value={get("bot_username")} placeholder="پس از تست پر می‌شود" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500" readOnly />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Chat ID پیش‌فرض</label>
                <input type="text" value={get("default_chat_id")}
                  onChange={e => updateSetting("default_chat_id", e.target.value)} placeholder="123456789" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">وضعیت</label>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3">
                  <span className={`size-2 rounded-full ${get("bot_username") ? "bg-green-400" : get("bot_token") ? "bg-yellow-400" : "bg-red-400"}`} />
                  <span className="text-xs text-slate-600">
                    {get("bot_username") ? `@${get("bot_username")}` : get("bot_token") ? "توکن ذخیره شده" : "توکن وارد نشده"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={testBot} disabled={testing || !get("bot_token")}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 disabled:opacity-50">
                <RefreshCw className={`size-4 ${testing ? "animate-spin" : ""}`} /> {testing ? "..." : "تست اتصال"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Webhook className="size-4 text-petrol-600" /> Webhook
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">آدرس Webhook</label>
                <input type="text" value={get("webhook_url")}
                  onChange={e => updateSetting("webhook_url", e.target.value)}
                  placeholder="https://example.com/api/telegram/webhook" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">وضعیت</label>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3">
                  <span className={`size-2 rounded-full ${webhookInfo?.url ? "bg-green-400" : "bg-slate-300"}`} />
                  <span className="text-xs text-slate-600">
                    {webhookInfo?.url ? `فعال (${webhookInfo.pending_update_count || 0} در انتظار)` : "تنظیم نشده"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={setupWebhook} disabled={settingWebhook || !get("bot_token")}
                className="flex items-center gap-2 rounded-xl bg-petrol-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                <Plug className="size-4" /> {settingWebhook ? "..." : "تنظیم Webhook"}
              </button>
              <button onClick={removeWebhook} disabled={!webhookInfo?.url}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-30">
                حذف Webhook
              </button>
            </div>
          </section>

          {/* ─── VPN / Proxy ─── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Shield className="size-4 text-petrol-600" /> VPN و پروکسی اشتراکی
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              تنظیمات پروکسی برای اتصال به تلگرام (و اینستاگرام) در ایران. کافیست یکبار تنظیم کنید.
            </p>

            {/* Enable Proxy Toggle */}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <span className="text-xs font-semibold text-slate-700">فعال کردن پروکسی</span>
                <p className="text-[10px] text-slate-400">درخواست‌های تلگرام از طریق پروکسی ارسال شوند</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={getBoolProxy("enabled")}
                  onChange={(e) => updateProxySetting("enabled", e.target.checked ? "true" : "false")}
                  className="peer size-4 accent-petrol-600" />
                <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-petrol-600 peer-checked:after:translate-x-full" />
              </label>
            </div>

            {/* Proxy Type */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">نوع پروکسی / VPN</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "http", label: "HTTP", icon: Globe },
                  { value: "socks5", label: "SOCKS5", icon: Server },
                  { value: "v2ray", label: "V2Ray", icon: Shield },
                  { value: "custom", label: "سفارشی", icon: Settings },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => updateProxySetting("type", opt.value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all",
                        getProxy("type", "http") === opt.value
                          ? "border-petrol-500 bg-petrol-50 text-petrol-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300",
                      )}>
                      <Icon className="size-3.5" /> {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* V2Ray Link */}
            {getProxy("type", "http") === "v2ray" && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">لینک V2Ray</label>
                <div className="flex gap-2">
                  <input type="text" value={getProxy("v2ray_link")}
                    onChange={(e) => updateProxySetting("v2ray_link", e.target.value)}
                    placeholder="vless://... یا vmess://... یا trojan://... یا ss://..." dir="ltr"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                  <button onClick={testVpnConnection} disabled={vpnTesting}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                    {vpnTesting ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                    تست پینگ
                  </button>
                </div>
                {vpnTestResult && (
                  <div className={cn(
                    "mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium",
                    vpnTestResult.reachable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
                  )}>
                    {vpnTestResult.reachable ? <CheckCircle className="size-3.5" /> : <XCircle className="size-3.5" />}
                    <span dir="ltr">{vpnTestResult.message}</span>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-slate-400">لینک کانفیگ V2Ray را وارد کنید. برای استفاده نیاز به نرم‌افزار V2Ray روی سرور دارید.</p>
              </div>
            )}

            {/* HTTP / SOCKS5 Config */}
            {(getProxy("type", "http") === "http" || getProxy("type", "http") === "socks5") && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">هاست</label>
                  <input type="text" value={getProxy("host")}
                    onChange={(e) => updateProxySetting("host", e.target.value)}
                    placeholder="example.com" dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">پورت</label>
                  <input type="number" value={getProxy("port")}
                    onChange={(e) => updateProxySetting("port", e.target.value)}
                    placeholder="1080" dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">نام کاربری (اختیاری)</label>
                  <input type="text" value={getProxy("username")}
                    onChange={(e) => updateProxySetting("username", e.target.value)}
                    placeholder="username"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">رمز عبور (اختیاری)</label>
                  <input type="password" value={getProxy("password")}
                    onChange={(e) => updateProxySetting("password", e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                </div>
                <div className="sm:col-span-2">
                  <button onClick={testVpnConnection} disabled={vpnTesting}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                    {vpnTesting ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                    تست اتصال پروکسی
                  </button>
                  {vpnTestResult && (
                    <span className={cn(
                      "mr-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                      vpnTestResult.reachable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
                    )}>
                      {vpnTestResult.reachable ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                      {vpnTestResult.reachable ? `${vpnTestResult.latency}ms` : "قطع"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Custom Proxy Config */}
            {getProxy("type", "http") === "custom" && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">تنظیمات سفارشی پروکسی</label>
                <p className="mb-2 text-[10px] text-slate-400">
                  آدرس کامل پروکسی را وارد کنید. مثال: <code dir="ltr" className="text-petrol-600">http://user:pass@host:port</code> یا <code dir="ltr" className="text-petrol-600">socks5://host:port</code>
                </p>
                <div className="flex gap-2">
                  <input type="text" value={getProxy("custom_url")}
                    onChange={(e) => updateProxySetting("custom_url", e.target.value)}
                    placeholder="http://user:pass@host:port" dir="ltr"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                  <button onClick={testVpnConnection} disabled={vpnTesting}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                    {vpnTesting ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                    تست
                  </button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="rounded-xl bg-slate-50 p-3 text-[10px] text-slate-500 leading-relaxed">
              <p className="flex items-center gap-1"><Shield className="size-3 text-petrol-600" /> این تنظیمات برای <strong>همه سرویس‌ها</strong> (ربات تلگرام و اکانت‌های اینستاگرام) استفاده می‌شود.</p>
              <p className="mt-1">برای V2Ray، ابتدا نرم‌افزار V2Ray را روی سرور نصب کنید تا یک پروکسی محلی (مثلاً SOCKS5 روی پورت ۱۰۸۰) ایجاد کند.</p>
            </div>
          </section>
        </div>
      )}

      {/* ─── تب اعلان‌ها ─── */}
      {tab === "notifications" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-slate-800">اعلان‌ها</h2>
          <p className="mb-4 text-xs text-slate-500">انتخاب کنید ربات در چه مواردی به شما پیام دهد</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {NOTIFICATION_EVENTS.map(ev => (
              <label key={ev.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-100 has-[:checked]:border-petrol-200 has-[:checked]:bg-petrol-50/50">
                <input type="checkbox" checked={getBool(ev.key)}
                  onChange={e => updateSetting(ev.key, e.target.checked ? "true" : "false")}
                  className="mt-0.5 size-4 accent-petrol-600" />
                <div>
                  <span className="text-xs font-semibold text-slate-800">{ev.label}</span>
                  <p className="text-[10px] text-slate-500">{ev.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={sendTestMessage} disabled={!get("bot_token") || !get("default_chat_id")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              <Send className="size-4" /> ارسال پیام آزمایشی
            </button>
            {testMessageStatus === "sent" && <span className="text-xs text-emerald-600">✅ ارسال شد</span>}
            {testMessageStatus === "failed" && <span className="text-xs text-red-600">❌ ناموفق</span>}
          </div>
        </section>
      )}

      {/* ─── تب متن پیام‌ها ─── */}
      {tab === "messages" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-slate-800">متن پیام‌ها</h2>
          <p className="mb-4 text-xs text-slate-500">شخصی‌سازی پیام‌هایی که ربات ارسال می‌کند</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">پیام خوش‌آمدگویی</label>
              <textarea value={get("welcome_message")}
                onChange={e => updateSetting("welcome_message", e.target.value)} rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder={`سلام! به فروشگاه درنیکا ساحل خوش آمدید 🎉\nاز اینجا می‌توانید سفارش خود را پیگیری کنید.`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">قالب سفارش جدید</label>
                <textarea value={get("new_order_template")}
                  onChange={e => updateSetting("new_order_template", e.target.value)} rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono"
                  placeholder={`🆕 سفارش جدید {orderNumber}\n👤 {userName}\n💰 {totalAmount}`} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">قالب پرداخت موفق</label>
                <textarea value={get("payment_template")}
                  onChange={e => updateSetting("payment_template", e.target.value)} rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono"
                  placeholder={`✅ پرداخت سفارش {orderNumber} تایید شد\n💰 مبلغ: {amount}`} />
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <strong>متغیرهای قابل استفاده:</strong><br />
              <code className="text-[10px]">{`{orderNumber}`}</code> - شماره سفارش ·
              <code className="text-[10px]">{`{userName}`}</code> - نام کاربر ·
              <code className="text-[10px]">{`{totalAmount}`}</code> - مبلغ کل ·
              <code className="text-[10px]">{`{itemCount}`}</code> - تعداد کالا ·
              <code className="text-[10px]">{`{status}`}</code> - وضعیت
            </div>
          </div>
        </section>
      )}

      {/* ─── تب دستورات ─── */}
      {tab === "commands" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-slate-800">دستورات ربات</h2>
          <p className="mb-4 text-xs text-slate-500">دستوراتی که کاربران می‌توانند به ربات ارسال کنند</p>
          <div className="grid gap-2 text-xs">
            {[
              { cmd: "/start", desc: "شروع و پیام خوش‌آمدگویی" },
              { cmd: "/status", desc: "بررسی وضعیت فروشگاه (تعداد محصول، سفارش)" },
              { cmd: "/order {شماره}", desc: "پیگیری وضعیت سفارش با شماره" },
              { cmd: "/help", desc: "راهنما و دستورات موجود" },
              { cmd: "/contact", desc: "ارسال پیام به پشتیبانی" },
            ].map(c => (
              <div key={c.cmd} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <code className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-800">{c.cmd}</code>
                <span className="text-slate-600">{c.desc}</span>
              </div>
            ))}
          </div>
          <button onClick={setBotCommands} disabled={!get("bot_token")}
            className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            <Play className="size-4" /> فعال‌سازی خودکار دستورات در ربات
          </button>
        </section>
      )}

      {/* ─── تب تاریخچه ─── */}
      {tab === "logs" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">تاریخچه فعالیت ربات</h2>
            <button onClick={() => setLog([])} className="text-[10px] text-slate-400 hover:text-slate-600">پاک کردن</button>
          </div>
          {log.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <History className="size-8 mb-2 opacity-40" strokeWidth={1.3} />
              <p className="text-xs">هنوز فعالیتی ثبت نشده</p>
              <p className="text-[10px] mt-1">با انجام عملیات‌ها، تاریخچه اینجا نمایش داده می‌شود</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{entry.time}</span>
                  <span className="text-slate-700">{entry.msg}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
