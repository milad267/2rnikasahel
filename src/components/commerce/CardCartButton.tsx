"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, Loader2, Plus, Minus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatRial } from "@/lib/utils";

type Variant = { id: number; name: string; price: string; stock: number; sku: string };

export function CardCartButton({ slug, variantCount, variantId, className }: {
  slug: string; variantCount: number; variantId: number | null; className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [loadingVars, setLoadingVars] = useState(false);

  // Close on outside click (clicking backdrop already closes via the outer div's onClick)

  const hasVariants = variantCount > 1;
  const isSingle = variantCount <= 1 && variantId;

  async function fetchVariants() {
    setLoadingVars(true);
    try {
      const res = await fetch(`/api/products/variants?slug=${slug}`);
      const d = await res.json();
      if (d.ok) {
        setVariants(d.variants);
        setQty(Object.fromEntries(d.variants.map((v: Variant) => [v.id, 1])));
        setShowDrawer(true);
      }
    } finally { setLoadingVars(false); }
  }

  async function addToCart(vId: number, q: number) {
    const res = await fetch("/api/cart/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: vId, quantity: q }),
    });
    return res.ok;
  }

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (hasVariants) {
      await fetchVariants();
      return;
    }

    if (isSingle && variantId) {
      setPending(true);
      try {
        const ok = await addToCart(variantId, qty[variantId] || 1);
        if (!ok) return;
        setDone(true);
        router.refresh();
        setTimeout(() => setDone(false), 1800);
      } finally { setPending(false); }
    }
  }

  async function addVariantToCart(vId: number) {
    const q = qty[vId] || 1;
    await addToCart(vId, q);
    setQty(prev => ({ ...prev, [vId]: 1 }));
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 1500);
  }

  if (isSingle) {
    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (variantId) addToCart(variantId, Math.max(1, (qty[variantId] || 1) - 1)).then(() => router.refresh());
        }} disabled={(qty[variantId] || 1) <= 1}
          aria-label="کاهش تعداد"
          className="flex size-7 items-center justify-center rounded-full bg-navy-900/5 text-navy-700 hover:bg-navy-900/10 disabled:opacity-30">
          <Minus className="size-3" strokeWidth={2} />
        </button>
        <span className="w-5 text-center text-[10px] font-bold text-navy-900">{qty[variantId] || 1}</span>
        <button type="button" onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (variantId) addToCart(variantId, (qty[variantId] || 1) + 1).then(() => router.refresh());
        }}
          aria-label="افزایش تعداد"
          className="flex size-7 items-center justify-center rounded-full bg-navy-900/5 text-navy-700 hover:bg-navy-900/10">
          <Plus className="size-3" strokeWidth={2} />
        </button>
        <button type="button" onClick={handleClick}
          className={cn("flex size-8 items-center justify-center rounded-full shadow-lg transition-all disabled:opacity-60",
            done ? "bg-green-600 text-white" : "bg-petrol-600 text-pearl-50 hover:bg-petrol-500 hover:scale-105", className)}
          aria-label="افزودن به سبد خرید">
          {done ? <Check className="size-4" strokeWidth={2} /> : <ShoppingBag className="size-4" strokeWidth={1.7} />}
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={handleClick}
        className={cn("flex size-10 items-center justify-center rounded-full shadow-lg transition-all disabled:opacity-60",
          done ? "bg-green-600 text-white" : "bg-petrol-600 text-pearl-50 hover:bg-petrol-500 hover:scale-105", className)}
        aria-label="افزودن به سبد خرید">
        {loadingVars ? <Loader2 className="size-5 animate-spin" strokeWidth={2} />
          : done ? <Check className="size-5" strokeWidth={2} />
          : pending ? <Loader2 className="size-5 animate-spin" strokeWidth={2} />
          : <ShoppingBag className="size-5" strokeWidth={1.7} />}
      </button>

      {/* Variant Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center lg:items-center" onClick={() => setShowDrawer(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-t-2xl bg-white shadow-2xl p-4 lg:rounded-2xl lg:max-w-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-navy-900">انتخاب تنوع</span>
                <button onClick={() => setShowDrawer(false)} className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                  <X className="size-3.5" strokeWidth={2} />
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto thin-scroll space-y-1.5">
                {variants.map(v => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-navy-900 leading-tight">{v.name}</p>
                      <p className="text-[10px] font-semibold text-petrol-700">{formatRial(v.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => setQty(p => ({ ...p, [v.id]: Math.max(1, (p[v.id] || 1) - 1) }))}
                        disabled={(qty[v.id] || 1) <= 1}
                        className="flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
                        <Minus className="size-2.5" strokeWidth={2} />
                      </button>
                      <span className="w-5 text-center text-[10px] font-bold text-navy-900">{qty[v.id] || 1}</span>
                      <button type="button" onClick={() => setQty(p => ({ ...p, [v.id]: (p[v.id] || 1) + 1 }))}
                        className="flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                        <Plus className="size-2.5" strokeWidth={2} />
                      </button>
                      <button type="button" onClick={() => addVariantToCart(v.id)}
                        className="flex size-7 items-center justify-center rounded-full bg-petrol-600 text-white hover:bg-petrol-500 ml-0.5">
                        <ShoppingBag className="size-3" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
