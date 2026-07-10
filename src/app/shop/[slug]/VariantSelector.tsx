"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Check, Minus, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRial, cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

export type ClientVariant = {
  id: number;
  name: string;
  nameEn: string | null;
  price: string;
  unitValue: string | null;
  stock: number;
  sku: string;
  unitName: string | null;
  unitSymbol: string | null;
  specSheet: Record<string, string> | null;
};

/**
 * انتخاب‌گر تنوع به‌صورت لیست:
 * - هر تنوع در یک ردیف مستقل نمایش داده می‌شود
 * - کنار هر تنوع، انتخاب‌گر تعداد + دکمهٔ افزودن به سبد (ایکون سبد خرید) قرار دارد
 */
export function VariantSelector({
  variants,
}: {
  variants: ClientVariant[];
  locale?: Locale;
}) {
  const router = useRouter();
  const [qtys, setQtys] = useState<Record<number, number>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, 1])),
  );
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function setQty(id: number, next: number, max: number) {
    setQtys((q) => ({ ...q, [id]: Math.min(Math.max(1, next), Math.max(1, max)) }));
  }

  async function addToCart(v: ClientVariant) {
    if (v.stock <= 0) return;
    setPendingId(v.id);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: v.id, quantity: qtys[v.id] ?? 1 }),
      });
      if (!res.ok) return;
      setDoneId(v.id);
      startTransition(() => router.refresh());
      setTimeout(() => setDoneId((cur) => (cur === v.id ? null : cur)), 1800);
    } finally {
      setPendingId(null);
    }
  }

  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      {variants.map((v) => {
        const qty = qtys[v.id] ?? 1;
        const out = v.stock <= 0;
        const isPending = pendingId === v.id;
        const isDone = doneId === v.id;
        return (
          <div
            key={v.id}
            className={cn(
              "rounded-2xl border bg-white p-3.5 transition-all",
              out ? "border-navy-900/10 opacity-70" : "border-navy-900/12 hover:border-petrol-400",
            )}
          >
            {/* اطلاعات تنوع */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold text-navy-900">{v.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-charcoal-500">
                  کد: {v.sku}
                  {v.unitSymbol ? ` · ${v.unitSymbol}` : ""}
                  {v.unitName ? ` (${v.unitName})` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-black text-navy-900">{formatRial(v.price)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold",
                    out ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700",
                  )}
                >
                  {out ? "ناموجود" : `موجودی ${v.stock}`}
                </span>
              </div>
            </div>

            {/* مشخصات فنی */}
            {v.specSheet && Object.keys(v.specSheet).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-navy-900/10 bg-navy-900/5">
                {Object.entries(v.specSheet).map(([key, val]) => (
                  <div key={key} className="flex justify-between bg-white px-3 py-1.5 text-[10px]">
                    <span className="font-medium text-navy-900">{key}</span>
                    <span className="text-charcoal-500">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* انتخاب تعداد + افزودن به سبد */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-navy-900/5 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setQty(v.id, qty - 1, v.stock)}
                  disabled={out || qty <= 1}
                  className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
                >
                  <Minus className="size-4" strokeWidth={2} />
                </button>
                <span className="min-w-[3ch] text-center text-sm font-bold text-navy-900">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(v.id, qty + 1, v.stock)}
                  disabled={out || qty >= v.stock}
                  className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
                >
                  <Plus className="size-4" strokeWidth={2} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => addToCart(v)}
                disabled={out || isPending}
                aria-label="افزودن به سبد خرید"
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                  isDone
                    ? "bg-green-600 text-pearl-50"
                    : "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500",
                )}
              >
                {isDone ? (
                  <><Check className="size-4" strokeWidth={2} /> اضافه شد</>
                ) : isPending ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : (
                  <><ShoppingBag className="size-4" strokeWidth={1.7} /> افزودن</>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
