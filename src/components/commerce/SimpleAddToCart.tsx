"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, Minus, Plus } from "lucide-react";
import { formatRial } from "@/lib/utils";

export function SimpleAddToCart({ productId, variantId, price, stock }: { productId: number; variantId: number; price: string; stock: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const outOfStock = stock <= 0;

  async function handleAdd() {
    setPending(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: qty, productId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "خطا"); }
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2000);
    } catch (e: any) {
      alert(e.message || "خطا");
    }
    setPending(false);
  }

  return (
    <div className="rounded-2xl border border-navy-900/10 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-charcoal-500">قیمت:</span>
        <span className="text-xl font-black text-navy-900">{formatRial(price)}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-navy-900/5 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={outOfStock || pending}
            className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
          >
            <Minus className="size-4" strokeWidth={2} />
          </button>
          <span className="min-w-[2ch] text-center text-sm font-bold text-navy-900">{qty}</span>
          <button
            type="button"
            onClick={() => setQty(Math.min(stock, qty + 1))}
            disabled={outOfStock || qty >= stock || pending}
            className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
          >
            <Plus className="size-4" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock || pending}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
            done
              ? "bg-green-600 text-white"
              : "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500"
          }`}
        >
          {done ? (
            <><Check className="size-5" strokeWidth={2} /> اضافه شد</>
          ) : pending ? (
            "در حال افزودن..."
          ) : (
            <><ShoppingBag className="size-5" strokeWidth={1.8} /> افزودن به سبد خرید</>
          )}
        </button>
      </div>
      {outOfStock && (
        <p className="text-center text-xs font-medium text-red-500">⛔ این محصول در حال حاضر موجود نیست</p>
      )}
    </div>
  );
}
