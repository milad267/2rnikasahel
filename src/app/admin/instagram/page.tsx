"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save, Plus, Trash2, Edit, Eye, EyeOff, RefreshCw,
  Play, Pause, Settings, MessageSquare, Image, Video, Clock,
  CheckCircle, XCircle, AlertCircle, Sparkles, Globe, Shield,
  Server, Plug, Zap, Hash, Type, ChevronDown, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───
type TabKey = "dashboard" | "accounts" | "queue" | "published" | "dm" | "settings";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "داشبورد", icon: CameraIcon },
  { key: "accounts", label: "اکانت‌ها", icon: Globe },
  { key: "queue", label: "صف انتشار", icon: Clock },
  { key: "published", label: "منتشر شده", icon: CheckCircle },
  { key: "dm", label: "دایرکت خودکار", icon: MessageSquare },
  { key: "settings", label: "تنظیمات", icon: Settings },
];

interface InstagramAccount {
  id: number;
  username: string;
  password: string;
  isActive: boolean;
  v2rayLink: string | null;
  loginStatus: string;
  lastLoginAt: string | null;
  cookieData: string | null;
  errorMessage: string | null;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  // VPN / Proxy fields
  proxyType: string;
  proxyConfig: Record<string, string>;
  useProxy: boolean;
  vpnStatus: string;
  lastPingAt: string | null;
  vpnAlertEnabled: boolean;
  // 2FA fields
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorSecret: string | null;
}

interface InstagramPost {
  id: number;
  accountId: number;
  productId: number | null;
  mediaType: string;
  caption: string;
  hashtags: string;
  mediaPaths: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  instagramPostId: string | null;
  instagramPermalink: string | null;
  likeCount: number;
  commentCount: number;
  aiGenerated: boolean;
  errorMessage: string | null;
  product?: { id: number; title: string; slug: string; coverImage: string | null } | null;
}

interface InstagramDmRule {
  id: number;
  accountId: number;
  triggerKeywords: string[];
  responseType: string;
  responseText: string;
  aiPrompt: string;
  isActive: boolean;
  priority: number;
}

interface OverviewData {
  stats: {
    totalAccounts: number;
    activeAccounts: number;
    connectedAccounts: number;
    draftPosts: number;
    scheduledPosts: number;
    publishedPosts: number;
    failedPosts: number;
    activeDmRules: number;
  };
  accounts: InstagramAccount[];
  recentPosts: InstagramPost[];
  upcomingPosts: InstagramPost[];
}

// ─── Main Component ───
export default function InstagramAdminPage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [dmRules, setDmRules] = useState<InstagramDmRule[]>([]);

  // Settings state
  const [settings, setSettings] = useState<Record<string, any>>({});

  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDmRuleModal, setShowDmRuleModal] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState<Partial<InstagramAccount>>({});
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);

  const [postForm, setPostForm] = useState({
    accountId: 0,
    productId: null as number | null,
    mediaType: "image",
    caption: "",
    hashtags: "",
    status: "draft",
    scheduledAt: "",
  });
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  const [dmRuleForm, setDmRuleForm] = useState({
    accountId: 0,
    triggerKeywords: "",
    responseType: "text",
    responseText: "",
    aiPrompt: "",
    isActive: true,
    priority: 0,
  });
  const [editingDmRuleId, setEditingDmRuleId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<{ id: number; title: string }[]>([]);

  // VPN test state
  const [vpnTesting, setVpnTesting] = useState(false);
  const [vpnTestResult, setVpnTestResult] = useState<{ reachable: boolean; latency: number; message: string } | null>(null);

  // AI Key test state
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ provider: string; ok: boolean; message: string } | null>(null);

  // ─── Load Data ───
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/instagram");
      const data = await res.json();
      if (data.ok) {
        setOverview(data);
        setAccounts(data.accounts || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadPosts = useCallback(async (status?: string) => {
    try {
      const url = status ? `/api/admin/instagram/posts?status=${status}` : "/api/admin/instagram/posts";
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) setPosts(data.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadDmRules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/instagram/dm-rules");
      const data = await res.json();
      if (data.ok) setDmRules(data.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    } catch { /* ignore */ }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products?limit=200");
      const data = await res.json();
      if (data.ok) setProducts(data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([
      loadOverview(),
      loadPosts(),
      loadDmRules(),
      loadSettings(),
      loadProducts(),
    ]).finally(() => setLoading(false));
  }, [loadOverview, loadPosts, loadDmRules, loadSettings, loadProducts]);

  // ─── Settings Helpers ───
  function getSetting(key: string, fallback = ""): string {
    return settings[`instagram.${key}`] ?? fallback;
  }
  function getBoolSetting(key: string): boolean {
    return getSetting(key) === "true";
  }
  function updateSetting(key: string, value: any) {
    setSettings((prev) => ({ ...prev, [`instagram.${key}`]: value }));
  }

  async function saveAllSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter((k) => k.startsWith("instagram."));
    let errors = 0;
    await Promise.all(
      keys.map(async (key) => {
        try {
          const res = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: settings[key], group: "instagram" }),
          });
          if (!(await res.json()).ok) errors++;
        } catch { errors++; }
      }),
    );
    if (errors === 0) toast.success("✅ تنظیمات ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  // ─── Account CRUD ───
  async function saveAccount() {
    if (!accountForm.username || !accountForm.password) {
      toast.error("نام کاربری و رمز عبور الزامی است");
      return;
    }
    setSaving(true);
    try {
      if (editingAccountId) {
        const res = await fetch("/api/admin/instagram/accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingAccountId, ...accountForm }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ اکانت ویرایش شد");
          setShowAccountModal(false);
          loadOverview();
        } else toast.error(data.error || "خطا");
      } else {
        const res = await fetch("/api/admin/instagram/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accountForm),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ اکانت اضافه شد");
          setShowAccountModal(false);
          loadOverview();
        } else toast.error(data.error || "خطا");
      }
    } catch { toast.error("خطا در ارتباط با سرور"); }
    setSaving(false);
  }

  async function deleteAccount(id: number) {
    if (!confirm("آیا از حذف این اکانت اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/instagram/accounts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("✅ اکانت حذف شد");
        loadOverview();
      } else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در حذف"); }
  }

  // ─── VPN Test ───
  async function testVpnConnection() {
    const link = accountForm.v2rayLink;
    if (!link) {
      toast.error("لطفاً ابتدا لینک V2Ray را وارد کنید");
      return;
    }
    setVpnTesting(true);
    setVpnTestResult(null);
    try {
      const res = await fetch("/api/admin/instagram/vpn-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const data = await res.json();
      if (data.ok) {
        setVpnTestResult({ reachable: data.reachable, latency: data.latency, message: data.message });
        if (data.reachable) toast.success("✅ اتصال VPN با موفقیت برقرار شد");
        else toast.error("❌ اتصال VPN برقرار نشد");
      } else {
        toast.error(data.error || "خطا در تست VPN");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور برای تست VPN");
    }
    setVpnTesting(false);
  }

  async function updateVpnStatus(accountId: number) {
    try {
      const res = await fetch("/api/admin/instagram/vpn-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.status === "connected") toast.success("✅ VPN متصل است");
        else toast.error("❌ VPN قطع است");
        loadOverview();
      }
    } catch {
      toast.error("خطا در بررسی وضعیت VPN");
    }
  }

  // ─── AI Key Test ───
  async function testAiKey(provider: "openai" | "gemini") {
    const key = provider === "openai" ? getSetting("ai.openai_key") : getSetting("ai.gemini_key");
    if (!key) {
      toast.error(`لطفاً ابتدا ${provider === "openai" ? "OpenAI" : "Gemini"} API Key را وارد کنید`);
      return;
    }
    if (provider === "openai") setTestingOpenAi(true);
    else setTestingGemini(true);
    setAiTestResult(null);

    try {
      const res = await fetch("/api/admin/instagram/test-ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const data = await res.json();
      if (data.ok && data.valid) {
        setAiTestResult({ provider, ok: true, message: `✅ کلید ${provider === "openai" ? "OpenAI" : "Gemini"} معتبر است (${data.model || ""})` });
        toast.success(`✅ کلید ${provider === "openai" ? "OpenAI" : "Gemini"} معتبر است`);
      } else {
        setAiTestResult({ provider, ok: false, message: `❌ ${data.error || "کلید نامعتبر است"}` });
        toast.error(`❌ ${data.error || "کلید نامعتبر است"}`);
      }
    } catch {
      setAiTestResult({ provider, ok: false, message: "❌ خطا در ارتباط با سرور" });
      toast.error("خطا در ارتباط با سرور");
    }
    if (provider === "openai") setTestingOpenAi(false);
    else setTestingGemini(false);
  }

  function openEditAccount(acc: InstagramAccount) {
    setEditingAccountId(acc.id);
    setAccountForm(acc);
    setShowAccountModal(true);
  }

  function openNewAccount() {
    setEditingAccountId(null);
    setVpnTestResult(null);
    setAccountForm({
      username: "",
      password: "",
      v2rayLink: "",
      proxyType: "v2ray",
      proxyConfig: {},
      useProxy: true,
      vpnStatus: "unknown",
      vpnAlertEnabled: true,
      twoFactorEnabled: false,
      twoFactorMethod: "app",
      twoFactorSecret: "",
    });
    setShowAccountModal(true);
  }

  // ─── Post CRUD ───
  async function savePost() {
    if (!postForm.accountId) {
      toast.error("لطفاً اکانت اینستاگرام را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      if (editingPostId) {
        const res = await fetch("/api/admin/instagram/posts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingPostId, ...postForm }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ پست ویرایش شد");
          setShowPostModal(false);
          loadPosts();
        } else toast.error(data.error || "خطا");
      } else {
        const res = await fetch("/api/admin/instagram/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postForm),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ پست ایجاد شد");
          setShowPostModal(false);
          loadPosts();
        } else toast.error(data.error || "خطا");
      }
    } catch { toast.error("خطا در ارتباط با سرور"); }
    setSaving(false);
  }

  async function deletePost(id: number) {
    if (!confirm("آیا از حذف این پست اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/instagram/posts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("✅ پست حذف شد");
        loadPosts();
      } else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در حذف"); }
  }

  function openEditPost(post: InstagramPost) {
    setEditingPostId(post.id);
    setPostForm({
      accountId: post.accountId,
      productId: post.productId,
      mediaType: post.mediaType,
      caption: post.caption,
      hashtags: post.hashtags,
      status: post.status,
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "",
    });
    setShowPostModal(true);
  }

  function openNewPost() {
    setEditingPostId(null);
    setPostForm({
      accountId: accounts[0]?.id || 0,
      productId: null,
      mediaType: "image",
      caption: "",
      hashtags: "",
      status: "draft",
      scheduledAt: "",
    });
    setShowPostModal(true);
  }

  // ─── AI Generate ───
  async function generateWithAI(accountId?: number) {
    const targetAccount = accountId || accounts[0]?.id;
    if (!targetAccount) {
      toast.error("ابتدا یک اکانت اینستاگرام اضافه کنید");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/instagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: targetAccount, count: 1 }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "✅ محتوا تولید شد");
        loadPosts();
      } else toast.error(data.error || "خطا در تولید محتوا");
    } catch { toast.error("خطا در ارتباط با سرور"); }
    setGenerating(false);
  }

  // ─── DM Rules CRUD ───
  async function saveDmRule() {
    if (!dmRuleForm.accountId || !dmRuleForm.triggerKeywords) {
      toast.error("اکانت و کلمات کلیدی الزامی است");
      return;
    }
    setSaving(true);
    const payload = {
      ...dmRuleForm,
      triggerKeywords: dmRuleForm.triggerKeywords.split("\n").map((k) => k.trim()).filter(Boolean),
    };
    try {
      if (editingDmRuleId) {
        const res = await fetch("/api/admin/instagram/dm-rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingDmRuleId, ...payload }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ قانون ویرایش شد");
          setShowDmRuleModal(false);
          loadDmRules();
        } else toast.error(data.error || "خطا");
      } else {
        const res = await fetch("/api/admin/instagram/dm-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ قانون اضافه شد");
          setShowDmRuleModal(false);
          loadDmRules();
        } else toast.error(data.error || "خطا");
      }
    } catch { toast.error("خطا در ارتباط با سرور"); }
    setSaving(false);
  }

  async function deleteDmRule(id: number) {
    if (!confirm("آیا از حذف این قانون اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/instagram/dm-rules?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("✅ قانون حذف شد");
        loadDmRules();
      } else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در حذف"); }
  }

  function openEditDmRule(rule: InstagramDmRule) {
    setEditingDmRuleId(rule.id);
    setDmRuleForm({
      accountId: rule.accountId,
      triggerKeywords: rule.triggerKeywords.join("\n"),
      responseType: rule.responseType,
      responseText: rule.responseText,
      aiPrompt: rule.aiPrompt,
      isActive: rule.isActive,
      priority: rule.priority,
    });
    setShowDmRuleModal(true);
  }

  function openNewDmRule() {
    setEditingDmRuleId(null);
    setDmRuleForm({
      accountId: accounts[0]?.id || 0,
      triggerKeywords: "",
      responseType: "text",
      responseText: "",
      aiPrompt: "",
      isActive: true,
      priority: 0,
    });
    setShowDmRuleModal(true);
  }

  // ─── Helpers ───
  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      draft: { color: "bg-slate-200 text-slate-700", label: "پیش‌نویس" },
      scheduled: { color: "bg-amber-100 text-amber-800", label: "زمان‌بندی شده" },
      published: { color: "bg-emerald-100 text-emerald-800", label: "منتشر شده" },
      failed: { color: "bg-red-100 text-red-800", label: "ناموفق" },
    };
    const m = map[status] || { color: "bg-slate-200 text-slate-700", label: status };
    return <span className={cn("rounded-lg px-2 py-0.5 text-[10px] font-semibold", m.color)}>{m.label}</span>;
  };

  const loginStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      not_connected: { color: "bg-slate-200 text-slate-600", label: "❌ عدم اتصال" },
      connected: { color: "bg-emerald-100 text-emerald-800", label: "✅ متصل" },
      error: { color: "bg-red-100 text-red-800", label: "⚠️ خطا" },
      connecting: { color: "bg-amber-100 text-amber-800", label: "⏳ در حال اتصال" },
    };
    const m = map[status] || { color: "bg-slate-200 text-slate-600", label: status };
    return <span className={cn("rounded-lg px-2 py-0.5 text-[10px] font-semibold", m.color)}>{m.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" />
      </div>
    );
  }

  const stats = overview?.stats;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <CameraIcon className="size-6 text-pink-500" />
            مدیریت اینستاگرام
          </h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت هوشمند اینستاگرام فروشگاه با هوش مصنوعی</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "settings" && (
            <button onClick={saveAllSettings} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              <Save className="size-4" /> {saving ? "..." : "ذخیره همه"}
            </button>
          )}
          {tab === "accounts" && (
            <button onClick={openNewAccount}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg">
              <Plus className="size-4" /> اکانت جدید
            </button>
          )}
          {tab === "queue" && (
            <div className="flex items-center gap-2">
              <button onClick={() => generateWithAI()}
                disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg disabled:opacity-50">
                <Sparkles className={`size-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "..." : "تولید با هوش مصنوعی"}
              </button>
              <button onClick={openNewPost}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white">
                <Plus className="size-4" /> پست جدید
              </button>
            </div>
          )}
          {tab === "dm" && (
            <button onClick={openNewDmRule}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white">
              <Plus className="size-4" /> قانون جدید
            </button>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all",
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}>
              <Icon className="size-3.5" strokeWidth={1.7} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 1: DASHBOARD */}
      {/* ════════════════════════════════════════════════════ */}
      {tab === "dashboard" && (
        <div className="space-y-5">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                  <Globe className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">کل اکانت‌ها</p>
                  <p className="text-xl font-black text-slate-900">{stats?.totalAccounts || 0}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                {stats?.connectedAccounts || 0} اکانت متصل
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">منتشر شده</p>
                  <p className="text-xl font-black text-slate-900">{stats?.publishedPosts || 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">در انتظار</p>
                  <p className="text-xl font-black text-slate-900">{(stats?.draftPosts || 0) + (stats?.scheduledPosts || 0)}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                {stats?.scheduledPosts || 0} زمان‌بندی شده
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">قوانین دایرکت</p>
                  <p className="text-xl font-black text-slate-900">{stats?.activeDmRules || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Master Switch */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Zap className="size-4 text-petrol-600" /> وضعیت کلی سیستم اینستاگرام
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  با خاموش کردن کلید اصلی، تمام فعالیت‌های خودکار اینستاگرام متوقف می‌شود
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={getBoolSetting("master_enabled")}
                  onChange={(e) => updateSetting("master_enabled", e.target.checked ? "true" : "false")}
                  className="peer sr-only" />
                <div className="h-7 w-12 overflow-hidden rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-md after:transition-all peer-checked:bg-emerald-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
              </label>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => setTab("accounts")}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition-all hover:border-pink-200 hover:shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                <Globe className="size-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">مدیریت اکانت‌ها</p>
                <p className="text-xs text-slate-500">افزودن و تنظیم اکانت‌های اینستاگرام + پروکسی</p>
              </div>
              <ChevronDown className="size-4 -rotate-90 text-slate-400" />
            </button>
            <button onClick={() => setTab("queue")}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition-all hover:border-pink-200 hover:shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-amber-500 text-white shadow-lg">
                <Sparkles className="size-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">تولید محتوا با هوش مصنوعی</p>
                <p className="text-xs text-slate-500">ساخت خودکار پست و ویدیو از محصولات سایت</p>
              </div>
              <ChevronDown className="size-4 -rotate-90 text-slate-400" />
            </button>
            <button onClick={() => setTab("dm")}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition-all hover:border-pink-200 hover:shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                <MessageSquare className="size-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">دایرکت خودکار</p>
                <p className="text-xs text-slate-500">پیکربندی پاسخگویی خودکار به پیام‌ها</p>
              </div>
              <ChevronDown className="size-4 -rotate-90 text-slate-400" />
            </button>
            <button onClick={() => setTab("settings")}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition-all hover:border-pink-200 hover:shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg">
                <Settings className="size-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">تنظیمات هوش مصنوعی</p>
                <p className="text-xs text-slate-500">API Keyها، زمان‌بندی و تنظیمات کلی</p>
              </div>
              <ChevronDown className="size-4 -rotate-90 text-slate-400" />
            </button>
          </div>

          {/* Recent & Upcoming */}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-slate-800">🆕 آخرین پست‌های منتشر شده</h2>
              {(!overview?.recentPosts || overview.recentPosts.length === 0) ? (
                <p className="py-8 text-center text-xs text-slate-400">هنوز پستی منتشر نشده</p>
              ) : (
                <div className="space-y-2">
                  {overview.recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                        {post.mediaType === "video" ? <Video className="size-4" /> : <Image className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{post.caption?.slice(0, 50)}...</p>
                        <p className="text-[10px] text-slate-400">
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("fa-IR") : ""}
                          {" · "}
                          {post.likeCount > 0 && `${post.likeCount} لایک`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-slate-800">⏰ برنامه انتشار</h2>
              {(!overview?.upcomingPosts || overview.upcomingPosts.length === 0) ? (
                <p className="py-8 text-center text-xs text-slate-400">پستی در صف انتشار نیست</p>
              ) : (
                <div className="space-y-2">
                  {overview.upcomingPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      {statusBadge(post.status)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{post.caption?.slice(0, 40)}...</p>
                        {post.scheduledAt && (
                          <p className="text-[10px] text-slate-400">
                            {new Date(post.scheduledAt).toLocaleDateString("fa-IR")} · {new Date(post.scheduledAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 2: ACCOUNTS */}
      {/* ════════════════════════════════════════════════════ */}
      {tab === "accounts" && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
              <Globe className="size-12 text-slate-300 mb-4" strokeWidth={1.3} />
              <p className="text-sm font-semibold text-slate-600">هنوز اکانتی اضافه نشده</p>
              <p className="mt-1 text-xs text-slate-400">برای شروع، یک اکانت اینستاگرام اضافه کنید</p>
              <button onClick={openNewAccount}
                className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white">
                <Plus className="size-4" /> افزودن اکانت
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {accounts.map((acc) => (
                <div key={acc.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-pink-200 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                        <CameraIcon className="size-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">@{acc.username}</span>
                          {loginStatusBadge(acc.loginStatus)}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {acc.followerCount > 0 && `${acc.followerCount.toLocaleString()} دنبال‌کننده · `}
                          {acc.mediaCount > 0 && `${acc.mediaCount} پست · `}
                          {acc.lastLoginAt
                            ? `آخرین ورود: ${new Date(acc.lastLoginAt).toLocaleDateString("fa-IR")}`
                            : "ورود نشده"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {acc.v2rayLink && (
                        <span className="rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700">
                          <Shield className="inline size-3 ml-1" />
                          V2Ray
                        </span>
                      )}
                      {acc.useProxy && acc.vpnStatus && (
                        <span className={cn(
                          "rounded-lg px-2 py-1 text-[10px] font-medium",
                          acc.vpnStatus === "connected" ? "bg-green-50 text-green-700" :
                          acc.vpnStatus === "disconnected" ? "bg-red-50 text-red-700" :
                          "bg-slate-100 text-slate-500",
                        )}>
                          <Server className="inline size-3 ml-1" />
                          {acc.vpnStatus === "connected" ? "VPN: متصل" :
                           acc.vpnStatus === "disconnected" ? "VPN: قطع" :
                           "VPN: نامشخص"}
                        </span>
                      )}
                      {acc.twoFactorEnabled && (
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                          <Hash className="inline size-3 ml-1" />
                          2FA
                        </span>
                      )}
                      <button onClick={() => openEditAccount(acc)}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Edit className="size-3.5" />
                      </button>
                      <button onClick={() => deleteAccount(acc.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Proxy Details */}
                  {acc.v2rayLink && (
                    <div className="mt-3 rounded-xl bg-purple-50 p-3 text-[10px] text-slate-600">
                      <span className="font-semibold text-slate-700">لینک V2Ray: </span>
                      <span dir="ltr" className="break-all text-purple-700">{acc.v2rayLink}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Account Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Server className="size-4 text-petrol-600" /> راهنمای اتصال
            </h2>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>📌 برای اتصال به اینستاگرام در ایران، نیاز به <strong>VPN یا پروکسی</strong> دارید.</p>
              <p>📍 از انواع پروکسی می‌توانید استفاده کنید: <strong>V2Ray</strong>، <strong>HTTP</strong>، <strong>SOCKS5</strong> یا <strong>سفارشی</strong>.</p>
              <p>🔗 لینک V2Ray (vmess://, vless://, trojan://, ss://) را در بخش VPN وارد کرده و با دکمه "تست پینگ" اتصال را بررسی کنید.</p>
              <p>🔐 رمز عبور اکانت‌ها به صورت رمزنگاری شده در دیتابیس ذخیره می‌شود.</p>
              <p>🔔 در صورت قطعی VPN، سیستم هشدار می‌دهد (قابل فعال/غیرفعال کردن).</p>
              <p>🔑 اگر برای اکانت اینستاگرام <strong>تایید دو مرحله‌ای (2FA)</strong> فعال است، می‌توانید روش و کلید مخفی را در بخش 2FA تنظیم کنید.</p>
              <p>🤖 سیستم به صورت خودکار با استفاده از هوش مصنوعی محتوا تولید کرده و در زمان تعیین شده منتشر می‌کند.</p>
            </div>
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 3: CONTENT QUEUE */}
      {/* ════════════════════════════════════════════════════ */}
      {tab === "queue" && (
        <div className="space-y-4">
          {/* AI Generate Button (prominent) */}
          <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Sparkles className="size-5" /> تولید محتوا با هوش مصنوعی
                </h2>
                <p className="mt-1 text-sm text-white/80">هوش مصنوعی از محصولات سایت محتوای حرفه‌ای اینستاگرام می‌سازد</p>
              </div>
              <button onClick={() => generateWithAI()} disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-purple-700 shadow-lg transition-all hover:scale-105 disabled:opacity-50">
                <Sparkles className={`size-5 ${generating ? "animate-spin" : ""}`} />
                {generating ? "در حال تولید..." : "تولید محتوا"}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-white/70">
              <span>🎯 از محصولات تصادفی سایت</span>
              <span>📝 کپشن + هشتگ حرفه‌ای</span>
              <span>🎬 پیشنهاد نوع رسانه (تصویر/ویدیو)</span>
            </div>
          </div>

          {/* Post List */}
          <div className="space-y-2">
            {posts.filter((p) => p.status === "draft" || p.status === "scheduled").length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-12">
                <Clock className="size-12 text-slate-300 mb-4" strokeWidth={1.3} />
                <p className="text-sm font-semibold text-slate-600">صف انتشار خالی است</p>
                <p className="mt-1 text-xs text-slate-400">با دکمه "تولید با هوش مصنوعی" پست بسازید</p>
              </div>
            ) : (
              posts.filter((p) => p.status === "draft" || p.status === "scheduled").map((post) => (
                <div key={post.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-pink-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 text-pink-600">
                        {post.mediaType === "video" ? <Video className="size-5" /> : <Image className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {statusBadge(post.status)}
                          {post.aiGenerated && (
                            <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                              <Sparkles className="inline size-3 ml-0.5" />
                              هوش مصنوعی
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-700 line-clamp-2">{post.caption || "بدون کپشن"}</p>
                        {post.hashtags && (
                          <p className="mt-0.5 text-[10px] text-petrol-600 truncate">{post.hashtags}</p>
                        )}
                        {post.product && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            🏷️ {post.product.title}
                          </p>
                        )}
                        {post.scheduledAt && (
                          <p className="mt-0.5 text-[10px] text-amber-600">
                            🕐 انتشار در: {new Date(post.scheduledAt).toLocaleDateString("fa-IR")} · {new Date(post.scheduledAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditPost(post)}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Edit className="size-3.5" />
                      </button>
                      <button onClick={() => deletePost(post.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 4: PUBLISHED */}
      {/* ════════════════════════════════════════════════════ */}
      {tab === "published" && (
        <div className="space-y-2">
          {posts.filter((p) => p.status === "published" || p.status === "failed").length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
              <CheckCircle className="size-12 text-slate-300 mb-4" strokeWidth={1.3} />
              <p className="text-sm font-semibold text-slate-600">هنوز پستی منتشر نشده</p>
              <p className="mt-1 text-xs text-slate-400">پس از انتشار اولین پست، تاریخچه اینجا نمایش داده می‌شود</p>
            </div>
          ) : (
            posts.filter((p) => p.status === "published" || p.status === "failed").map((post) => (
              <div key={post.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600">
                      {post.mediaType === "video" ? <Video className="size-5" /> : <Image className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(post.status)}
                        {post.aiGenerated && (
                          <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            <Sparkles className="inline size-3 ml-0.5" />AI
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-700 line-clamp-2">{post.caption || "بدون کپشن"}</p>
                      {post.publishedAt && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          📅 {new Date(post.publishedAt).toLocaleDateString("fa-IR")} ساعت {new Date(post.publishedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                      {post.instagramPermalink && (
                        <a href={post.instagramPermalink} target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                          <ExternalLinkIcon className="size-3" /> مشاهده در اینستاگرام
                        </a>
                      )}
                      {(post.likeCount > 0 || post.commentCount > 0) && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          ❤️ {post.likeCount} 💬 {post.commentCount}
                        </p>
                      )}
                      {post.errorMessage && (
                        <p className="mt-1 text-[10px] text-red-500">❌ {post.errorMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 5: DM AUTOMATION */}
      {/* ════════════════════════════════════════════════════ */}
      {tab === "dm" && (
        <div className="space-y-4">
          {/* Master DM Switch */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <MessageSquare className="size-4 text-petrol-600" /> پاسخگویی خودکار دایرکت
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  با فعال‌سازی این بخش، ربات به صورت خودکار به پیام‌های دایرکت پاسخ می‌دهد
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={getBoolSetting("dm_enabled")}
                  onChange={(e) => updateSetting("dm_enabled", e.target.checked ? "true" : "false")}
                  className="peer sr-only" />
                <div className="h-7 w-12 overflow-hidden rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-md after:transition-all peer-checked:bg-emerald-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
              </label>
            </div>
          </div>

          {/* Rules List */}
          {dmRules.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
              <MessageSquare className="size-12 text-slate-300 mb-4" strokeWidth={1.3} />
              <p className="text-sm font-semibold text-slate-600">هیچ قانونی تعریف نشده</p>
              <p className="mt-1 text-xs text-slate-400">قوانین پاسخگویی خودکار به دایرکت‌ها را تعریف کنید</p>
              <button onClick={openNewDmRule}
                className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white">
                <Plus className="size-4" /> قانون جدید
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dmRules.map((rule) => (
                <div key={rule.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600">
                        <MessageSquare className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {rule.isActive ? (
                            <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">فعال</span>
                          ) : (
                            <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">غیرفعال</span>
                          )}
                          <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            اولویت {rule.priority}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {rule.responseType === "ai" ? "🤖 پاسخ هوشمند" : rule.responseType === "product_link" ? "🔗 لینک محصول" : "💬 متن ثابت"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {rule.triggerKeywords.map((kw, i) => (
                            <span key={i} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {kw}
                            </span>
                          ))}
                        </div>
                        {rule.responseText && (
                          <p className="mt-1 text-xs text-slate-600 line-clamp-2">{rule.responseText}</p>
                        )}
                        {rule.aiPrompt && (
                          <p className="mt-1 text-[10px] text-purple-600">🧠 {rule.aiPrompt}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditDmRule(rule)}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Edit className="size-3.5" />
                      </button>
                      <button onClick={() => deleteDmRule(rule.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DM Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Bot className="size-4 text-petrol-600" /> نحوه کار دایرکت خودکار
            </h2>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>۱. کاربر برای اکانت اینستاگرام شما دایرکت می‌فرستد</p>
              <p>۲. ربات پیام را با کلمات کلیدی قوانین مقایسه می‌کند</p>
              <p>۳. اگر کلمه کلیدی匹配 پیدا کند، پاسخ متناسب ارسال می‌شود</p>
              <p>۴. نوع پاسخ می‌تواند: متن ثابت، لینک محصول، یا پاسخ هوشمند با AI باشد</p>
              <p>۵. قوانین با اولویت بالاتر زودتر بررسی می‌شوند</p>
            </div>
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 6: SETTINGS */}
      {/* ════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="space-y-4">
          {/* Master Switches */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Zap className="size-4 text-petrol-600" /> کلیدهای اصلی
            </h2>
            <div className="space-y-4">
              {[
                { key: "master_enabled", label: "فعال بودن کل سیستم", desc: "با خاموش کردن، همه فعالیت‌های خودکار اینستاگرام متوقف می‌شود" },
                { key: "posting_enabled", label: "انتشار خودکار پست", desc: "پست‌های زمان‌بندی شده به صورت خودکار منتشر شوند" },
                { key: "dm_enabled", label: "پاسخگویی خودکار دایرکت", desc: "به پیام‌های دایرکت به صورت خودکار پاسخ داده شود" },
                { key: "ai_content_enabled", label: "تولید محتوای خودکار با AI", desc: "هوش مصنوعی به صورت دوره‌ای محتوای جدید تولید کند" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={getBoolSetting(item.key)}
                      onChange={(e) => updateSetting(item.key, e.target.checked ? "true" : "false")}
                      className="peer sr-only" />
                    <div className="h-6 w-10 overflow-hidden rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-all peer-checked:bg-emerald-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Scheduling */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Clock className="size-4 text-petrol-600" /> تنظیمات زمان‌بندی
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">تعداد پست در روز</label>
                <input type="number" min={0} max={10} value={getSetting("posts_per_day", "1")}
                  onChange={(e) => updateSetting("posts_per_day", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">حداکثر تعداد پست‌هایی که روزانه منتشر می‌شود</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">ساعت انتشار</label>
                <input type="time" value={getSetting("post_time", "10:00")}
                  onChange={(e) => updateSetting("post_time", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">پست‌ها در این ساعت از روز منتشر شوند</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">فاصله بین پست‌ها (دقیقه)</label>
                <input type="number" min={30} value={getSetting("post_interval", "240")}
                  onChange={(e) => updateSetting("post_interval", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">حداقل فاصله زمانی بین هر پست</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">حداکثر تلاش مجدد در صورت خطا</label>
                <input type="number" min={0} max={10} value={getSetting("max_retry", "3")}
                  onChange={(e) => updateSetting("max_retry", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">تعداد دفعات تلاش مجدد برای انتشار در صورت بروز خطا</p>
              </div>
            </div>
          </section>

          {/* AI API Keys */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Sparkles className="size-4 text-petrol-600" /> کلیدهای هوش مصنوعی
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              برای تولید محتوای خودکار، حداقل یکی از کلیدهای API زیر را وارد کنید
            </p>
            <div className="space-y-4">
              {/* OpenAI */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Bot className="size-3.5 text-green-600" /> OpenAI API Key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type={showToken ? "text" : "password"} value={getSetting("ai.openai_key")}
                      onChange={(e) => updateSetting("ai.openai_key", e.target.value)}
                      placeholder="sk-..." dir="ltr"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pe-10 text-xs outline-none focus:border-petrol-500 font-mono" />
                    <button type="button" onClick={() => setShowToken(!showToken)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button onClick={() => testAiKey("openai")} disabled={testingOpenAi}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-green-200 px-3 py-2.5 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 transition-all">
                    {testingOpenAi ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Zap className="size-3.5" />
                    )}
                    تست کلید
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">جهت تولید کپشن، هشتگ و توضیحات ویدیو</p>
                {aiTestResult?.provider === "openai" && (
                  <div className={cn(
                    "mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium",
                    aiTestResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
                  )}>
                    {aiTestResult.ok ? <CheckCircle className="size-3.5" /> : <XCircle className="size-3.5" />}
                    <span>{aiTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Gemini */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Sparkles className="size-3.5 text-blue-600" /> Google Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input type="password" value={getSetting("ai.gemini_key")}
                    onChange={(e) => updateSetting("ai.gemini_key", e.target.value)}
                    placeholder="AIza..." dir="ltr"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono" />
                  <button onClick={() => testAiKey("gemini")} disabled={testingGemini}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-all">
                    {testingGemini ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Zap className="size-3.5" />
                    )}
                    تست کلید
                  </button>
                </div>
                {aiTestResult?.provider === "gemini" && (
                  <div className={cn(
                    "mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium",
                    aiTestResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
                  )}>
                    {aiTestResult.ok ? <CheckCircle className="size-3.5" /> : <XCircle className="size-3.5" />}
                    <span>{aiTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Provider Selector */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">پروایدر پیش‌فرض برای تولید محتوا</label>
                  <p className="text-[10px] text-slate-400">هوش مصنوعی اصلی که محتوای اینستاگرام را تولید کند</p>
                </div>
                <select value={getSetting("ai.default_provider", "openai")}
                  onChange={(e) => updateSetting("ai.default_provider", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500">
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="auto">خودکار (اول OpenAI سپس Gemini)</option>
                </select>
              </div>

              {/* AI Model selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">مدل هوش مصنوعی (اختیاری)</label>
                <input type="text" value={getSetting("ai.model")}
                  onChange={(e) => updateSetting("ai.model", e.target.value)}
                  placeholder="مثل: gpt-4o, gemini-2.0-flash (خالی = پیش‌فرض)" dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">در صورت خالی بودن، از جدیدترین مدل موجود استفاده می‌شود</p>
              </div>
            </div>
          </section>

          {/* Content Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Hash className="size-4 text-petrol-600" /> تنظیمات محتوا
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">هشتگ‌های پیش‌فرض</label>
                <textarea value={getSetting("default_hashtags")}
                  onChange={(e) => updateSetting("default_hashtags", e.target.value)} rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                  placeholder="#درنیکا_ساحل #تجهیزات_صنعتی #فروشگاه_آنلاین" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">دستور تولید محتوا (Prompt)</label>
                <textarea value={getSetting("ai_content_prompt")}
                  onChange={(e) => updateSetting("ai_content_prompt", e.target.value)} rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono"
                  placeholder={`یک پست اینستاگرام حرفه‌ای برای محصول {title} بنویس.\nکپشن جذاب + ۱۵ هشتگ مرتبط + پیشنهاد نوع رسانه`} />
                <p className="mt-1 text-[10px] text-slate-400">از {'{title}'} برای نام محصول و {'{description}'} برای توضیحات استفاده کنید</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">زبان محتوا</label>
                <select value={getSetting("content_language", "fa")}
                  onChange={(e) => updateSetting("content_language", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value="fa">فارسی</option>
                  <option value="en">English</option>
                  <option value="both">فارسی + انگلیسی</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Type className="size-3.5" /> لحن محتوا
                </label>
                <select value={getSetting("content_tone", "professional")}
                  onChange={(e) => updateSetting("content_tone", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value="professional">حرفه‌ای و رسمی</option>
                  <option value="friendly">صمیمی و دوستانه</option>
                  <option value="luxury">لوکس و مجلل</option>
                  <option value="educational">آموزشی و تخصصی</option>
                </select>
              </div>
            </div>
          </section>

          {/* Other Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Settings className="size-4 text-petrol-600" /> سایر تنظیمات
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">بررسی وضعیت VPN (دقیقه)</label>
                <input type="number" min={1} max={120} value={getSetting("vpn_check_interval", "5")}
                  onChange={(e) => updateSetting("vpn_check_interval", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">هر چند دقیقه یکبار وضعیت VPN اکانت‌ها بررسی شود</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">پاک کردن خودکار لاگ (روز)</label>
                <input type="number" min={0} max={365} value={getSetting("log_retention_days", "30")}
                  onChange={(e) => updateSetting("log_retention_days", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">لاگ‌های قدیمی‌تر از این تعداد روز پاک شوند (0 = غیرفعال)</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">حداکثر پست در صف انتشار</label>
                <input type="number" min={1} max={200} value={getSetting("max_queue_size", "50")}
                  onChange={(e) => updateSetting("max_queue_size", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">حداکثر تعداد پست‌هایی که می‌توانند در صف منتظر بمانند</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">فاصله تولید محتوا با AI (ساعت)</label>
                <input type="number" min={1} max={168} value={getSetting("ai_generation_interval", "24")}
                  onChange={(e) => updateSetting("ai_generation_interval", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                <p className="mt-1 text-[10px] text-slate-400">هر چند ساعت یکبار هوش مصنوعی محتوای جدید تولید کند</p>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button onClick={saveAllSettings} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 shadow-lg">
              <Save className="size-4" /> {saving ? "..." : "ذخیره همه تنظیمات"}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODALS */}
      {/* ================================================================ */}

      {/* ─── Account Modal ─── */}
      {showAccountModal && (
        <Modal onClose={() => setShowAccountModal(false)} title={editingAccountId ? "ویرایش اکانت" : "افزودن اکانت جدید"}>
          <div className="space-y-5">
            {/* اطلاعات پایه */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">نام کاربری اینستاگرام *</label>
                <input type="text" value={accountForm.username || ""}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  placeholder="@username" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">رمز عبور *</label>
                <input type="password" value={accountForm.password || ""}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
            </div>

            {/* ──────── VPN / Proxy Section ──────── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                <Shield className="size-4 text-petrol-600" /> VPN و پروکسی
              </h3>

              {/* Use Proxy Toggle */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">استفاده از VPN/پروکسی</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={accountForm.useProxy ?? true}
                    onChange={(e) => setAccountForm({ ...accountForm, useProxy: e.target.checked })}
                    className="peer size-4 accent-petrol-600" />
                  <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-petrol-600 peer-checked:after:translate-x-full" />
                </label>
              </div>

              {accountForm.useProxy !== false && (
                <>
                  {/* Provider Type */}
                  <div className="mb-3">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">نوع پروکسی / VPN</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "v2ray", label: "V2Ray", icon: Server },
                        { value: "http", label: "HTTP", icon: Globe },
                        { value: "socks5", label: "SOCKS5", icon: Plug },
                        { value: "custom", label: "سفارشی", icon: Settings },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => setAccountForm({ ...accountForm, proxyType: opt.value })}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all",
                              accountForm.proxyType === opt.value
                                ? "border-petrol-500 bg-petrol-50 text-petrol-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300",
                            )}>
                            <Icon className="size-3.5" /> {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* V2Ray Link (for V2Ray type) */}
                  {accountForm.proxyType === "v2ray" && (
                    <div className="mb-3">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">لینک V2Ray</label>
                      <div className="flex gap-2">
                        <input type="text" value={accountForm.v2rayLink || ""}
                          onChange={(e) => setAccountForm({ ...accountForm, v2rayLink: e.target.value })}
                          placeholder="vless://... یا vmess://... یا trojan://... یا ss://..." dir="ltr"
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                        <button onClick={testVpnConnection} disabled={vpnTesting}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                          {vpnTesting ? (
                            <RefreshCw className="size-3.5 animate-spin" />
                          ) : (
                            <Zap className="size-3.5" />
                          )}
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
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        لینک کانفیگ V2Ray خود را وارد کنید و با کلیک روی "تست پینگ" از اتصال مطمئن شوید.
                      </p>
                    </div>
                  )}

                  {/* HTTP / SOCKS5 Config */}
                  {(accountForm.proxyType === "http" || accountForm.proxyType === "socks5") && (
                    <div className="mb-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">هاست</label>
                        <input type="text" value={accountForm.proxyConfig?.host || ""}
                          onChange={(e) => setAccountForm({
                            ...accountForm,
                            proxyConfig: { ...accountForm.proxyConfig, host: e.target.value },
                          })}
                          placeholder="example.com" dir="ltr"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">پورت</label>
                        <input type="number" value={accountForm.proxyConfig?.port || ""}
                          onChange={(e) => setAccountForm({
                            ...accountForm,
                            proxyConfig: { ...accountForm.proxyConfig, port: e.target.value },
                          })}
                          placeholder="1080" dir="ltr"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">نام کاربری (اختیاری)</label>
                        <input type="text" value={accountForm.proxyConfig?.username || ""}
                          onChange={(e) => setAccountForm({
                            ...accountForm,
                            proxyConfig: { ...accountForm.proxyConfig, username: e.target.value },
                          })}
                          placeholder="username"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">رمز عبور (اختیاری)</label>
                        <input type="password" value={accountForm.proxyConfig?.password || ""}
                          onChange={(e) => setAccountForm({
                            ...accountForm,
                            proxyConfig: { ...accountForm.proxyConfig, password: e.target.value },
                          })}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
                      </div>
                    </div>
                  )}

                  {/* Custom Proxy Config */}
                  {accountForm.proxyType === "custom" && (
                    <div className="mb-3">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">تنظیمات سفارشی پروکسی (JSON)</label>
                      <textarea value={JSON.stringify(accountForm.proxyConfig || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setAccountForm({ ...accountForm, proxyConfig: parsed });
                          } catch {
                            // allow typing invalid JSON temporarily
                          }
                        }}
                        rows={4} dir="ltr"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500"
                        placeholder='{"server": "..."}' />
                    </div>
                  )}

                  {/* VPN Alert Toggle */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-3.5 text-amber-500" />
                      <span className="text-xs font-medium text-slate-600">هشدار قطعی VPN</span>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={accountForm.vpnAlertEnabled ?? true}
                        onChange={(e) => setAccountForm({ ...accountForm, vpnAlertEnabled: e.target.checked })}
                        className="peer size-4 accent-amber-600" />
                      <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-amber-600 peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                  {editingAccountId && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="size-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">بررسی وضعیت فعلی</span>
                        {accountForm.vpnStatus && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            accountForm.vpnStatus === "connected" ? "bg-green-100 text-green-700" :
                            accountForm.vpnStatus === "disconnected" ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-500",
                          )}>
                            {accountForm.vpnStatus === "connected" ? "✅ متصل" :
                             accountForm.vpnStatus === "disconnected" ? "❌ قطع" :
                             "نامشخص"}
                          </span>
                        )}
                      </div>
                      {editingAccountId && (
                        <button onClick={() => updateVpnStatus(editingAccountId)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                          <RefreshCw className="size-3" /> بروزرسانی وضعیت
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ──────── 2FA Section ──────── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                <Hash className="size-4 text-petrol-600" /> تایید دو مرحله‌ای (2FA)
              </h3>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">فعال بودن 2FA</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={accountForm.twoFactorEnabled || false}
                    onChange={(e) => setAccountForm({ ...accountForm, twoFactorEnabled: e.target.checked })}
                    className="peer size-4 accent-petrol-600" />
                  <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-petrol-600 peer-checked:after:translate-x-full" />
                </label>
              </div>
              {accountForm.twoFactorEnabled && (
                <>
                  <div className="mb-3">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">روش تایید</label>
                    <div className="flex gap-2">
                      {[
                        { value: "app", label: "برنامه احراز هویت" },
                        { value: "sms", label: "پیامک (SMS)" },
                      ].map((opt) => (
                        <button key={opt.value} type="button"
                          onClick={() => setAccountForm({ ...accountForm, twoFactorMethod: opt.value })}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all",
                            accountForm.twoFactorMethod === opt.value
                              ? "border-petrol-500 bg-petrol-50 text-petrol-700"
                              : "border-slate-200 text-slate-500 hover:border-slate-300",
                          )}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {accountForm.twoFactorMethod === "app" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">کلید مخفی (Secret Key)</label>
                      <input type="text" value={accountForm.twoFactorSecret || ""}
                        onChange={(e) => setAccountForm({ ...accountForm, twoFactorSecret: e.target.value })}
                        placeholder="XXXX XXXX XXXX XXXX" dir="ltr"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono focus:border-petrol-500" />
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        کلید مخفی را از برنامه احراز هویت (Google Authenticator, Authy و...) وارد کنید.
                      </p>
                    </div>
                  )}
                  {accountForm.twoFactorMethod === "sms" && (
                    <p className="text-[10px] text-slate-400">
                      تایید از طریق پیامک به شماره موبایل ثبت‌شده در اینستاگرام ارسال می‌شود.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Active & Save */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">فعال</label>
                <input type="checkbox" checked={accountForm.isActive || false}
                  onChange={(e) => setAccountForm({ ...accountForm, isActive: e.target.checked })}
                  className="size-4 accent-petrol-600" />
              </div>
              <div className="flex items-center gap-2">
                {vpnTestResult && vpnTestResult.reachable && (
                  <span className="flex items-center gap-1 text-[10px] text-green-600">
                    <CheckCircle className="size-3" /> VPN: {vpnTestResult.latency}ms
                  </span>
                )}
                <button onClick={() => setShowAccountModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  انصراف
                </button>
                <button onClick={saveAccount} disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? "..." : editingAccountId ? "ویرایش" : "افزودن"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Post Modal ─── */}
      {showPostModal && (
        <Modal onClose={() => setShowPostModal(false)} title={editingPostId ? "ویرایش پست" : "پست جدید"}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">اکانت *</label>
                <select value={postForm.accountId}
                  onChange={(e) => setPostForm({ ...postForm, accountId: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value={0}>انتخاب کنید</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">محصول (اختیاری)</label>
                <select value={postForm.productId || ""}
                  onChange={(e) => setPostForm({ ...postForm, productId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value="">بدون محصول</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">نوع رسانه</label>
                <select value={postForm.mediaType}
                  onChange={(e) => setPostForm({ ...postForm, mediaType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value="image">تصویر</option>
                  <option value="video">ویدیو</option>
                  <option value="carousel">کاروسل</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">وضعیت</label>
                <select value={postForm.status}
                  onChange={(e) => setPostForm({ ...postForm, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value="draft">پیش‌نویس</option>
                  <option value="scheduled">زمان‌بندی شده</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">زمان انتشار</label>
              <input type="datetime-local" value={postForm.scheduledAt}
                onChange={(e) => setPostForm({ ...postForm, scheduledAt: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">کپشن</label>
              <textarea value={postForm.caption}
                onChange={(e) => setPostForm({ ...postForm, caption: e.target.value })} rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="متن پست اینستاگرام..." />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">هشتگ‌ها</label>
              <input type="text" value={postForm.hashtags}
                onChange={(e) => setPostForm({ ...postForm, hashtags: e.target.value })}
                placeholder="#درنیکا_ساحل #محصول"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div />
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPostModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  انصراف
                </button>
                <button onClick={savePost} disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? "..." : editingPostId ? "ویرایش" : "ایجاد"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DM Rule Modal ─── */}
      {showDmRuleModal && (
        <Modal onClose={() => setShowDmRuleModal(false)} title={editingDmRuleId ? "ویرایش قانون" : "قانون جدید"}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">اکانت *</label>
                <select value={dmRuleForm.accountId}
                  onChange={(e) => setDmRuleForm({ ...dmRuleForm, accountId: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value={0}>انتخاب کنید</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">نوع پاسخ</label>
                <select value={dmRuleForm.responseType}
                  onChange={(e) => setDmRuleForm({ ...dmRuleForm, responseType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500">
                  <option value="text">متن ثابت</option>
                  <option value="product_link">لینک محصول</option>
                  <option value="ai">پاسخ هوشمند با AI</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">اولویت</label>
                <input type="number" min={0} value={dmRuleForm.priority}
                  onChange={(e) => setDmRuleForm({ ...dmRuleForm, priority: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <label className="text-xs text-slate-600">فعال</label>
                <input type="checkbox" checked={dmRuleForm.isActive}
                  onChange={(e) => setDmRuleForm({ ...dmRuleForm, isActive: e.target.checked })}
                  className="size-4 accent-petrol-600" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">کلمات کلیدی (هر خط یک کلمه) *</label>
              <textarea value={dmRuleForm.triggerKeywords}
                onChange={(e) => setDmRuleForm({ ...dmRuleForm, triggerKeywords: e.target.value })} rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono"
                placeholder={`قیمت\nهزینه\nچقدر\nسفارش`} />
            </div>
            {dmRuleForm.responseType === "text" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">متن پاسخ</label>
                <textarea value={dmRuleForm.responseText}
                  onChange={(e) => setDmRuleForm({ ...dmRuleForm, responseText: e.target.value })} rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                  placeholder="متن خودکار که ارسال می‌شود..." />
              </div>
            )}
            {dmRuleForm.responseType === "ai" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">پرامپت هوش مصنوعی</label>
                <textarea value={dmRuleForm.aiPrompt}
                  onChange={(e) => setDmRuleForm({ ...dmRuleForm, aiPrompt: e.target.value })} rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono"
                  placeholder="به صورت دوستانه پاسخ بده و کاربر را به محصولات هدایت کن..." />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div />
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDmRuleModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  انصراف
                </button>
                <button onClick={saveDmRule} disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? "..." : editingDmRuleId ? "ویرایش" : "افزودن"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Modal Component ───
function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
            <XIcon className="size-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Inline Icons ───
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
