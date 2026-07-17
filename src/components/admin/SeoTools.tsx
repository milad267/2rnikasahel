"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Loader2, Plus, X, FileText, ExternalLink, Save, ChevronDown, ChevronUp, Image as ImageIcon, Wand2, Eye, Edit3, BarChart3, TrendingUp, Target, Globe, CheckCircle2, AlertTriangle, Copy, Download, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SeoResult {
  url: string; title: string; description: string; keywords: string[];
  canonical: string; og: { title: string; description: string; image: string };
  headings: { h1: string[]; h2: string[] };
  stats: { titleLength: number; descriptionLength: number; h1Count: number; h2Count: number; approxWords: number };
}

interface GeneratedPost {
  title: string; slug: string; excerpt: string; metaTitle: string; metaDesc: string; content: string; image?: string;
}

interface SeoScore {
  score: number; title: { ok: boolean; msg: string }; description: { ok: boolean; msg: string };
  keywords: { ok: boolean; msg: string }; headings: { ok: boolean; msg: string };
  og: { ok: boolean; msg: string }; words: { ok: boolean; msg: string };
}

function calcScore(r: SeoResult): SeoScore {
  const checks = {
    title: { ok: r.title.length >= 10 && r.title.length <= 70, msg: `${r.title.length} کاراکتر ${r.title.length >= 10 && r.title.length <= 70 ? "✅" : "⚠️"}` },
    description: { ok: r.description.length >= 50 && r.description.length <= 165, msg: `${r.description.length} کاراکتر ${r.description.length >= 50 && r.description.length <= 165 ? "✅" : "⚠️"}` },
    keywords: { ok: r.keywords.length >= 3, msg: `${r.keywords.length} کلمه کلیدی` },
    headings: { ok: r.headings.h1.length === 1 && r.headings.h2.length > 0, msg: `${r.headings.h1.length} H1, ${r.headings.h2.length} H2` },
    og: { ok: !!r.og.title, msg: r.og.title ? "✅ دارد" : "❌ ندارد" },
    words: { ok: r.stats.approxWords >= 300, msg: `${r.stats.approxWords} کلمه ${r.stats.approxWords >= 300 ? "✅" : "⚠️"}` },
  };
  const okCount = Object.values(checks).filter(c => c.ok).length;
  return { score: Math.round((okCount / 6) * 100), ...checks };
}

export default function SeoTools() {
  const [urls, setUrls] = useState<string[]>([""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<SeoResult[]>([]);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [editingPost, setEditingPost] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [showAiImage, setShowAiImage] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<string>("scores");
  const [keywordSearch, setKeywordSearch] = useState("");

  // قفل اسکرول بدنه وقتی مودال باز است
  useEffect(() => {
    if (showAiImage) {
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
  }, [showAiImage]);

  const allKeywords = Array.from(new Set(results.flatMap(r => r.keywords))).slice(0, 50);
  const allTitles = results.map(r => r.title).filter(Boolean);
  const scores = results.map(r => ({ url: r.url, score: calcScore(r) }));

  const filteredKeywords = keywordSearch
    ? allKeywords.filter(k => k.includes(keywordSearch))
    : allKeywords;

  const keywordFreq = allKeywords.reduce((acc: Record<string, number>, k) => {
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  function setUrl(i: number, v: string) { setUrls(prev => prev.map((u, idx) => (idx === i ? v : u))); }
  function addUrl() { if (urls.length < 5) setUrls(prev => [...prev, ""]); }
  function removeUrl(i: number) { setUrls(prev => prev.filter((_, idx) => idx !== i)); }
  function toggleCard(i: number) { setExpandedCards(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]); }

  async function analyzeAll() {
    const list = urls.map(u => u.trim()).filter(Boolean);
    if (!list.length) { toast.error("حداقل یک آدرس وارد کنید"); return; }
    setAnalyzing(true); setResults([]);
    const collected: SeoResult[] = [];
    for (const url of list) {
      try {
        const res = await fetch("/api/admin/seo-competitors/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        const data = await res.json();
        if (data.ok) collected.push(data as SeoResult);
        else toast.error(`${url}: ${data.error}`);
      } catch { toast.error(`خطا در تحلیل ${url}`); }
    }
    setResults(collected);
    if (collected.length) {
      toast.success(`${collected.length} سایت تحلیل شد`);
      setActiveResultTab("scores");
    }
    setAnalyzing(false);
  }

  async function generate(save: boolean) {
    if (!topic.trim()) { toast.error("موضوع مقاله را وارد کنید"); return; }
    if (save) setSaving(true); else setGenerating(true);
    try {
      const res = await fetch("/api/admin/seo-competitors/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topic.trim(), keywords: allKeywords, competitorTitles: allTitles, save }) });
      const data = await res.json();
      if (data.ok) {
        setPost(data.post); setEditingPost(false);
        toast.success(save ? "✅ پیش‌نویس در بلاگ ذخیره شد" : "✅ محتوا تولید شد");
      } else toast.error(data.error);
    } catch { toast.error("خطا"); }
    if (save) setSaving(false); else setGenerating(false);
  }

  async function generateImage() {
    if (!aiImagePrompt.trim() || !post) return;
    setAiImageLoading(true);
    try {
      const res = await fetch("/api/admin/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `یک توضیح کوتاه برای تصویر مرتبط با این موضوع بده: "${aiImagePrompt}". فقط متن کوتاه ۱۰ کلمه‌ای بنویس.` }) });
      const data = await res.json();
      if (data.ok) {
        const imageDesc = (data.response || data.reply || "").slice(0, 200);
        const imageUrl = `https://placehold.co/800x400/134b5f/ffffff?text=${encodeURIComponent(imageDesc.slice(0, 50))}`;
        setPost(prev => prev ? { ...prev, image: imageUrl } : prev);
        toast.success("✅ تصویر تولید شد");
      } else toast.error(data.error || "خطا");
    } catch { toast.error("خطا"); }
    setAiImageLoading(false); setShowAiImage(false);
  }

  function exportData() {
    const dataStr = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(dataStr);
    toast.success("📋 داده‌ها کپی شد");
  }

  return (
    <div className="space-y-6">
      {/* بخش تحلیل */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Globe className="size-4 text-purple-600" /> ۱. آدرس سایت‌های رقیب
        </h3>
        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-5 text-center">{i + 1}</span>
              <input value={url} onChange={e => setUrl(i, e.target.value)} placeholder="https://competitor.com" dir="ltr"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400 font-mono" />
              {urls.length > 1 && <button onClick={() => removeUrl(i)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-500"><X className="size-4" /></button>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          {urls.length < 5 && <button onClick={addUrl} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><Plus className="size-3.5" /> افزودن</button>}
          <button onClick={analyzeAll} disabled={analyzing}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            {analyzing ? "در حال تحلیل..." : "تحلیل کن"}
          </button>
          {results.length > 0 && (
            <button onClick={exportData} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50">
              <Download className="size-3.5" /> خروجی JSON
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Overview */}
      {scores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scores.map((s, i) => (
            <div key={i} className={cn(
              "rounded-xl border-2 p-3 text-center",
              s.score.score >= 80 ? "border-green-200 bg-green-50" :
              s.score.score >= 50 ? "border-amber-200 bg-amber-50" :
              "border-red-200 bg-red-50"
            )}>
              <p className={cn("text-2xl font-black",
                s.score.score >= 80 ? "text-green-600" :
                s.score.score >= 50 ? "text-amber-600" : "text-red-600"
              )}>{s.score.score}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">امتیاز {new URL(s.url).hostname}</p>
            </div>
          ))}
        </div>
      )}

      {/* Result Tabs */}
      {results.length > 0 && (
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto">
          {[
            { id: "scores", label: "📊 امتیازات", desc: "Scores" },
            { id: "keywords", label: "🔑 کلمات کلیدی", desc: `${topKeywords.length} عدد` },
            { id: "compare", label: "📋 مقایسه", desc: "Comparison" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveResultTab(t.id)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all flex-1 justify-center whitespace-nowrap",
                activeResultTab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Scores Tab */}
      {activeResultTab === "scores" && (
        <div className="grid gap-4">
          {results.map((r, i) => {
            const sc = scores[i]?.score;
            const isOpen = expandedCards.includes(i);
            return (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button onClick={() => toggleCard(i)} className="flex w-full items-center justify-between gap-3 bg-slate-50/80 px-5 py-3 text-right transition-colors hover:bg-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs",
                      sc && sc.score >= 80 ? "bg-green-100 text-green-700" :
                      sc && sc.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>{sc?.score || "?"}</div>
                    <div className="min-w-0">
                      <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline" dir="ltr">
                        {r.url.replace("https://", "").replace("http://", "").slice(0, 40)} <ExternalLink className="size-3" />
                      </a>
                      <p className="mt-0.5 text-[10px] text-slate-600 truncate">{r.title?.slice(0, 80) || "بدون عنوان"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className={cn("size-4 text-slate-500 transition-transform", isOpen && "rotate-180")} strokeWidth={1.8} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-5">
                    <div className="grid gap-3 sm:grid-cols-3 mb-4">
                      {sc && Object.entries(sc).filter(([k]) => k !== "score").map(([key, val]: any) => (
                        <div key={key} className={cn("rounded-lg border p-2.5 text-[10px]", val.ok ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                          <span className="font-bold">{key === "og" ? "Open Graph" : key === "title" ? "عنوان" : key === "description" ? "توضیحات" : key === "keywords" ? "کلمات کلیدی" : key === "headings" ? "تیترها" : key === "words" ? "طول محتوا" : key}</span>
                          <p className="mt-0.5">{val.msg}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-600 mb-1">عنوان</p>
                        <p className="text-[11px] text-slate-700 break-words">{r.title || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-600 mb-1">توضیحات</p>
                        <p className="text-[11px] text-slate-700 break-words">{r.description || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-600 mb-1">کلمات کلیدی</p>
                        <div className="flex flex-wrap gap-1">
                          {r.keywords.length > 0 ? r.keywords.slice(0, 10).map((k, idx) => (
                            <span key={idx} className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] text-purple-700">{k}</span>
                          )) : <span className="text-[10px] text-slate-500">—</span>}
                          {r.keywords.length > 10 && <span className="text-[9px] text-slate-500">+{r.keywords.length - 10}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Keywords Tab */}
      {activeResultTab === "keywords" && results.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">🔑 کلمات کلیدی یافت شده ({allKeywords.length})</h3>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-slate-400" strokeWidth={1.6} />
              <input type="text" value={keywordSearch} onChange={e => setKeywordSearch(e.target.value)} placeholder="جستجو..."
                className="rounded-lg border border-slate-200 py-1.5 pr-8 text-[10px] outline-none w-32 focus:border-purple-400" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {topKeywords.map(([kw, freq], i) => (
              <span key={i} className="rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-[10px] text-purple-700 flex items-center gap-1">
                {kw}
                <span className="text-[8px] bg-purple-200 rounded-full px-1.5 py-0.5">{freq}</span>
              </span>
            ))}
          </div>
          {keywordSearch && (
            <div className="flex flex-wrap gap-1.5">
              {filteredKeywords.map((kw, i) => (
                <span key={i} className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{kw}</span>
              ))}
              {filteredKeywords.length === 0 && <span className="text-[10px] text-slate-400">موردی یافت نشد</span>}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(allKeywords.join("، ")); toast.success("📋 کپی شد"); }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] text-slate-600 hover:bg-slate-50">
              <Copy className="size-2.5" /> کپی همه
            </button>
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeResultTab === "compare" && results.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-900 mb-4">📋 مقایسه رقبا</h3>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-right font-semibold text-slate-600">معیار</th>
                {results.map((r, i) => (
                  <th key={i} className="px-3 py-2 text-right font-semibold text-purple-700">#{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "طول عنوان", get: (r: SeoResult) => `${r.stats.titleLength} کاراکتر` },
                { label: "طول توضیحات", get: (r: SeoResult) => `${r.stats.descriptionLength} کاراکتر` },
                { label: "کلمات کلیدی", get: (r: SeoResult) => `${r.keywords.length} عدد` },
                { label: "H1", get: (r: SeoResult) => `${r.stats.h1Count} عدد` },
                { label: "H2", get: (r: SeoResult) => `${r.stats.h2Count} عدد` },
                { label: "تعداد کلمات", get: (r: SeoResult) => `${r.stats.approxWords} کلمه` },
                { label: "Open Graph", get: (r: SeoResult) => r.og.title ? "✅ دارد" : "❌ ندارد" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-600">{row.label}</td>
                  {results.map((r, j) => (
                    <td key={j} className="px-3 py-2 text-slate-700">{row.get(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* تولید محتوا */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="size-4 text-purple-600" /> ۲. تولید مقاله سئو شده
        </h3>
        <p className="mb-4 text-[11px] text-slate-600">
          {allKeywords.length > 0 ? `از ${allKeywords.length} کلمه کلیدی رقبا استفاده می‌شود.` : "بدون تحلیل رقبا هم می‌توانید مقاله تولید کنید."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="موضوع مقاله: راهنمای انتخاب شیرآلات صنعتی"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400" />
          <div className="flex gap-2 shrink-0">
            <button onClick={() => generate(false)} disabled={generating || saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {generating ? "..." : "تولید محتوا"}
            </button>
          </div>
        </div>
      </div>

      {/* پیش‌نمایش مقاله */}
      {post && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="relative bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
            {post.image ? (
              <div className="relative group">
                <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setShowAiImage(true)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100">
                    <Wand2 className="size-3.5" /> تغییر تصویر
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center flex-col gap-2">
                <ImageIcon className="size-10 text-slate-300" strokeWidth={1.2} />
                <p className="text-xs text-slate-500">تصویر مقاله</p>
                <button onClick={() => setShowAiImage(true)} className="flex items-center gap-1 rounded-full bg-purple-600 px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-purple-500">
                  <Sparkles className="size-3" /> ساخت تصویر
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="size-4 text-purple-600" /> {post.title}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingPost(!editingPost); if (!editingPost) setEditContent(post.content); }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
                  <Edit3 className="size-3" /> {editingPost ? "پایان" : "ویرایش"}
                </button>
                <button onClick={() => generate(true)} disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  ذخیره در بلاگ
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs mb-4">
              <div><span className="text-[10px] font-semibold text-slate-600">عنوان:</span><p className="text-slate-700">{post.title}</p></div>
              <div><span className="text-[10px] font-semibold text-slate-600">Slug:</span><p className="text-slate-700 font-mono text-[10px]" dir="ltr">/{post.slug}</p></div>
              <div className="sm:col-span-2"><span className="text-[10px] font-semibold text-slate-600">متای سئو:</span><p className="text-slate-600 text-[10px]">{post.metaTitle} — {post.metaDesc}</p></div>
              <div className="sm:col-span-2"><span className="text-[10px] font-semibold text-slate-600">خلاصه:</span><p className="text-slate-700">{post.excerpt}</p></div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-semibold text-slate-700">محتوای مقاله</p>
              {editingPost ? (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={15}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-500 font-mono leading-6" />
              ) : (
                <div className="prose prose-sm max-h-80 max-w-none overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-7 text-slate-700"
                  dangerouslySetInnerHTML={{ __html: post.content }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* مودال ساخت تصویر */}
      {showAiImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAiImage(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ImageIcon className="size-4 text-purple-600" /> ساخت تصویر</h3>
              <button onClick={() => setShowAiImage(false)} className="text-slate-500 hover:text-slate-600"><X className="size-4" /></button>
            </div>
            <p className="mb-3 text-xs text-slate-600">توصیف کنید چه تصویری می‌خواهید:</p>
            <input value={aiImagePrompt} onChange={e => setAiImagePrompt(e.target.value)} placeholder="یک شیرآلات صنعتی استیل..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-500" />
            <div className="mt-3 flex items-center gap-2">
              <button onClick={generateImage} disabled={aiImageLoading || !aiImagePrompt.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
                {aiImageLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {aiImageLoading ? "..." : "ساخت تصویر"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
