"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, Package, ArrowRight } from "lucide-react";
import { LuxePopup } from "@/components/ui/LuxePopup";

type ProductSearchResult = {
  id: number;
  slug: string;
  title: string;
  categoryTitle: string | null;
};

export function SearchPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = (await res.json()) as ProductSearchResult[];
        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <LuxePopup open={open} onClose={onClose} title="جستجوی محصولات">
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="نام محصول، برند یا کد فنی را جستجو کنید…"
            className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-12 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
          />
          <Search className="absolute start-4 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
          <button
            type="submit"
            disabled={loading}
            className="absolute end-2 top-2 rounded-xl bg-petrol-600 px-4 py-1.5 text-[11px] font-semibold text-pearl-50 shadow-md"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : "جستجو"}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {results.length === 0 && query && !loading && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Package className="size-8 text-charcoal-400" strokeWidth={1.3} />
            <p className="text-xs text-charcoal-500">محصولی با این مشخصات یافت نشد.</p>
          </div>
        )}
        {results.map((p) => (
          <Link
            key={p.id}
            href={`/shop/${p.slug}`}
            onClick={onClose}
            className="flex items-center justify-between rounded-2xl bg-navy-900/[0.02] p-3.5 transition-colors hover:bg-petrol-600/10"
          >
            <div>
              <p className="text-sm font-bold text-navy-900">{p.title}</p>
              <p className="mt-0.5 text-[11px] text-charcoal-500">{p.categoryTitle}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-petrol-600" strokeWidth={1.8} />
          </Link>
        ))}
      </div>
    </LuxePopup>
  );
}
