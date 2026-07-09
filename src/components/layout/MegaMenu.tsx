"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Layers, Loader2, CircleDot, Headphones, MapPin, Clock, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
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
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ y: 0, scrollTop: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCloseDelay() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }

  function handleCancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

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

  // ─── درگ برای اسکرول دسته‌بندی‌ها ───
  function onMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStart.current = { y: e.clientY, scrollTop: scrollRef.current.scrollTop };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging || !scrollRef.current) return;
    const delta = e.clientY - dragStart.current.y;
    scrollRef.current.scrollTop = dragStart.current.scrollTop - delta;
  }

  function onMouseUp() {
    setIsDragging(false);
  }

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
    <div className="relative" onMouseLeave={handleCloseDelay}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => { setOpen(true); handleCancelClose(); }}
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
            onMouseEnter={handleCancelClose}
            onMouseLeave={handleCloseDelay}
            className="card absolute start-0 top-12 z-50 flex w-[640px] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl"
            style={{ height: "420px" }}
            dir="rtl"
          >
            <div className="flex h-full flex-col">
              {/* ─── ردیف بالا: دو ستونه ─── */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* ستون راست: دسته‌بندی‌ها با اسکرول درگ‌پذیر */}
                <div
                  ref={scrollRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  className={cn(
                    "w-56 shrink-0 overflow-y-auto border-l border-navy-900/10 bg-navy-900/[0.04] p-2",
                    "scrollbar-thin scrollbar-thumb-petrol-500/30 scrollbar-track-transparent",
                    isDragging ? "cursor-grabbing select-none" : "cursor-grab",
                  )}
                  style={{ direction: "ltr" }}
                >
                  <div style={{ direction: "rtl" }}>
                    <p className="sticky top-0 z-10 bg-navy-900/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-petrol-700">
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
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onClick={() => (window.location.href = `/shop?cat=${c.slug}`)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                            hoveredIndex === idx
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
                    {/* لینک مشاهده همه دسته‌بندی‌ها */}
                    {!loading && categories.length > 0 && (
                      <Link
                        href="/shop"
                        onClick={() => setOpen(false)}
                        className="sticky bottom-0 mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-petrol-600 px-3 py-2.5 text-xs font-semibold text-pearl-50 shadow-sm transition-all hover:bg-petrol-500"
                      >
                        <Layers className="size-3.5" strokeWidth={1.8} />
                        همه محصولات
                      </Link>
                    )}
                  </div>
                </div>

                {/* ستون چپ: محتوای دسته انتخاب‌شده */}
                <div className="flex-1 min-h-0 grid place-items-center p-5">
                  {!loading && categories[hoveredIndex] ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex size-16 items-center justify-center rounded-2xl bg-petrol-600/10">
                        <svg viewBox="0 0 24 24" className="size-8 text-petrol-500" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-bold text-navy-900">{categories[hoveredIndex].title}</p>
                      <p className="mt-1 text-[11px] text-charcoal-500">{categories[hoveredIndex].productCount} محصول فعال</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex size-16 items-center justify-center rounded-2xl bg-navy-900/[0.04]">
                        <svg viewBox="0 0 24 24" className="size-8 text-charcoal-300" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                        </svg>
                      </div>
                      <p className="mt-3 text-xs text-charcoal-400">دسته‌ای را انتخاب کنید</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── ردیف پایین: باکس پشتیبانی در عرض کامل ─── */}
              <div className="border-t border-navy-900/8 bg-gradient-to-br from-navy-900/[0.02] to-petrol-600/[0.04] px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-petrol-600/15">
                        <svg viewBox="0 0 24 24" className="size-4 text-petrol-700" fill="currentColor">
                          <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zM4 9.5l8 4 8-4v1.5l-8 4-8-4V9.5zm8-2.5l6.5 3.25L12 13 5.5 10.25 12 7z"/>
                        </svg>
                      </div>
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-navy-900">درنیکا ساحل</p>
                        <p className="text-[9px] text-charcoal-500">مرجع تخصصی تجهیزات صنعتی</p>
                      </div>
                    </div>
                    <div className="hidden items-center gap-3 sm:flex">
                      <div className="flex items-center gap-1.5">
                        <Headphones className="size-3 text-petrol-600" strokeWidth={1.7} />
                        <span className="text-[10px] text-charcoal-600">۰۲۱-۱۲۳۴۵۶۷۸</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="size-3 text-petrol-600" strokeWidth={1.7} />
                        <span className="text-[10px] text-charcoal-600">info@dornika.local</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-petrol-600" strokeWidth={1.7} />
                        <span className="text-[10px] text-charcoal-600">۸–۱۸</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
