"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ShoppingBag, Check, Minus, Plus, ChevronDown, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRial, cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import { motion, AnimatePresence } from "motion/react";

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

export function VariantSelector({
  variants,
  locale,
}: {
  variants: ClientVariant[];
  locale: Locale;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(variants[0]?.id ?? null);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const getQty = (id: number) => qtys[id] || 1;
  const setQty = (id: number, q: number) => setQtys((prev) => ({ ...prev, [id]: q }));

  async function addToCart(variantId: number) {
    setPendingId(variantId);
    const qty = getQty(variantId);
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity: qty }),
    });
    setPendingId(null);
    if (!res.ok) return;
    setDoneId(variantId);
    startTransition(() => router.refresh());
    setTimeout(() => setDoneId(null), 1800);
  }

  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      {variants.map((v) => {
        const isOpen = openId === v.id;
        const outOfStock = v.stock <= 0;
        return (
          <div
            key={v.id}
            className={cn(
              "card overflow-hidden rounded-2xl transition-all duration-300",
              isOpen && "ring-1 ring-petrol-500/40",
            )}
          >
            {/* سر لیست — کلیک برای باز/بسته شدن */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : v.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isOpen ? "bg-petrol-600/15 text-petrol-700" : "bg-navy-900/5 text-charcoal-500",
                  )}
                >
                  <Package className="size-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-navy-900">{v.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-charcoal-500">
                    کد: {v.sku}
                    {v.unitSymbol ? ` · ${v.unitSymbol}` : ""}
                    {v.unitName ? ` (${v.unitName})` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-black text-navy-900">{formatRial(v.price)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    outOfStock ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700",
                  )}
                >
                  {outOfStock ? "ناموجود" : `${v.stock}`}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-charcoal-400 transition-transform duration-300",
                    isOpen && "rotate-180 text-petrol-700",
                  )}
                  strokeWidth={1.8}
                />
              </div>
            </button>

            {/* محتوای بازشونده */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-navy-900/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      {/* تعداد */}
                      <div className="flex items-center gap-2 rounded-xl bg-navy-900/5 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setQty(v.id, Math.max(1, getQty(v.id) - 1))}
                          className="text-navy-500 transition-colors hover:text-navy-900"
                        >
                          <Minus className="size-4" strokeWidth={2} />
                        </button>
                        <span className="min-w-[2ch] text-center text-sm font-bold text-navy-900">
                          {getQty(v.id)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(v.id, Math.min(v.stock, getQty(v.id) + 1))}
                          disabled={getQty(v.id) >= v.stock}
                          className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
                        >
                          <Plus className="size-4" strokeWidth={2} />
                        </button>
                      </div>

                      {/* دکمه افزودن */}
                      <button
                        type="button"
                        onClick={() => addToCart(v.id)}
                        disabled={outOfStock || pendingId === v.id}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all",
                          doneId === v.id
                            ? "bg-green-600 text-pearl-50"
                            : "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                      >
                        {doneId === v.id ? (
                          <>
                            <Check className="size-4" strokeWidth={2} /> اضافه شد
                          </>
                        ) : pendingId === v.id ? (
                          "در حال افزودن..."
                        ) : (
                          <>
                            <ShoppingBag className="size-4" strokeWidth={1.7} /> افزودن به سبد خرید
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
