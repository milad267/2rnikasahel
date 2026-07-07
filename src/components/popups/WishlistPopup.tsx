"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { LuxePopup } from "@/components/ui/LuxePopup";
import { formatRial } from "@/lib/utils";

type WishlistView = {
  productId: number;
  slug: string;
  title: string;
  categoryTitle: string | null;
  minPrice: string;
  variantCount: number;
};

export function WishlistPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<WishlistView[]>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/wishlist?popup=true")
        .then((r) => r.json() as Promise<WishlistView[]>)
        .then(setItems)
        .catch(() => setItems([]));
    }
  }, [open]);

  return (
    <LuxePopup open={open} onClose={onClose} title="علاقه‌مندی‌ها">
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Heart className="size-10 text-charcoal-400" strokeWidth={1.4} />
          <p className="text-sm text-charcoal-500">هنوز محصولی ذخیره نکرده‌اید.</p>
          <Link
            href="/shop"
            onClick={onClose}
            className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50"
          >
            رفتن به فروشگاه
          </Link>
        </div>
      )}
      {items.map((item) => (
        <Link
          key={item.productId}
          href={`/shop/${item.slug}`}
          onClick={onClose}
          className="flex items-center justify-between rounded-2xl bg-navy-900/[0.03] p-3.5 transition-colors hover:bg-petrol-600/10"
        >
          <div>
            <p className="text-sm font-bold text-navy-900">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-charcoal-500">
              {item.categoryTitle} · {item.variantCount} تنوع
            </p>
            <p className="mt-1 text-xs font-semibold text-navy-900">از {formatRial(item.minPrice)}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-petrol-600" strokeWidth={1.8} />
        </Link>
      ))}
    </LuxePopup>
  );
}
