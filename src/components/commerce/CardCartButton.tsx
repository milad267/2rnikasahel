"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * دکمهٔ افزودن به سبد خرید روی کارت محصول (گوشهٔ پایین-چپ).
 * - اگر محصول بیش از یک تنوع داشته باشد → صفحهٔ محصول باز می‌شود تا کاربر تنوع را انتخاب کند.
 * - اگر تنها یک تنوع داشته باشد → مستقیم به سبد اضافه می‌شود.
 */
export function CardCartButton({
  slug,
  variantCount,
  variantId,
  className,
}: {
  slug: string;
  variantCount: number;
  variantId: number | null;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // محصول دارای تنوع → باز کردن صفحهٔ محصول
    if (variantCount > 1 || !variantId) {
      router.push(`/shop/${slug}`);
      return;
    }

    // تک‌تنوع → افزودن مستقیم
    setPending(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: 1 }),
      });
      if (!res.ok) return;
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 1800);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="افزودن به سبد خرید"
      className={cn(
        "flex size-10 items-center justify-center rounded-full shadow-lg transition-all disabled:opacity-60",
        done
          ? "bg-green-600 text-pearl-50"
          : "bg-petrol-600 text-pearl-50 hover:bg-petrol-500 hover:scale-105",
        className,
      )}
    >
      {done ? (
        <Check className="size-5" strokeWidth={2} />
      ) : pending ? (
        <Loader2 className="size-5 animate-spin" strokeWidth={2} />
      ) : (
        <ShoppingBag className="size-5" strokeWidth={1.7} />
      )}
    </button>
  );
}
