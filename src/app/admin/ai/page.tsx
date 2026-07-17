"use client";

import { useState, useEffect } from "react";
import { Save, Settings, Sparkles, TestTube, Check, X, Eye, EyeOff, Info, MessageSquare, FileText, Image as ImageIcon, Code, Zap, ExternalLink, Key, Globe, ShieldCheck, Wrench, ChevronDown, Package, BarChart3, Headphones, Database, TrendingUp, ShoppingBag, Search, Warehouse, Users, Languages, Bot, BrainCircuit, SearchIcon, Crop, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { AiUsageDashboard } from "@/components/admin/AiUsageDashboard";
import { cn } from "@/lib/utils";

import SeoTools from "@/components/admin/SeoTools";

type AiTask = "router" | "chat" | "product" | "content" | "analytics" | "support" | "vision" | "image-editor" | "image-intelligence" | "blog-image" | "central-brain" | "data" | "marketing" | "orders" | "seo" | "inventory" | "customer" | "translator" | "code" | "telegram";

interface ProviderDef {
  value: string;
  label: string;
  models: string[];
  baseUrl?: string;
  free?: boolean;
  keyUrl?: string;
  note?: string;
}

const PROVIDERS: ProviderDef[] = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o1-mini", "o3-mini"], baseUrl: "https://api.openai.com/v1", keyUrl: "https://platform.openai.com/api-keys", note: "قوی‌ترین و پایدارترین گزینه" },
  { value: "groq", label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b"], baseUrl: "https://api.groq.com/openai/v1", free: true, keyUrl: "https://console.groq.com/keys", note: "رایگان و بسیار سریع" },
  { value: "gemini", label: "Google Gemini", models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-pro-exp-03-25"], baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", free: true, keyUrl: "https://aistudio.google.com/app/apikey", note: "رایگان با سقف بالا، عالی برای تصویر" },
  { value: "openrouter", label: "OpenRouter", models: ["openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "anthropic/claude-3-haiku", "google/gemini-2.0-flash-exp", "meta-llama/llama-3.3-70b-instruct", "cohere/command-r-plus", "mistralai/mistral-large"], baseUrl: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", note: "دسترسی به صدها مدل با یک کلید" },
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"], baseUrl: "https://api.deepseek.com/v1", keyUrl: "https://platform.deepseek.com/api_keys", note: "ارزان و قدرتمند" },
  { value: "together", label: "Together AI", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"], baseUrl: "https://api.together.xyz/v1", keyUrl: "https://api.together.xyz/settings/api-keys" },
  { value: "perplexity", label: "Perplexity", models: ["sonar-pro", "sonar", "sonar-deep-research"], baseUrl: "https://api.perplexity.ai", keyUrl: "https://www.perplexity.ai/settings/api", note: "قوی در جستجو و تحقیق" },
  { value: "mistral", label: "Mistral AI", models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest"], baseUrl: "https://api.mistral.ai/v1", keyUrl: "https://console.mistral.ai/api-keys/", note: "قوی در کدنویسی و منطق" },
  { value: "xai", label: "xAI (Grok)", models: ["grok-2-1212", "grok-beta"], baseUrl: "https://api.x.ai/v1", keyUrl: "https://console.x.ai", note: "مدل‌های Grok با API سازگار با OpenAI" },
  { value: "custom", label: "API سفارشی", models: ["custom"], note: "فقط سرویس‌های دارای فرمت OpenAI" },
];

const TASKS: { id: AiTask; label: string; desc: string; icon: typeof MessageSquare; recommend: string; recommendModels: string[]; adminOnly?: boolean }[] = [
  { id: "router", label: "🧠 مغز مرکزی (Router)", desc: "تحلیل intent، مسیریابی به agentهای تخصصی، هماهنگی و جمع‌آوری نتایج — این مغز کل سیستمه", icon: BrainCircuit, recommend: "openai", recommendModels: ["gpt-4o", "gpt-4o-mini", "deepseek-chat"] },
  { id: "chat", label: "💬 دستیار عمومی", desc: "دستیار fallback برای وقتی نقش خاصی تنظیم نشده — به سوالات عمومی پاسخ میده", icon: MessageSquare, recommend: "openai", recommendModels: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"] },
  { id: "product", label: "📦 مدیر محصول", desc: "ایجاد محصول با تنوع، بروزرسانی قیمت، مدیریت موجودی، واردات از Excel/PDF", icon: Package, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gpt-4o"], adminOnly: true },
  { id: "content", label: "✍️ تولید محتوا", desc: "نوشتن پست بلاگ، توضیحات محصول، محتوای سئو شده، متن لندینگ و اسلایدر", icon: FileText, recommend: "deepseek", recommendModels: ["deepseek-chat", "gpt-4o-mini", "claude-sonnet-4-20250514"], adminOnly: true },
  { id: "analytics", label: "📊 تحلیلگر داده", desc: "گزارش فروش، تحلیل روند، نمودار، KPI، پیش‌بینی و شناسایی محصولات پرفروش", icon: BarChart3, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gpt-4o"], adminOnly: true },
  { id: "support", label: "🎧 پشتیبانی مشتری", desc: "پاسخ به سوالات کاربران، راهنمایی خرید، پیگیری سفارش، اطلاعات تماس و ارسال", icon: Headphones, recommend: "groq", recommendModels: ["llama-3.3-70b-versatile", "gemini-2.0-flash", "gpt-4o-mini"] },
  { id: "vision", label: "👁 بینایی ماشین", desc: "خواندن فاکتور از عکس، تشخیص محصول، OCR فارسی، استخراج مشخصات از تصویر", icon: ImageIcon, recommend: "gemini", recommendModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gpt-4o"] },
  { id: "image-editor", label: "🎨 ویرایشگر تصویر", desc: "حذف پس‌زمینه، resize، optimize، فشرده‌سازی WebP، تغییر فرمت، بهبود کیفیت با AI", icon: ImageIcon, recommend: "openai", recommendModels: ["gpt-4o-mini", "gemini-2.0-flash", "deepseek-chat"] },
  { id: "image-intelligence", label: "🖼️ هوش تصویر پیشرفته", desc: "جستجوی تصویر واقعی محصول از اینترنت، حذف پس‌زمینه، حذف واترمارک، افزایش کیفیت، واترمارک لوگو", icon: SearchIcon, recommend: "openai", recommendModels: ["gpt-4o", "gpt-4o-mini", "deepseek-chat"], adminOnly: true },
  { id: "blog-image", label: "🖼️ تصویر بلاگ", desc: "جستجوی تصویر مرتبط با موضوع بلاگ از اینترنت، پردازش، بهینه‌سازی و اختصاص به پست بلاگ", icon: ImagePlus, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gpt-4o"], adminOnly: true },
  { id: "central-brain", label: "🧠 مغز مرکزی پیشرفته", desc: "برنامه‌ریزی وظایف پیچیده، تجزیه درخواست به مراحل، هماهنگی بین agentها، مدیریت حافظه و یادگیری", icon: BrainCircuit, recommend: "openai", recommendModels: ["gpt-4o", "gpt-4o-mini", "deepseek-chat"] },
  { id: "data", label: "🗄 مهندس داده", desc: "پردازش Excel, CSV, PDF. استخراج جداول، تشخیص ستون‌ها، اعتبارسنجی و تبدیل فرمت", icon: Database, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "claude-sonnet-4-20250514"], adminOnly: true },
  { id: "marketing", label: "📈 بازاریاب", desc: "تحلیل رقبا، پیشنهاد کمپین، استراتژی قیمت‌گذاری، ایده‌های تبلیغاتی و شبکه اجتماعی", icon: TrendingUp, recommend: "deepseek", recommendModels: ["deepseek-chat", "gpt-4o", "claude-sonnet-4-20250514"], adminOnly: true },
  { id: "orders", label: "🛒 مدیر سفارشات", desc: "پیگیری سفارش، تغییر وضعیت، تولید فاکتور، بررسی پرداخت، راهنمایی مرجوعی", icon: ShoppingBag, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gemini-2.0-flash"] },
  { id: "seo", label: "🔍 متخصص سئو", desc: "تحلیل کلمات کلیدی، بهینه‌سازی متا، scoring محتوا، تحقیق رقبا، ساختار URL", icon: Search, recommend: "deepseek", recommendModels: ["deepseek-chat", "gpt-4o-mini", "claude-sonnet-4-20250514"], adminOnly: true },
  { id: "inventory", label: "🏭 مدیر انبار", desc: "بررسی موجودی، هشدار کمبود، پیشنهاد سفارش مجدد، تحلیل گردش کالا، انبارگردانی", icon: Warehouse, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gpt-4o"], adminOnly: true },
  { id: "customer", label: "👥 تحلیلگر مشتری", desc: "تحلیل نیاز مشتری، پیشنهاد محصول شخصی‌سازی‌شده، کمک به انتخاب، cross-sell", icon: Users, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gemini-2.0-flash"] },
  { id: "translator", label: "🌐 مترجم فنی", desc: "ترجمه تخصصی اصطلاحات صنعتی، نام محصولات، مشخصات فنی، کاتالوگ و دیتاشیت", icon: Languages, recommend: "deepseek", recommendModels: ["deepseek-chat", "gpt-4o-mini", "gemini-2.0-flash"] },
  { id: "code", label: "💻 مهندس نرم‌افزار", desc: "تولید CSS, HTML, SQL, اسکریپت. رفع باگ ساده. فقط برای ادمین", icon: Code, recommend: "openai", recommendModels: ["gpt-4o", "claude-sonnet-4-20250514", "deepseek-chat"], adminOnly: true },
  { id: "telegram", label: "🤖 مدیر تلگرام", desc: "تنظیم webhook، قالب پیام، طراحی منوی ربات، عیب‌یابی ارسال", icon: Bot, recommend: "openai", recommendModels: ["gpt-4o-mini", "deepseek-chat", "gemini-2.0-flash"], adminOnly: true },
];

export default function AiSettingsPage() {
  const [activeView, setActiveView] = useState<"settings" | "usage" | "tools">("settings");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<AiTask[]>(["chat"]);
  const [testing, setTesting] = useState<AiTask | null>(null);
  const [customProviders, setCustomProviders] = useState<{ id: string; name: string; models: string[]; baseUrl: string }[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: "", baseUrl: "https://api.", models: "" });
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [agentUsage, setAgentUsage] = useState<Record<string, { requests: number; totalTokens: number; promptTokens: number; completionTokens: number; costUsd: number; errors: number; successRate: number; avgLatencyMs: number }>>({});
  const [usageLoading, setUsageLoading] = useState(true);

  // قفل اسکرول بدنه وقتی مودال باز است
  useEffect(() => {
    if (showCustomModal) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [showCustomModal]);

  // ─── Agent Permissions ───
  const [adminUsers, setAdminUsers] = useState<{ id: number; name: string; email: string; role: string }[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<number | "">("");
  const [agentPermissions, setAgentPermissions] = useState<Record<string, boolean>>({});
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, string> = {};
        data.data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
        const customRaw = map["ai.custom_providers"];
        if (customRaw) {
          try { const parsed = JSON.parse(customRaw); if (Array.isArray(parsed)) setCustomProviders(parsed); } catch {}
        }
        setSettings(map);
      }
    }).finally(() => setLoading(false));
    // بررسی query parameter برای تب ابزارها
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "tools") {
        setActiveView("tools");
      }
    }
    // لود کردن لیست ادمین‌ها
    fetch("/api/admin/admin-users").then(r => r.json()).then(data => {
      if (data.ok) setAdminUsers(data.admins || []);
    }).catch(() => {});
    // لود آمار مصرف توکن برای همه agentها
    fetchAgentUsage();
  }, []);

  async function fetchAgentUsage() {
    setUsageLoading(true);
    try {
      const res = await fetch("/api/admin/ai/usage?days=30");
      const data = await res.json();
      if (data.ok && data.agents) {
        const map: Record<string, any> = {};
        data.agents.forEach((a: any) => { map[a.agent] = a; });
        setAgentUsage(map);
      }
    } catch {}
    setUsageLoading(false);
  }

  // لود پرمیژن‌های agent برای ادمین انتخاب‌شده
  useEffect(() => {
    if (!selectedAdminId) { setAgentPermissions({}); return; }
    setPermLoading(true);
    fetch(`/api/admin/settings?key=ai.agent_permissions.${selectedAdminId}&group=ai`)
      .then(r => r.json()).then(data => {
        if (data.ok && data.data?.[0]?.value) {
          try {
            const raw = data.data[0].value;
            setAgentPermissions(typeof raw === "string" ? JSON.parse(raw) : raw);
          } catch { setAgentPermissions({}); }
        } else {
          // همه agentها به صورت پیش‌فرض فعال
          const defaults: Record<string, boolean> = {};
          TASKS.forEach(t => { defaults[t.id] = true; });
          setAgentPermissions(defaults);
        }
      }).catch(() => setAgentPermissions({}))
      .finally(() => setPermLoading(false));
  }, [selectedAdminId]);

  const getProvider = (task: AiTask) => settings[`ai.${task}.provider`] || "";
  const getApiKey = (task: AiTask) => settings[`ai.${task}.api_key`] || "";
  const getModel = (task: AiTask) => settings[`ai.${task}.model`] || "";
  const getBaseUrl = (task: AiTask) => settings[`ai.${task}.base_url`] || "";

  function updateSetting(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function getDefaultModel(provider: string): string {
    return PROVIDERS.find(p => p.value === provider)?.models[0] || "gpt-4o-mini";
  }

  function toggleExpand(task: AiTask) {
    setExpandedTasks(prev =>
      prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]
    );
  }

  function applyRecommended(task: AiTask, modelIndex = 0) {
    const t = TASKS.find(t => t.id === task)!;
    const p = PROVIDERS.find(p => p.value === t.recommend);
    updateSetting(`ai.${task}.provider`, t.recommend);
    updateSetting(`ai.${task}.model`, t.recommendModels[modelIndex] || t.recommendModels[0]);
    if (p?.baseUrl) updateSetting(`ai.${task}.base_url`, p.baseUrl);
    toast.success(`✅ ${p?.label} / ${t.recommendModels[modelIndex] || t.recommendModels[0]} اعمال شد`);
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("ai."));
    let errors = 0;
    for (const key of keys) {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key], group: "ai" }),
      });
      const data = await res.json();
      if (!data.ok) errors++;
    }
    try {
      await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ai.custom_providers", value: JSON.stringify(customProviders), group: "ai" }),
      });
    } catch {}
    if (errors === 0) toast.success("✅ تنظیمات هوش مصنوعی ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا در ذخیره`);
    setSaving(false);
  }

  async function testConnection(task: AiTask) {
    setTesting(task);
    setTestResults(prev => ({ ...prev, [task]: undefined as never }));
    try {
      const res = await fetch("/api/admin/ai/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task, provider: getProvider(task), apiKey: getApiKey(task),
          model: getModel(task) || getDefaultModel(getProvider(task)),
          baseUrl: getBaseUrl(task),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResults(prev => ({ ...prev, [task]: { ok: true, message: data.message } }));
        toast.success(data.message);
      } else {
        setTestResults(prev => ({ ...prev, [task]: { ok: false, message: data.error } }));
        toast.error(data.error);
      }
    } catch {
      setTestResults(prev => ({ ...prev, [task]: { ok: false, message: "خطا در ارتباط با سرور" } }));
      toast.error("خطا در ارتباط با سرور");
    }
    setTesting(null);
  }

  const tabClass = (tab: "settings" | "usage" | "tools") =>
    cn("rounded-lg px-4 py-2 text-xs transition-all",
      activeView === tab ? "bg-slate-900 font-semibold text-white" : "text-slate-500 hover:text-slate-900"
    );

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" /></div>;
  }

  if (activeView === "usage") {
    return <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Sparkles className="size-6 text-purple-600" />مدیریت هوش مصنوعی</h1><p className="mt-1 text-sm text-slate-500">مصرف Agentها، Providerها و Modelها</p></div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button onClick={() => setActiveView("settings")} className={tabClass("settings")}>تنظیمات</button>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">مصرف توکن</button>
          <button onClick={() => setActiveView("tools")} className={tabClass("tools")}>🔍 ابزارهای سئو</button>
        </div>
      </div>
      <AiUsageDashboard />
    </div>;
  }

  if (activeView === "tools") {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <Search className="size-6 text-purple-600" strokeWidth={1.6} /> ابزارهای هوشمند سئو
            </h1>
            <p className="mt-1 text-sm text-slate-500">تحلیل رقبا، کلمات کلیدی و تولید محتوای بهینه با هوش مصنوعی</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={() => setActiveView("settings")} className={tabClass("settings")}>تنظیمات Agentها</button>
            <button onClick={() => setActiveView("usage")} className={tabClass("usage")}>مصرف توکن</button>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">🔍 ابزارهای سئو</button>
          </div>
        </div>
        {/* نمایش وضعیت اتصال سئو با هوش مصنوعی */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-purple-700">
            <Sparkles className="size-3.5" /> اتصال هوش مصنوعی برای سئو:
          </span>
          {getApiKey("seo") ? (
            <span className="flex items-center gap-1.5 rounded-lg bg-green-100 px-2 py-1 text-green-700">
              <span className="size-1.5 rounded-full bg-green-500" /> فعال
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1 text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500" /> تنظیم نشده
            </span>
          )}
          <span className="text-purple-600/70">·</span>
          <span className="text-purple-600/70">ارائه‌دهنده: <strong>{PROVIDERS.find(p => p.value === (getProvider("seo") || "deepseek"))?.label || "پیش‌فرض"}</strong></span>
          <span className="text-purple-600/70">·</span>
          <span className="text-purple-600/70">مدل: <strong>{getModel("seo") || "deepseek-chat"}</strong></span>
          <button onClick={() => setActiveView("settings")} className="mr-auto flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors">
            <Settings className="size-3" strokeWidth={1.6} /> تغییر تنظیمات
          </button>
        </div>
        <SeoTools />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Sparkles className="size-6 text-purple-600" strokeWidth={1.6} />
            مدیریت هوش مصنوعی
          </h1>
          <p className="mt-1 text-sm text-slate-500">برای هر وظیفه، ارائه‌دهنده و مدل جداگانه تنظیم کنید</p>
        </div>
        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50">
          <Save className="size-4" /> {saving ? "در حال ذخیره..." : "ذخیره همه تنظیمات"}
        </button>
      </div>

      <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button onClick={() => setActiveView("settings")} className={tabClass("settings")}>تنظیمات Agentها</button>
        <button onClick={() => setActiveView("usage")} className={tabClass("usage")}>مصرف توکن</button>
        <button onClick={() => setActiveView("tools")} className={tabClass("tools")}>🔍 ابزارهای سئو</button>
      </div>

      {/* آکاردئون وظایف */}
      <div className="space-y-3">
        {TASKS.map((taskDef) => {
          const Icon = taskDef.icon;
          const isOpen = expandedTasks.includes(taskDef.id);
          const configured = !!getApiKey(taskDef.id);
          const provider = getProvider(taskDef.id) || taskDef.recommend;
          const apiKey = getApiKey(taskDef.id);
          const model = getModel(taskDef.id) || getDefaultModel(provider);
          const baseUrl = getBaseUrl(taskDef.id);
          const providerDef = PROVIDERS.find(p => p.value === provider);
          const result = testResults[taskDef.id];

          return (
            <div key={taskDef.id} className={cn(
              "rounded-2xl border bg-white shadow-sm transition-all overflow-hidden",
              isOpen ? "border-purple-200 ring-1 ring-purple-100" : "border-slate-200 hover:border-slate-300"
            )}>
              {/* HEADER - کلیک برای باز/بسته شدن */}
              <button type="button" onClick={() => toggleExpand(taskDef.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-right"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isOpen ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"
                  )}>
                    <Icon className="size-4" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold transition-colors", isOpen ? "text-purple-900" : "text-slate-800")}>{taskDef.label}</span>
                      <span className={cn("size-2 rounded-full shrink-0", configured ? "bg-green-500" : "bg-slate-300")} />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{taskDef.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {configured && (
                    <span className="hidden sm:inline text-[9px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ پیکربندی شده</span>
                  )}
                  <ChevronDown className={cn("size-5 text-slate-400 transition-transform", isOpen && "rotate-180")} strokeWidth={1.8} />
                </div>
              </button>

              {/* CONTENT - پنل تنظیمات */}
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {/* پیشنهاد مدل‌ها (۳ مدل حداقل) */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-2">⚡ انتخاب سریع مدل:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {taskDef.recommendModels.map((recModel, idx) => {
                        const isActive = model === recModel && provider === taskDef.recommend;
                        return (
                          <button key={recModel} type="button" onClick={() => applyRecommended(taskDef.id, idx)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-medium transition-all",
                              isActive
                                ? "border-purple-300 bg-purple-100 text-purple-800 shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50"
                            )}
                          >
                            <Zap className="size-2.5" strokeWidth={1.8} />
                            {recModel}
                            {isActive && <span className="text-[8px] bg-purple-200 px-1.5 py-0.5 rounded">فعال</span>}
                          </button>
                        );
                      })}
                      {provider !== taskDef.recommend && (
                        <button type="button" onClick={() => applyRecommended(taskDef.id, 0)}
                          className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-medium text-amber-700 hover:bg-amber-100"
                        >↺ بازگشت به {PROVIDERS.find(p => p.value === taskDef.recommend)?.label}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* فرمت API */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-2">فرمت API</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: "openai", label: "OpenAI", desc: "Bearer token", base: "https://api.openai.com/v1", icon: Key, color: "purple" },
                        { id: "google", label: "Google AI", desc: "API Key در هدر", base: "https://generativelanguage.googleapis.com/v1beta/openai/", icon: Globe, color: "blue" },
                        { id: "custom", label: "سفارشی", desc: "سازگار با OpenAI", base: "", icon: Wrench, color: "slate" },
                      ].map(fmt => {
                        const fmtActive = baseUrl === fmt.base || (fmt.id === "custom" && !["https://api.openai.com/v1", "https://generativelanguage.googleapis.com/v1beta/openai/"].includes(baseUrl));
                        const FmtIcon = fmt.icon;
                        return (
                          <button key={fmt.id} type="button" onClick={() => {
                            updateSetting(`ai.${taskDef.id}.base_url`, fmt.base);
                            if (fmt.id === "openai") updateSetting(`ai.${taskDef.id}.provider`, "openai");
                            else if (fmt.id === "google") updateSetting(`ai.${taskDef.id}.provider`, "gemini");
                          }}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all text-center",
                              fmtActive ? `border-${fmt.color}-300 bg-${fmt.color}-50 shadow-sm` : "border-slate-200 bg-white hover:border-slate-300 opacity-70 hover:opacity-100"
                            )}
                          >
                            <FmtIcon className={cn("size-5", fmtActive ? `text-${fmt.color}-600` : "text-slate-400")} strokeWidth={1.5} />
                            <span className={cn("text-[10px] font-semibold", fmtActive ? `text-${fmt.color}-800` : "text-slate-600")}>{fmt.label}</span>
                            {fmtActive && <span className="text-[8px] font-bold text-emerald-600">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Provider + Model */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-semibold text-slate-700">ارائه‌دهنده</label>
                        <button type="button" onClick={() => setShowCustomModal(true)} className="text-[10px] text-purple-600 hover:underline">+ مدیریت سفارشی</button>
                      </div>
                      <select value={provider}
                        onChange={e => {
                          const np = e.target.value;
                          updateSetting(`ai.${taskDef.id}.provider`, np);
                          updateSetting(`ai.${taskDef.id}.model`, getDefaultModel(np));
                          const p = [...PROVIDERS, ...customProviders.map(c => ({ value: c.id, label: c.name, models: c.models, baseUrl: c.baseUrl, note: "" }))].find(p => p.value === np);
                          updateSetting(`ai.${taskDef.id}.base_url`, p?.baseUrl || "");
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-purple-400">
                        {[...PROVIDERS.filter(p => p.value !== "custom"), ...customProviders.map(c => ({ value: c.id, label: `🔧 ${c.name}`, models: c.models, free: false, baseUrl: c.baseUrl }))].map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                        <option value="custom">✏️ API سفارشی</option>
                      </select>
                      {providerDef?.note && <p className="mt-1 text-[10px] text-slate-400">{providerDef.note}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">مدل</label>
                      {provider === "custom" ? (
                        <input value={model} onChange={e => updateSetting(`ai.${taskDef.id}.model`, e.target.value)}
                          placeholder="نام مدل را وارد کنید..." dir="ltr"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400 font-mono" />
                      ) : (
                        <select value={model} onChange={e => updateSetting(`ai.${taskDef.id}.model`, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-purple-400">
                          {(providerDef?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                          {model && !(providerDef?.models || []).includes(model) && <option value={model}>{model}</option>}
                        </select>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">پیشنهاد: {taskDef.recommendModels.join("، ")}</p>
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-slate-700">کلید API</label>
                      {providerDef?.keyUrl && (
                        <a href={providerDef.keyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:underline">
                          دریافت کلید <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <input type={showKey[taskDef.id] ? "text" : "password"} value={apiKey}
                        onChange={e => updateSetting(`ai.${taskDef.id}.api_key`, e.target.value)}
                        placeholder={baseUrl.includes("openai.com") ? "sk-..." : baseUrl.includes("googleapis") ? "AIza..." : baseUrl.includes("anthropic.com") ? "sk-ant-..." : "API Key خود را وارد کنید"}
                        dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-purple-400 font-mono" />
                      <button type="button" onClick={() => setShowKey(prev => ({ ...prev, [taskDef.id]: !prev[taskDef.id] }))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showKey[taskDef.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[9px] text-slate-400">
                      {baseUrl.includes("openai.com") && "🔑 کلید باید با sk- شروع شود"}
                      {baseUrl.includes("googleapis") && "🔑 کلید API از Google AI Studio دریافت کنید"}
                      {baseUrl.includes("anthropic.com") && "🔑 کلید باید با sk-ant- شروع شود"}
                      {!baseUrl.includes("openai.com") && !baseUrl.includes("googleapis") && !baseUrl.includes("anthropic.com") && "🔑 فرمت کلید بستگی به ارائه‌دهنده دارد"}
                    </p>
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">Base URL</label>
                    <div className="flex gap-2">
                      <input value={baseUrl} onChange={e => updateSetting(`ai.${taskDef.id}.base_url`, e.target.value)}
                        placeholder="https://api.openai.com/v1" dir="ltr"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400 font-mono" />
                      <button type="button" onClick={() => updateSetting(`ai.${taskDef.id}.base_url`, providerDef?.baseUrl || "")}
                        className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] text-slate-500 hover:bg-slate-100"
                        title="بازگردانی به پیش‌فرض">↺</button>
                    </div>
                  </div>

                  {/* نمایش مصرف توکن این Agent */}
                  {agentUsage[taskDef.id] && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <BarChart3 className="size-3.5 text-slate-500" strokeWidth={1.6} />
                        <span className="text-[10px] font-semibold text-slate-600">مصرف توکن (۳۰ روز اخیر)</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div className="rounded-lg bg-white px-2 py-1.5 shadow-xs">
                          <p className="text-xs font-bold text-slate-800">{agentUsage[taskDef.id].requests.toLocaleString("fa-IR")}</p>
                          <p className="text-[8px] text-slate-400">درخواست</p>
                        </div>
                        <div className="rounded-lg bg-white px-2 py-1.5 shadow-xs">
                          <p className="text-xs font-bold text-teal-700">{agentUsage[taskDef.id].totalTokens.toLocaleString("fa-IR")}</p>
                          <p className="text-[8px] text-slate-400">توکن کل</p>
                        </div>
                        <div className="rounded-lg bg-white px-2 py-1.5 shadow-xs">
                          <p className="text-xs font-bold text-blue-700">{agentUsage[taskDef.id].promptTokens.toLocaleString("fa-IR")}</p>
                          <p className="text-[8px] text-slate-400">ورودی</p>
                        </div>
                        <div className="rounded-lg bg-white px-2 py-1.5 shadow-xs">
                          <p className="text-xs font-bold text-purple-700">{agentUsage[taskDef.id].completionTokens.toLocaleString("fa-IR")}</p>
                          <p className="text-[8px] text-slate-400">خروجی</p>
                        </div>
                        <div className="rounded-lg bg-white px-2 py-1.5 shadow-xs">
                          <p className="text-xs font-bold text-amber-700">${(agentUsage[taskDef.id].costUsd || 0).toFixed(4)}</p>
                          <p className="text-[8px] text-slate-400">هزینه</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!agentUsage[taskDef.id] && !usageLoading && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
                      <span className="text-[10px] text-slate-400">مصرفی برای این agent ثبت نشده</span>
                    </div>
                  )}
                  {usageLoading && (
                    <div className="flex justify-center py-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                    </div>
                  )}

                  {/* تست اتصال */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button type="button" onClick={() => testConnection(taskDef.id)}
                      disabled={testing === taskDef.id || !apiKey}
                      className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-40">
                      <TestTube className="size-3.5" strokeWidth={1.7} />
                      {testing === taskDef.id ? "در حال تست..." : "تست اتصال"}
                    </button>
                    {result && (
                      <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {result.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                        {result.message}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* مودال مدیریت ارائه‌دهنده‌های سفارشی */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCustomModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">🔧 ارائه‌دهنده‌های سفارشی</h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-600"><span className="size-5">✕</span></button>
            </div>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {customProviders.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">هیچ ارائه‌دهنده سفارشی اضافه نشده</p>
              )}
              {customProviders.map((cp, i) => (
                <div key={cp.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{cp.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{cp.baseUrl}</p>
                    <p className="text-[10px] text-slate-400">مدل‌ها: {cp.models.join(", ")}</p>
                  </div>
                  <button onClick={() => setCustomProviders(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-600 text-[10px]">حذف</button>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700">افزودن ارائه‌دهنده جدید:</p>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-600">نام</label>
                <input type="text" value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))} placeholder="my-provider" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-600">Base URL</label>
                <input type="text" value={customForm.baseUrl} onChange={e => setCustomForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-purple-500 font-mono" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-600">مدل‌ها (با کاما جدا کنید)</label>
                <input type="text" value={customForm.models} onChange={e => setCustomForm(f => ({ ...f, models: e.target.value }))} placeholder="gpt-4o, gpt-4o-mini, claude-3" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-purple-500 font-mono" />
              </div>
              <button onClick={() => {
                if (!customForm.name.trim() || !customForm.baseUrl.trim()) { toast.error("نام و Base URL الزامی است"); return; }
                const id = customForm.name.trim().toLowerCase().replace(/\s+/g, "-");
                setCustomProviders(prev => [...prev, { id, name: customForm.name.trim(), baseUrl: customForm.baseUrl.trim(), models: customForm.models ? customForm.models.split(",").map(m => m.trim()) : ["custom"] }]);
                setCustomForm({ name: "", baseUrl: "https://api.", models: "" });
                toast.success("✅ ارائه‌دهنده اضافه شد");
              }} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-purple-500">+ افزودن</button>
            </div>
          </div>
        </div>
      )}

      {/* راهنما */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-5 shrink-0 text-purple-600" strokeWidth={1.5} />
          <div className="text-xs leading-6 text-purple-900">
            <p className="font-semibold">قابلیت‌های دستیار هوش مصنوعی:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li><strong>🤖 دستیار چت:</strong> ساخت محصول با تنوع، نوشتن پست بلاگ، ساخت اسلاید، گزارش فروش، تولید تگ هوشمند، بهینه‌سازی توضیحات</li>
              <li><strong>✍️ تولید محتوای SEO:</strong> نوشتن خودکار پست بلاگ از کلیدواژه، تولید متا تایتل و توضیحات، پیشنهاد کلمات کلیدی، بازنویسی محتوا</li>
              <li><strong>🖼️ تحلیل تصویر:</strong> خواندن فاکتور و صورتحساب، استخراج جدول از تصاویر، توضیح تصاویر فنی و مدارک</li>
              <li><strong>📊 آپدیت قیمت از Excel:</strong> آپلود فایل اکسل، تطبیق SKUها، به‌روزرسانی خودکار قیمت تنوع‌ها — قابلیت dry-run برای تست قبل از اعمال</li>
              <li><strong>🔍 تحلیل رقبا:</strong> آنالیز سایت رقیب، استخراج متا تگ‌ها و کلمات کلیدی، پیشنهاد استراتژی محتوا و بهبود SEO</li>
              <li><strong>💬 چت هوشمند با مشتری:</strong> تحلیل پیام مشتری، جستجوی محصولات در دیتابیس، پیشنهاد محصول مناسب، پاسخ هوشمند</li>
            </ul>
            <p className="mt-2 text-xs font-semibold text-purple-700">💡 هر وظیفه می‌تواند ارائه‌دهنده و مدل جداگانه داشته باشد. برای صرفه‌جویی، از مدل‌های کوچک‌تر برای وظایف ساده استفاده کنید.</p>
          </div>
        </div>
      </div>

      {/* ─── Agent Permissions Panel ─── */}
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-3.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">🔐</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">دسترسی ایجنت‌ها</h3>
            <p className="text-[10px] text-slate-500">برای هر ادمین مشخص کنید به کدام agentهای هوش مصنوعی دسترسی داشته باشد</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* انتخاب ادمین */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">👤 انتخاب ادمین</label>
            <select
              value={selectedAdminId}
              onChange={e => setSelectedAdminId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-amber-400"
            >
              <option value="">— انتخاب کنید —</option>
              {adminUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role}) — {u.email}</option>
              ))}
            </select>
          </div>

          {/* لیست agentها با checkbox */}
          {selectedAdminId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-slate-700">🤖 ایجنت‌های مجاز</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const all: Record<string, boolean> = {};
                    TASKS.forEach(t => { all[t.id] = true; });
                    setAgentPermissions(all);
                  }} className="text-[10px] text-green-600 hover:underline">انتخاب همه</button>
                  <button type="button" onClick={() => setAgentPermissions({})} className="text-[10px] text-red-500 hover:underline">حذف همه</button>
                </div>
              </div>
              {permLoading ? (
                <div className="flex justify-center py-4"><div className="size-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div>
              ) : (
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto">
                  {TASKS.filter(t => t.id !== "router").map(task => (
                    <label key={task.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={agentPermissions[task.id] !== false}
                        onChange={e => setAgentPermissions(prev => ({ ...prev, [task.id]: e.target.checked }))}
                        className="size-4 accent-amber-500"
                      />
                      <span className="text-[11px] font-medium text-slate-700">{task.label}</span>
                      {task.adminOnly && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">ادمین</span>}
                    </label>
                  ))}
                </div>
              )}
              {/* دکمه ذخیره */}
              <button
                type="button"
                disabled={permSaving}
                onClick={async () => {
                  setPermSaving(true);
                  try {
                    const res = await fetch("/api/admin/settings", {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        key: `ai.agent_permissions.${selectedAdminId}`,
                        value: agentPermissions,
                        group: "ai",
                      }),
                    });
                    const data = await res.json();
                    if (data.ok) toast.success("✅ دسترسی‌های ایجنت ذخیره شد");
                    else toast.error(data.error || "خطا در ذخیره");
                  } catch {
                    toast.error("خطا در ارتباط با سرور");
                  }
                  setPermSaving(false);
                }}
                className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {permSaving ? (
                  <><div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> در حال ذخیره...</>
                ) : (
                  <>💾 ذخیره دسترسی‌ها</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
