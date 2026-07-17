"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Check, Minus, Plus, Loader2, ChevronDown, Layers, CreditCard } from "lucide-react";
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
 * انتخاب‌گر تنوع به‌صورت کشوی بازشونده (Dropdown):
 * - یک دکمهٔ کشویی که با کلیک باز/بسته می‌شود
 * - داخل کشو، هر تنوع یک نوار نازک است با انتخاب‌گر تعداد + دکمهٔ سبد خرید
 * - زیر کشو، دکمهٔ «تکمیل سفارش و پرداخت»
 */
export function VariantSelector({
  variants,
}: {
  variants: ClientVariant[];
  locale?: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const totalStock = variants.reduce((s, v) => s + Math.max(0, v.stock), 0);

  return (
    <div className="space-y-3">
      {/* دکمهٔ کشو */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3.5 text-start transition-all",
          open ? "border-petrol-500 ring-2 ring-petrol-500/15" : "border-navy-900/12 hover:border-petrol-400",
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-petrol-600/12 text-petrol-700">
            <Layers className="size-4.5" strokeWidth={1.6} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-bold text-navy-900">انتخاب تنوع</span>
            <span className="text-[11px] text-charcoal-500">{variants.length} تنوع · مجموع موجودی {totalStock}</span>
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 text-charcoal-400 transition-transform duration-300", open && "rotate-180 text-petrol-700")}
          strokeWidth={1.8}
        />
      </button>

      {/* لیست تنوع‌ها (نوارهای نازک) */}
      {open && (
        <div className="overflow-hidden">
          <div className="space-y-2 rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] p-2">
              {variants.map((v) => {
                const qty = qtys[v.id] ?? 1;
                const out = v.stock <= 0;
                const isPending = pendingId === v.id;
                const isDone = doneId === v.id;
                return (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 transition-all",
                      out ? "border-navy-900/10 opacity-60" : "border-navy-900/10 hover:border-petrol-300",
                    )}
                  >
                    {/* نام + قیمت */}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-bold text-navy-900">{v.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[11px] font-black text-petrol-700">{formatRial(v.price)}</span>
                        <span className="text-[9px] text-charcoal-400">
                          {out ? "ناموجود" : `موجودی ${v.stock}`}
                          {v.unitSymbol ? ` · ${v.unitSymbol}` : ""}
                        </span>
                      </div>
                    </div>

                    {/* تعداد */}
                    <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy-900/5 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setQty(v.id, qty - 1, v.stock)}
                        disabled={out || qty <= 1}
                        className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
                      >
                        <Minus className="size-3.5" strokeWidth={2} />
                      </button>
                      <span className="min-w-[2ch] text-center text-xs font-bold text-navy-900">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(v.id, qty + 1, v.stock)}
                        disabled={out || qty >= v.stock}
                        className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
                      >
                        <Plus className="size-3.5" strokeWidth={2} />
                      </button>
                    </div>

                    {/* دکمهٔ سبد خرید */}
                    <button
                      type="button"
                      onClick={() => addToCart(v)}
                      disabled={out || isPending}
                      aria-label="افزودن به سبد خرید"
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        isDone
                          ? "bg-green-600 text-pearl-50"
                          : "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500",
                      )}
                    >
                      {isDone ? (
                        <Check className="size-4" strokeWidth={2} />
                      ) : isPending ? (
                        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <ShoppingBag className="size-4" strokeWidth={1.7} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* دکمهٔ تکمیل سفارش و پرداخت */}
      <button
        type="button"
        onClick={() => router.push("/checkout")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full bg-navy-900 px-6 py-3.5 text-sm font-bold text-pearl-50 transition-all hover:bg-navy-800"
      >
        <CreditCard className="size-5" strokeWidth={1.8} />
        تکمیل سفارش و پرداخت
      </button>
    </div>
  );
}
