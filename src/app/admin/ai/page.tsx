"use client";

import { useState, useEffect } from "react";
import { Save, Sparkles, TestTube, Check, X, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";

type AiTask = "chat" | "seo" | "vision";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo"] },
  { value: "groq", label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"], baseUrl: "https://api.groq.com/openai/v1" },
  { value: "gemini", label: "Google Gemini", models: ["gemini-2.0-flash", "gemini-1.5-pro"], baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/" },
  { value: "custom", label: "API سفارشی", models: ["custom"] },
];

const TASKS: { id: AiTask; label: string; desc: string }[] = [
  { id: "chat", label: "دستیار چت", desc: "مدل اصلی برای دستیار هوشمند ادمین" },
  { id: "seo", label: "تولید محتوای SEO", desc: "برای نوشتن خودکار پست‌های بلاگ" },
  { id: "vision", label: "تحلیل تصویر", desc: "برای خواندن فاکتور و تصاویر" },
];

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  function getProvider(task: AiTask): string {
    return settings[`ai.${task}.provider`] || "openai";
  }

  function getApiKey(task: AiTask): string {
    return settings[`ai.${task}.api_key`] || "";
  }

  function getModel(task: AiTask): string {
    return settings[`ai.${task}.model`] || "";
  }

  function getBaseUrl(task: AiTask): string {
    return settings[`ai.${task}.base_url`] || "";
  }

  async function updateSetting(key: string, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("ai."));
    let errors = 0;
    for (const key of keys) {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key], group: "ai" }),
      });
      const data = await res.json();
      if (!data.ok) errors++;
    }
    if (errors === 0) toast.success("✅ تنظیمات هوش مصنوعی ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا در ذخیره`);
    setSaving(false);
  }

  async function testConnection(task: AiTask) {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "سلام! فقط بگو 'اتصال برقرار است' و هیچ توضیح اضافه‌ای نده." }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: data.response || "✅ اتصال با موفقیت برقرار شد" });
      } else {
        setTestResult({ ok: false, message: data.error || "❌ خطا در اتصال" });
      }
    } catch {
      setTestResult({ ok: false, message: "❌ خطا در ارتباط با سرور" });
    }
    setTesting(false);
  }

  function getDefaultModel(provider: string): string {
    const p = PROVIDERS.find(p => p.value === provider);
    return p?.models[0] || "gpt-4o-mini";
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Sparkles className="size-6 text-purple-600" strokeWidth={1.6} />
            مدیریت هوش مصنوعی
          </h1>
          <p className="mt-1 text-sm text-slate-500">تنظیم ارائه‌دهنده و کلید API برای هر وظیفه</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
        >
          <Save className="size-4" /> {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
      </div>

      {/* آموزش */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-5 shrink-0 text-purple-600" strokeWidth={1.5} />
          <div className="text-xs leading-6 text-purple-900">
            <p className="font-semibold">راهنمای سریع:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>برای شروع، یک ارائه‌دهنده (مثلاً <strong>OpenAI</strong> یا <strong>Groq</strong>) انتخاب کنید.</li>
              <li>کلید API را از سایت ارائه‌دهنده دریافت کنید و در فیلد مربوطه وارد کنید.</li>
              <li>Groq رایگان است و مدل <strong>llama-3.3-70b</strong> را پیشنهاد می‌دهد.</li>
              <li>بعد از ذخیره، دکمه "تست اتصال" را بزنید تا مطمئن شوید کار می‌کند.</li>
              <li>دستیار می‌تواند محصول بسازد، پست بلاگ بنویسد، اسلاید بسازد و گزارش فروش بدهد.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* تنظیمات برای هر وظیفه */}
      <div className="grid gap-5">
        {TASKS.map(task => {
          const provider = getProvider(task.id);
          const apiKey = getApiKey(task.id);
          const model = getModel(task.id) || getDefaultModel(provider);
          const baseUrl = getBaseUrl(task.id);
          const providers = PROVIDERS.map(p => ({
            ...p,
            baseUrl: baseUrl || p.baseUrl || "",
          }));

          return (
            <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{task.label}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">{task.desc}</p>
                </div>
                {testResult && (
                  <span className={`flex items-center gap-1 text-[10px] font-medium ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                    {testResult.ok ? <Check className="size-3" /> : <X className="size-3" />}
                    {testResult.ok ? "اتصال برقرار" : "خطا"}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Provider */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">ارائه‌دهنده</label>
                  <select
                    value={provider}
                    onChange={e => {
                      const newProvider = e.target.value;
                      updateSetting(`ai.${task.id}.provider`, newProvider);
                      updateSetting(`ai.${task.id}.model`, getDefaultModel(newProvider));
                      const p = PROVIDERS.find(p => p.value === newProvider);
                      if (p?.baseUrl) updateSetting(`ai.${task.id}.base_url`, p.baseUrl);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                  >
                    {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">مدل</label>
                  {provider === "custom" ? (
                    <input
                      value={model}
                      onChange={e => updateSetting(`ai.${task.id}.model`, e.target.value)}
                      placeholder="نام مدل را وارد کنید..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                  ) : (
                    <select
                      value={model}
                      onChange={e => updateSetting(`ai.${task.id}.model`, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    >
                      {(PROVIDERS.find(p => p.value === provider)?.models || []).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* API Key */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">کلید API</label>
                  <div className="relative">
                    <input
                      type={showKey[task.id] ? "text" : "password"}
                      value={apiKey}
                      onChange={e => updateSetting(`ai.${task.id}.api_key`, e.target.value)}
                      placeholder="sk-..." dir="ltr"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-purple-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey[task.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Base URL (فقط برای custom یا groq که auto-set شده) */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">Base URL (اختیاری)</label>
                  <input
                    value={baseUrl}
                    onChange={e => updateSetting(`ai.${task.id}.base_url`, e.target.value)}
                    placeholder="https://api.openai.com/v1" dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400 font-mono"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => testConnection(task.id)}
                  disabled={testing || !apiKey}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-40"
                >
                  <TestTube className="size-3.5" strokeWidth={1.7} />
                  {testing ? "در حال تست..." : "تست اتصال"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
