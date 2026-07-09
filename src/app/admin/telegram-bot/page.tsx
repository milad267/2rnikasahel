"use client";

import { useState, useEffect } from "react";
import { Save, Bot, Send, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function TelegramBotPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testChatId, setTestChatId] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function get(key: string, fallback = ""): string { return settings[`telegram.${key}`] || fallback; }

  async function updateSetting(key: string, value: any) {
    setSettings(prev => ({ ...prev, [`telegram.${key}`]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("telegram."));
    let errors = 0;
    for (const key of keys) {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key], group: "telegram" }),
      });
      if (!(await res.json()).ok) errors++;
    }
    if (errors === 0) toast.success("✅ تنظیمات ربات تلگرام ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  async function testBot() {
    const token = get("bot_token");
    if (!token) { toast.error("لطفاً ابتدا توکن ربات را وارد کنید"); return; }
    setTesting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ ربات @${data.result.username} متصل است`);
        updateSetting("bot_username", data.result.username);
      } else {
        toast.error(`❌ ${data.description || "خطا در اتصال"}`);
      }
    } catch { toast.error("❌ خطا در ارتباط با سرور تلگرام"); }
    setTesting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Bot className="size-6 text-petrol-600" strokeWidth={1.6} /> ربات تلگرام</h1>
          <p className="mt-1 text-sm text-slate-500">اتصال فروشگاه به ربات تلگرام</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">توکن ربات</label>
          <div className="relative">
            <input type={showToken ? "text" : "password"} value={get("bot_token")} onChange={e => updateSetting("bot_token", e.target.value)} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-petrol-500 font-mono" />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"><Eye className="size-4" /></button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">نام کاربری ربات</label>
          <input type="text" value={get("bot_username")} placeholder="پس از تست اتصال پر می‌شود" dir="ltr" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500" readOnly />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Chat ID پیش‌فرض</label>
          <input type="text" value={get("default_chat_id")} onChange={e => updateSetting("default_chat_id", e.target.value)} placeholder="123456789" dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">وضعیت</label>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <span className={`size-2 rounded-full ${get("bot_token") ? "bg-yellow-400" : "bg-red-400"}`} />
            <span className="text-xs text-slate-600">{get("bot_token") ? "توکن ذخیره شده - برای تست اتصال کلیک کنید" : "توکن وارد نشده"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={testBot} disabled={testing || !get("bot_token")} className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Send className="size-4" /> {testing ? "در حال تست..." : "تست اتصال"}
        </button>
        <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Save className="size-4" /> {saving ? "..." : "ذخیره"}
        </button>
      </div>

      {/* راهنما */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900">
        <p className="font-semibold mb-1">📖 راهنما:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>ربات خود را از <a href="https://t.me/BotFather" target="_blank" className="underline">@BotFather</a> در تلگرام بسازید.</li>
          <li>توکن دریافتی را در فیلد بالا وارد کنید.</li>
          <li>روی "تست اتصال" کلیک کنید تا از صحت توکن مطمئن شوید.</li>
          <li>برای دریافت Chat ID خود، یک پیام به ربات بفرستید و سپس آدرس <code className="bg-blue-100 px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> را در مرورگر باز کنید.</li>
        </ol>
      </div>
    </div>
  );
}
