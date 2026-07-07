"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Layers, Loader2, CircleDot } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatRial } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Category = {
  id: number;
  slug: string;
  title: string;
  productCount: number;
};

export function MegaMenu({ t, mobile = false }: { t: Dictionary; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if ((open || mobile) && !loaded) {
      setLoading(true);
      fetch("/api/categories")
        .then((r) => r.json() as Promise<Category[]>)
        .then((data) => {
          setCategories(data);
          setLoaded(true);
        })
        .finally(() => setLoading(false));
    }
  }, [open, mobile, loaded]);

  if (mobile) {
    return (
      <div className="space-y-1.5">
        <Link
          href="/shop"
          className="flex items-center justify-between rounded-2xl bg-pearl-100/[0.04] px-4 py-3 text-sm text-pearl-100 hover:bg-pearl-100/[0.07]"
        >
          <span>همه محصولات</span>
          <ChevronLeft className="size-4" />
        </Link>
        {loading && <p className="py-4 text-center text-xs text-pearl-200/50">در حال بارگذاری...</p>}
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?cat=${c.slug}`}
            className="flex items-center justify-between rounded-2xl bg-pearl-100/[0.04] px-4 py-3 text-sm text-pearl-100 hover:bg-pearl-100/[0.07]"
          >
            <span className="flex items-center gap-2">
              <CircleDot className="size-3.5 text-petrol-300" strokeWidth={1.8} />
              {c.title}
            </span>
            <span className="text-[10px] text-pearl-200/40">{c.productCount}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-petrol-600 px-3.5 text-xs font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500"
      >
        <Layers className="size-4" strokeWidth={1.7} />
        <span>دسته‌بندی‌ها</span>
        <ChevronLeft className={cn("size-3.5 transition-transform duration-300", open ? "-rotate-90" : "rotate-0")} strokeWidth={1.8} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22 }}
            className="card absolute end-0 top-12 z-50 flex w-[640px] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl"
            dir="rtl"
          >
            <div className="w-56 shrink-0 border-l border-navy-900/10 bg-navy-900/[0.04] p-2">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-petrol-700">
                دسته‌بندی‌ها
              </p>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-petrol-600" />
                </div>
              )}
              {!loading &&
                categories.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => (window.location.href = `/shop?cat=${c.slug}`)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                      activeIndex === idx
                        ? "bg-pearl-100 text-navy-900"
                        : "text-charcoal-500 hover:bg-pearl-100/50 hover:text-navy-900",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <CircleDot className="size-3.5 text-petrol-600" strokeWidth={1.8} />
                      <span>{c.title}</span>
                    </span>
                    <span className="text-[10px] opacity-60">{c.productCount}</span>
                  </button>
                ))}
            </div>

            <div className="flex-1 p-5">
              {!loading && categories[activeIndex] && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-navy-900">{categories[activeIndex].title}</h3>
                    <Link
                      href={`/shop?cat=${categories[activeIndex].slug}`}
                      className="text-[11px] font-semibold text-petrol-700 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      مشاهده همه ←
                    </Link>
                  </div>
                  <p className="mt-2 text-[11px] text-charcoal-500">
                    {categories[activeIndex].productCount} محصول فعال در این دسته
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <SampleProducts slug={categories[activeIndex].slug} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SampleProducts({ slug }: { slug: string }) {
  const [items, setItems] = useState<{ id: number; title: string; slug: string; minPrice: string }[]>([]);
  useEffect(() => {
    setItems([]);
    fetch(`/api/search?cat=${slug}`)
      .then((r) => r.json())
      .then((d) => setItems(d?.slice(0, 4) || []))
      .catch(() => {});
  }, [slug]);
  if (items.length === 0) {
    return <p className="col-span-2 py-6 text-center text-[11px] text-charcoal-500">محصولی یافت نشد</p>;
  }
  return items.map((p) => (
    <Link key={p.id} href={`/shop/${p.slug}`} className="rounded-xl bg-navy-900/[0.02] p-2.5 transition-colors hover:bg-petrol-600/10">
      <p className="line-clamp-2 text-[11px] font-medium text-navy-900">{p.title}</p>
      <p className="mt-1 text-[10px] text-petrol-700">از {formatRial(p.minPrice)}</p>
    </Link>
  ));
}
