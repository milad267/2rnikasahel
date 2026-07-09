"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Check, Minus, Plus, ChevronDown, Package, CreditCard } from "lucide-react";
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

/**
 * انتخاب‌گر تنوع به‌صورت یک کشوی واحد (Drawer):
 * - یک دکمه کشویی که تنوع انتخاب‌شده را نشان می‌دهد
 * - با کلیک، لیست همه‌ی تنوع‌ها به‌صورت Dropdown باز می‌شود
 * - کاربر یک تنوع را انتخاب می‌کند، تعداد را تعیین می‌کند و به سبد اضافه می‌کند
 */
export function VariantSelector({
  variants,
  locale,
}: {
  variants: ClientVariant[];
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number>(variants[0]?.id ?? 0);
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const outOfStock = !selected || selected.stock <= 0;

  async function addToCart(goCheckout = false) {
    if (!selected) return;
    setPending(true);
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: selected.id, quantity: qty }),
    });
    setPending(false);
    if (!res.ok) return;
    setDone(true);
    startTransition(() => router.refresh());
    if (goCheckout) {
      router.push("/checkout");
      return;
    }
    setTimeout(() => setDone(false), 1800);
  }

  if (variants.length === 0 || !selected) return null;

  return (
    <div className="space-y-4">
      {/* کشوی انتخاب تنوع */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3.5 text-start transition-all",
            open ? "border-petrol-500 ring-2 ring-petrol-500/20" : "border-navy-900/12 hover:border-petrol-400",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-petrol-600/12 text-petrol-700">
              <Package className="size-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold text-navy-900">{selected.name}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-charcoal-500">
                کد: {selected.sku}
                {selected.unitSymbol ? ` · ${selected.unitSymbol}` : ""}
                {selected.unitName ? ` (${selected.unitName})` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-black text-navy-900">{formatRial(selected.price)}</span>
            <ChevronDown
              className={cn("size-4 text-charcoal-400 transition-transform duration-300", open && "rotate-180 text-petrol-700")}
              strokeWidth={1.8}
            />
          </div>
        </button>

        {/* Dropdown لیست تنوع‌ها */}
        <AnimatePresence>
          {open && (
            <>
              {/* backdrop برای بستن با کلیک بیرون */}
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-navy-900/12 bg-white p-1.5 shadow-2xl"
              >
                {variants.map((v) => {
                  const isSel = v.id === selectedId;
                  const vOut = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(v.id);
                        setQty(1);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                        isSel ? "bg-petrol-600/10" : "hover:bg-navy-900/[0.04]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold text-navy-900">{v.name}</p>
                        <p className="mt-0.5 text-[10px] text-charcoal-500">کد: {v.sku}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-black text-navy-900">{formatRial(v.price)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold",
                            vOut ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700",
                          )}
                        >
                          {vOut ? "ناموجود" : `${v.stock}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* مشخصات فنی تنوع انتخاب‌شده */}
      {selected.specSheet && Object.keys(selected.specSheet).length > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-navy-900/10 bg-navy-900/5">
          {Object.entries(selected.specSheet).map(([key, val]) => (
            <div key={key} className="flex justify-between bg-white px-3 py-2 text-[11px]">
              <span className="font-medium text-navy-900">{key}</span>
              <span className="text-charcoal-500">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* انتخاب تعداد */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-charcoal-500">تعداد:</span>
        <div className="flex items-center gap-2 rounded-xl bg-navy-900/5 px-3 py-2">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={outOfStock}
            className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
          >
            <Minus className="size-4" strokeWidth={2} />
          </button>
          <span className="min-w-[3ch] text-center text-sm font-bold text-navy-900">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(selected.stock, q + 1))}
            disabled={outOfStock || qty >= selected.stock}
            className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
          >
            <Plus className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* دکمه افزودن به سبد */}
      <button
        type="button"
        onClick={() => addToCart(false)}
        disabled={outOfStock || pending}
        className={cn(
          "flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50",
          done
            ? "bg-green-600 text-pearl-50"
            : "bg-navy-900 text-pearl-50 hover:bg-navy-800",
        )}
      >
        {done ? (
          <><Check className="size-5" strokeWidth={2} /> به سبد اضافه شد</>
        ) : pending ? (
          "در حال افزودن..."
        ) : (
          <><ShoppingBag className="size-5" strokeWidth={1.7} /> افزودن به سبد خرید</>
        )}
      </button>

      {/* دکمه تکمیل سفارش */}
      <button
        type="button"
        onClick={() => addToCart(true)}
        disabled={outOfStock || pending}
        className="flex w-full items-center justify-center gap-2.5 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-bold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CreditCard className="size-5" strokeWidth={1.8} />
        تکمیل سفارش و پرداخت
      </button>

      {outOfStock && (
        <p className="text-center text-xs font-medium text-red-500">⛔ این تنوع در حال حاضر موجود نیست</p>
      )}
    </div>
  );
}
