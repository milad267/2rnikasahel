"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function WishlistToggleButton({
  productId,
  initialWishlisted = false,
  className,
  compact = false,
}: {
  productId: number;
  initialWishlisted?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { wishlisted?: boolean };
    setWishlisted(Boolean(data.wishlisted));
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60",
        compact && "gap-0 px-3 py-3",
        wishlisted
          ? "border-petrol-500 bg-petrol-600/10 text-petrol-700"
          : "border-navy-900/10 bg-transparent text-charcoal-500 hover:border-navy-900/20 hover:text-navy-900",
        className,
      )}
      aria-pressed={wishlisted}
    >
      <Heart className={cn("size-4", wishlisted ? "fill-current" : "")} strokeWidth={1.8} />
      {!compact && (wishlisted ? "به علاقه‌مندی‌ها اضافه شد" : "افزودن به علاقه‌مندی‌ها")}
    </button>
  );
}
