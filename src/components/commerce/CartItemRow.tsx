"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatRial } from "@/lib/utils";

export type CartItemView = {
  id: number;
  quantity: number;
  priceSnapshot: string;
  productTitleSnapshot: string;
  variantTitleSnapshot: string;
  unitLabelSnapshot: string | null;
  variantId: number;
  productSlug: string;
  coverImage: string | null;
  categoryTitle: string | null;
  stock: number;
};

export function CartItemRow({ item }: { item: CartItemView }) {
  const router = useRouter();
  const [qty, setQty] = useState(item.quantity);
  const [pending, startTransition] = useTransition();

  const lineTotal = Number(item.priceSnapshot) * qty;

  async function setQuantity(nextQty: number) {
    setQty(nextQty);
    const res = await fetch("/api/cart/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: item.variantId, quantity: nextQty }),
    });
    if (!res.ok) return;
    startTransition(() => router.refresh());
  }

  async function remove() {
    const res = await fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: item.variantId }),
    });
    if (!res.ok) return;
    startTransition(() => router.refresh());
  }

  return (
    <article className="card overflow-hidden rounded-[1.5rem] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          href={`/shop/${item.productSlug}`}
          className="flex w-full items-center gap-4 sm:w-auto sm:min-w-0 sm:flex-1"
        >
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.productTitleSnapshot} className="size-full object-cover" />
            ) : (
              <Package className="size-9 text-navy-700/25" strokeWidth={1.2} />
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-bold text-navy-900">{item.productTitleSnapshot}</p>
            <p className="line-clamp-1 text-xs text-charcoal-500">{item.variantTitleSnapshot}</p>
            {item.unitLabelSnapshot && (
              <p className="mt-1 text-[11px] text-petrol-700/75">{item.unitLabelSnapshot}</p>
            )}
            <p className="mt-2 text-xs text-charcoal-500">{item.categoryTitle}</p>
          </div>
        </Link>

        <div className="flex items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
          <div className="flex items-center gap-2 rounded-xl bg-navy-900/5 px-3 py-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, qty - 1))}
              disabled={pending || qty <= 1}
              className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
            >
              <Minus className="size-4" strokeWidth={2} />
            </button>
            <span className="min-w-[2ch] text-center text-sm font-bold text-navy-900">{qty}</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(item.stock, qty + 1))}
              disabled={pending || qty >= item.stock}
              className="text-navy-500 transition-colors hover:text-navy-900 disabled:opacity-30"
            >
              <Plus className="size-4" strokeWidth={2} />
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="size-4" strokeWidth={1.8} />
            حذف
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-navy-900/5 pt-4">
        <span className="text-xs text-charcoal-500">قیمت واحد</span>
        <span className="text-sm font-bold text-navy-900">{formatRial(item.priceSnapshot)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-charcoal-500">جمع</span>
        <span className="text-base font-black text-navy-900">{formatRial(lineTotal, { withUnit: true })}</span>
      </div>
    </article>
  );
}
