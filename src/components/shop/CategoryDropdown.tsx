"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryItem = {
  id: number;
  parentId: number | null;
  slug: string;
  title: string;
  productCount: number;
};

// نوع بازگشتی برای گره‌های درخت
type CategoryTreeNode = CategoryItem & { children: CategoryTreeNode[] };

type Props = {
  categories: CategoryItem[];
};

export function CategoryDropdown({ categories }: Props) {
  const searchParams = useSearchParams();
  const currentCat = searchParams.get("cat") || "";
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // ساخت درخت سلسله‌مراتبی
  const tree = useMemo(() => {
    const map = new Map<number, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // ساختن map
    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    // چیدن درخت
    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parentId !== null && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [categories]);

  const currentTitle = currentCat
    ? categories.find((c) => c.slug === currentCat)?.title
    : "همه دسته‌بندی‌ها";

  // باز/بسته کردن زیردسته‌های یک دسته
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // تابع بازگشتی برای رندر یک دسته و زیردسته‌هایش
  function renderCategoryItem(
    cat: CategoryTreeNode,
    depth: number = 0,
  ): React.ReactNode {
    const hasChildren = cat.children.length > 0;
    const isActive = currentCat === cat.slug;
    const isExpanded = expanded.has(cat.id);

    // دسته‌های اصلی (depth === 0) با زیردسته → دکمه بازشونده
    if (depth === 0 && hasChildren) {
      return (
        <div key={cat.slug}>
          <button
            type="button"
            onClick={() => toggleExpand(cat.id)}
            className={cn(
              "flex w-full items-center justify-between px-4 py-2.5 text-xs transition-all hover:bg-petrol-50",
              isActive
                ? "bg-gradient-to-l from-petrol-50 to-transparent font-semibold text-petrol-700"
                : "text-navy-900 hover:text-petrol-700",
            )}
          >
            <span className="flex items-center gap-1.5">
              <ChevronLeft
                className={cn(
                  "size-3 text-charcoal-400 transition-transform duration-200",
                  isExpanded && "-rotate-90",
                )}
                strokeWidth={2}
              />
              <span>{cat.title}</span>
            </span>
            <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] text-charcoal-500">
              {cat.productCount}
            </span>
          </button>
          {/* زیردسته‌ها با قابلیت باز/بسته شدن */}
          {isExpanded && (
            <div className="border-r-2 border-petrol-100/60 mr-4 overflow-hidden transition-all duration-200">
              {cat.children.map((child) => renderCategoryItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // زیردسته‌ها یا دسته‌های بدون زیرمجموعه → لینک مستقیم
    return (
      <div key={cat.slug}>
        <Link
          href={`/shop?cat=${cat.slug}`}
          onClick={() => { setOpen(false); setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 100); }}
          className={cn(
            "flex items-center justify-between px-4 py-2.5 text-xs transition-all hover:bg-petrol-50",
            isActive
              ? "bg-gradient-to-l from-petrol-50 to-transparent font-semibold text-petrol-700"
              : "text-navy-900 hover:text-petrol-700",
            depth > 0 && "pr-8",
          )}
          style={depth > 0 ? { paddingRight: `${16 + depth * 16}px` } : undefined}
        >
          <span className="flex items-center gap-1.5">
            <span>{cat.title}</span>
          </span>
          <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] text-charcoal-500">
            {cat.productCount}
          </span>
        </Link>
        {/* زیردسته‌های عمیق‌تر (depth > 0) با زیردسته — بازگشتی */}
        {hasChildren && depth > 0 && (
          <div>
            {cat.children.map((child) => renderCategoryItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-8">
      {/* دکمه اصلی دراپ‌داون */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-navy-900/10 bg-white px-4 py-3 text-xs font-medium text-navy-900 transition-all hover:border-petrol-400 sm:w-auto sm:min-w-[220px]"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-petrol-600" strokeWidth={1.6} />
          {currentTitle || "همه دسته‌بندی‌ها"}
        </span>
        <ChevronDown className={`size-4 text-charcoal-400 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.6} />
      </button>

      {/* دراپ‌داون */}
      {open && (
        <div className="absolute z-30 mt-1.5 w-full min-w-[260px] overflow-hidden rounded-2xl border border-petrol-200 bg-white shadow-xl sm:w-auto sm:min-w-[280px]">
          <div className="max-h-80 overflow-y-auto py-1">
            {/* گزینه همه دسته‌بندی‌ها */}
            <Link
              href="/shop"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 text-xs transition-all hover:bg-petrol-50",
                !currentCat
                  ? "bg-gradient-to-l from-petrol-50 to-transparent font-semibold text-petrol-700"
                  : "text-navy-900 hover:text-petrol-700",
              )}
            >
              <span>همه دسته‌بندی‌ها</span>
              <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] text-charcoal-500">
                {categories.reduce((sum, c) => sum + c.productCount, 0)}
              </span>
            </Link>
            <div className="mx-3 border-t border-navy-900/5" />

            {/* دسته‌بندی‌های اصلی و زیردسته‌هایشان */}
            {tree.map((root) => renderCategoryItem(root))}
          </div>
        </div>
      )}
    </div>
  );
}
