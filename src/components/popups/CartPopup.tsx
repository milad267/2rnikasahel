"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { LuxePopup } from "@/components/ui/LuxePopup";
import { formatRial } from "@/lib/utils";

type CartItemView = {
  id: number;
  quantity: number;
  priceSnapshot: string;
  productTitleSnapshot: string;
  variantTitleSnapshot: string;
  variantId: number;
  productSlug: string;
};

export function CartPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<CartItemView[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadCart() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart/items?popup=true");
      if (res.ok) {
        const data = (await res.json()) as CartItemView[];
        setItems(data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(variantId: number) {
    await fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId }),
    });
    loadCart();
    router.refresh();
  }

  const subtotal = items.reduce((s, i) => s + Number(i.priceSnapshot) * i.quantity, 0);

  return (
    <LuxePopup open={open} onClose={onClose} title="سبد خرید">
      {loading && <Loader2 className="mx-auto size-6 animate-spin text-petrol-600" />}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <ShoppingBag className="size-10 text-charcoal-400" strokeWidth={1.4} />
          <p className="text-sm text-charcoal-500">سبد خرید شما خالی است.</p>
          <Link
            href="/shop"
            onClick={onClose}
            className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50"
          >
            رفتن به فروشگاه
          </Link>
        </div>
      )}
      {!loading &&
        items.length > 0 &&
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl bg-navy-900/[0.03] p-3.5"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/shop/${item.productSlug}`}
                onClick={onClose}
                className="line-clamp-1 text-xs font-bold text-navy-900 hover:text-petrol-600"
              >
                {item.productTitleSnapshot}
              </Link>
              <p className="mt-0.5 text-[11px] text-charcoal-500">
                {item.variantTitleSnapshot} × {item.quantity}
              </p>
              <p className="mt-1 text-xs font-semibold text-navy-900">
                {formatRial(Number(item.priceSnapshot) * item.quantity)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.variantId)}
              className="ms-3 flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-100"
            >
              <Trash2 className="size-4" strokeWidth={1.8} />
            </button>
          </div>
        ))}
      {!loading && items.length > 0 && (
        <div className="mt-4 border-t border-navy-900/10 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-charcoal-500">جمع کل</span>
            <span className="font-black text-navy-900">{formatRial(subtotal)}</span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/cart"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-navy-900/10 bg-navy-900/5 px-5 py-2.5 text-sm font-semibold text-navy-900"
            >
              مشاهده کامل
            </Link>
            <Link
              href="/checkout"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-5 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)]"
            >
              <ArrowLeft className="size-4" strokeWidth={1.8} />
              تأیید و پرداخت
            </Link>
          </div>
        </div>
      )}
    </LuxePopup>
  );
}
