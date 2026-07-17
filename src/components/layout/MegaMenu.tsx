"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, Layers, Loader2, CircleDot, Headphones, MapPin, Clock, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Category = {
  id: number;
  slug: string;
  title: string;
  productCount: number;
  children: Category[];
};

export function MegaMenu({ t, mobile = false, onClose }: { t: Dictionary; mobile?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingSub, setIsDraggingSub] = useState(false);
  const dragStart = useRef({ y: 0, scrollTop: 0 });
  const dragStartSub = useRef({ y: 0, scrollTop: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [scrollStartY, setScrollStartY] = useState(0);
  const [scrollTopStart, setScrollTopStart] = useState(0);

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

  // ─── درگ برای اسکرول زیردسته‌ها ───
  function onSubMouseDown(e: React.MouseEvent) {
    if (!subRef.current) return;
    setIsDraggingSub(true);
    dragStartSub.current = { y: e.clientY, scrollTop: subRef.current.scrollTop };
  }

  function onSubMouseMove(e: React.MouseEvent) {
    if (!isDraggingSub || !subRef.current) return;
    const delta = e.clientY - dragStartSub.current.y;
    subRef.current.scrollTop = dragStartSub.current.scrollTop - delta;
  }

  function onSubMouseUp() {
    setIsDraggingSub(false);
  }

  if (mobile) {
    const onScrollMouseDown = (e: React.MouseEvent) => {
      if (!mobileScrollRef.current) return;
      setIsDraggingScroll(true);
      setScrollStartY(e.clientY);
      setScrollTopStart(mobileScrollRef.current.scrollTop);
      mobileScrollRef.current.style.cursor = "grabbing";
    };
    const onScrollMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingScroll || !mobileScrollRef.current) return;
      mobileScrollRef.current.scrollTop = scrollTopStart + (scrollStartY - e.clientY);
    };
    const onScrollMouseUp = () => {
      setIsDraggingScroll(false);
      if (mobileScrollRef.current) mobileScrollRef.current.style.cursor = "grab";
    };
    const onTouchScrollStart = (e: React.TouchEvent) => {
      if (!mobileScrollRef.current) return;
      setScrollStartY(e.touches[0].clientY);
      setScrollTopStart(mobileScrollRef.current.scrollTop);
    };
    const onTouchScrollMove = (e: React.TouchEvent) => {
      if (!mobileScrollRef.current) return;
      mobileScrollRef.current.scrollTop = scrollTopStart + (scrollStartY - e.touches[0].clientY);
    };

    return (
      <div
        ref={mobileScrollRef}
        onMouseDown={onScrollMouseDown}
        onMouseMove={onScrollMouseMove}
        onMouseUp={onScrollMouseUp}
        onMouseLeave={onScrollMouseUp}
        onTouchStart={onTouchScrollStart}
        onTouchMove={onTouchScrollMove}
        className="max-h-48 overflow-y-auto overscroll-contain space-y-1 thin-scroll select-none"
        style={{ cursor: "grab" }}
      >
        <Link
          href="/shop"
          onClick={() => onClose?.()}
          className="flex items-center justify-between rounded-2xl bg-pearl-100/[0.04] px-4 py-3 text-sm text-pearl-100 hover:bg-pearl-100/[0.07] shrink-0"
        >
          <span>همه محصولات</span>
          <ChevronLeft className="size-4" />
        </Link>
        {loading && <p className="py-4 text-center text-xs text-pearl-200/50">در حال بارگذاری...</p>}
        {categories.map((c) => (
          <div key={c.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setExpandedCat(expandedCat === c.slug ? null : c.slug)}
              className="flex w-full items-center justify-between rounded-2xl bg-pearl-100/[0.04] px-4 py-3 text-sm text-pearl-100 hover:bg-pearl-100/[0.07]"
            >
              <span className="flex items-center gap-2">
                <CircleDot className="size-3.5 text-petrol-300" strokeWidth={1.8} />
                {c.title}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-pearl-200/40">{c.productCount}</span>
                <ChevronDown className={cn("size-3.5 text-pearl-200/40 transition-transform", expandedCat === c.slug && "rotate-180")} strokeWidth={1.8} />
              </div>
            </button>
            {expandedCat === c.slug && (
              <div className="overflow-y-auto max-h-40 space-y-1 py-1 pr-4">
                {c.children.length > 0 ? c.children.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/shop?cat=${sub.slug}`}
                    onClick={() => onClose?.()}
                    className="flex items-center gap-2 rounded-xl bg-pearl-100/[0.02] px-3 py-2 text-xs text-pearl-100/70 hover:bg-pearl-100/[0.05]"
                  >
                    <span className="size-1.5 rounded-full bg-petrol-400/50" />
                    {sub.title}
                    <span className="mr-auto text-[9px] text-pearl-200/40">{sub.productCount}</span>
                  </Link>
                )) : (
                  <p className="px-3 py-2 text-xs text-pearl-200/30">بدون زیرمجموعه</p>
                )}
              </div>
            )}
          </div>
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
            className="card absolute start-0 top-12 z-50 flex w-[440px] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl"
            style={{ height: "380px" }}
            dir="rtl"
          >
            <div className="flex h-full flex-col">
              {/* ─── ردیف بالا: دو ستونه ─── */}
              <div className="flex flex-1 overflow-hidden min-h-0 w-full">
                {/* ستون راست: دسته‌بندی‌ها با اسکرول */}
                <div
                  ref={scrollRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onWheel={(e) => {
                    if (!scrollRef.current) return;
                    const el = scrollRef.current;
                    const atTop = el.scrollTop === 0;
                    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
                    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                      e.stopPropagation();
                    }
                  }}
                  className={cn(
                    "w-44 shrink-0 overflow-y-auto border-l border-navy-900/10 bg-navy-900/[0.04] p-2",
                    "scrollbar-thin scrollbar-thumb-petrol-500/30 scrollbar-track-transparent",
                    isDragging ? "cursor-grabbing select-none" : "cursor-grab",
                  )}
                  style={{ direction: "ltr" }}
                >
                  <div style={{ direction: "rtl" }}>
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
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onClick={() => (window.location.href = `/shop?cat=${c.slug}`)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all",
                            hoveredIndex === idx
                              ? "bg-pearl-100 text-navy-900"
                              : "text-charcoal-500 hover:bg-pearl-100/50 hover:text-navy-900",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <CircleDot className="size-3.5 text-petrol-600" strokeWidth={1.8} />
                            <span>{c.title}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-[10px] opacity-60">{c.productCount}</span>
                            {c.children.length > 0 && (
                              <ChevronLeft className={cn("size-3 transition-transform", hoveredIndex === idx ? "opacity-100" : "opacity-40")} strokeWidth={1.8} />
                            )}
                          </span>
                        </button>
                      ))}
                    {!loading && categories.length > 0 && (
                      <Link
                        href="/shop"
                        onClick={() => setOpen(false)}
                        className="sticky bottom-0 mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-petrol-600 px-3 py-2 text-xs font-semibold text-pearl-50 shadow-sm transition-all hover:bg-petrol-500"
                      >
                        <Layers className="size-3.5" strokeWidth={1.8} />
                        همه محصولات
                      </Link>
                    )}
                  </div>
                </div>

                {/* ستون چپ: زیرمجموعه‌های دسته والد انتخاب‌شده */}
                <div
                  ref={subRef}
                  onMouseDown={onSubMouseDown}
                  onMouseMove={onSubMouseMove}
                  onMouseUp={onSubMouseUp}
                  onMouseLeave={onSubMouseUp}
                  onWheel={(e) => {
                    if (!subRef.current) return;
                    const el = subRef.current;
                    const atTop = el.scrollTop === 0;
                    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
                    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                      e.stopPropagation();
                    }
                  }}
                  className={cn(
                    "flex-1 min-h-0 overflow-y-auto p-4",
                    isDraggingSub ? "cursor-grabbing select-none" : "cursor-grab",
                  )}
                >
                  {!loading && categories[hoveredIndex] ? (
                    <div>
                      <div className="mb-3">
                        <p className="text-sm font-bold text-navy-900">{categories[hoveredIndex].title}</p>
                        <p className="text-[10px] text-charcoal-500 mt-0.5">{categories[hoveredIndex].productCount} محصول</p>
                      </div>
                      {categories[hoveredIndex].children.length > 0 ? (
                        <div className="space-y-1">
                          {categories[hoveredIndex].children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/shop?cat=${child.slug}`}
                              onClick={() => setOpen(false)}
                              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-charcoal-600 transition-all hover:bg-pearl-100/70 hover:text-navy-900"
                            >
                              <span className="flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-petrol-400/50" />
                                {child.title}
                              </span>
                              <span className="text-[10px] text-charcoal-400">{child.productCount}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-navy-900/[0.04]">
                            <svg viewBox="0 0 24 24" className="size-6 text-charcoal-300" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                            </svg>
                          </div>
                          <p className="mt-2 text-xs text-charcoal-400">بدون زیرمجموعه</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-navy-900/[0.04]">
                        <svg viewBox="0 0 24 24" className="size-7 text-charcoal-300" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                        </svg>
                      </div>
                      <p className="mt-2 text-xs text-charcoal-400">دسته‌ای را انتخاب کنید</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── باکس پشتیبانی ─── */}
              <div className="border-t border-navy-900/8 bg-gradient-to-br from-navy-900/[0.02] to-petrol-600/[0.04] px-4 py-3 w-full">
                <div className="flex items-center justify-between w-full gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-petrol-600/15">
                      <Headphones className="size-4 text-petrol-700" strokeWidth={1.6} />
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-bold text-navy-900">درنیکا ساحل</p>
                      <p className="text-[9px] text-charcoal-500">مرجع تخصصی تجهیزات صنعتی</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
