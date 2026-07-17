"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Loader2, Package, ArrowRight, Sparkles, X } from "lucide-react";
import { LuxePopup } from "@/components/ui/LuxePopup";
import { formatRial } from "@/lib/utils";

type ProductSearchResult = {
  id: number;
  slug: string;
  title: string;
  categoryTitle: string | null;
  minPrice?: string;
  coverImage?: string | null;
};

const suggestions = [
  "پمپ سانتریفیوژ", "لوله فولادی", "شیر صنعتی", "کابل برق",
  "هیتر صنعتی", "بوستر پمپ", "رادیاتور پنلی", "مانومتر",
];

export function SearchPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggest, setAiSuggest] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setAiSuggest(null);
    }
  }, [open]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) { setResults([]); setAiSuggest(null); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data || []);
        }
      } finally { setLoading(false); }
    }, 350);
  }

  useEffect(() => {
    if (query.trim().length < 3 || results.length > 0 || loading) { setAiSuggest(null); return; }
    const t = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `کاربر دنبال "${query}" می‌گردد. ۳ محصول مشابه از دسته‌بندی‌های تجهیزات صنعتی پیشنهاد بده فقط به صورت لیست خطی جدا شده با کاما. مثال: پمپ سانتریفیوژ, لوله فولادی, شیر صنعتی` }),
        });
        const data = await res.json();
        if (data.ok) setAiSuggest(data.response?.slice(0, 200) || null);
      } catch {}
      setAiLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [query, results, loading]);

  return (
    <LuxePopup open={open} onClose={onClose} title="🔍 جستجوی هوشمند">
      <div className="relative mb-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="نام محصول، برند یا کد فنی را جستجو کنید…"
          className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-12 ps-11 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
        />
        <Search className="absolute start-4 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
        {loading && <Loader2 className="absolute end-4 top-3.5 size-4 animate-spin text-petrol-600" />}
        {query && !loading && (
          <button onClick={() => { setQuery(""); setResults([]); setAiSuggest(null); inputRef.current?.focus(); }}
            className="absolute end-3 top-3 text-charcoal-400 hover:text-charcoal-600">
            <X className="size-4" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* AI Suggestions */}
      {aiSuggest && !loading && results.length === 0 && (
        <div className="mb-4 rounded-2xl bg-purple-50 border border-purple-200 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="size-3 text-purple-600" strokeWidth={1.6} />
            <span className="text-[10px] font-semibold text-purple-700">پیشنهاد هوش مصنوعی</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {aiSuggest.split(",").map((s, i) => (
              <button key={i} onClick={() => { setQuery(s.trim()); handleQueryChange(s.trim()); }}
                className="rounded-lg bg-purple-100 px-2.5 py-1.5 text-[10px] font-medium text-purple-700 hover:bg-purple-200 transition-colors">
                {s.trim()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions when no query */}
      {!query && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-charcoal-400">پیشنهادها</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} onClick={() => { setQuery(s); handleQueryChange(s); }}
                className="rounded-lg bg-navy-900/[0.04] px-2.5 py-1.5 text-[10px] text-charcoal-600 hover:bg-petrol-50 hover:text-petrol-700 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {aiLoading && (
          <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-purple-600">
            <Sparkles className="size-3 animate-pulse" strokeWidth={1.6} />
            هوش مصنوعی در حال پیشنهاد...
          </div>
        )}
        {results.length > 0 && (
          <p className="text-[10px] font-semibold text-charcoal-400">{results.length} نتیجه</p>
        )}
        {results.map((p) => (
          <Link key={p.id} href={`/shop/${p.slug}`} onClick={onClose}
            className="flex items-center gap-3 rounded-2xl bg-navy-900/[0.02] p-3 transition-colors hover:bg-petrol-600/10">
            <div className="size-12 shrink-0 rounded-xl bg-slate-100 overflow-hidden">
              {p.coverImage ? <img src={p.coverImage} alt="" className="size-full object-cover" /> : <Package className="size-5 m-auto mt-3.5 text-slate-400" strokeWidth={1.3} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-navy-900 line-clamp-1">{p.title}</p>
              <p className="mt-0.5 text-[10px] text-charcoal-500">{p.categoryTitle || "محصول"}{p.minPrice ? ` · ${formatRial(p.minPrice)}` : ""}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-petrol-600" strokeWidth={1.8} />
          </Link>
        ))}
        {query && results.length === 0 && !loading && !aiSuggest && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Package className="size-8 text-charcoal-400" strokeWidth={1.3} />
            <p className="text-xs text-charcoal-500">محصولی یافت نشد.</p>
          </div>
        )}
      </div>
    </LuxePopup>
  );
}
