"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  async function toggle() {
    setAnimating(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        toast.info("برای ذخیره علاقه‌مندی‌ها ابتدا وارد حساب شوید.");
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { wishlisted?: boolean };
      setWishlisted(Boolean(data.wishlisted));
      startTransition(() => router.refresh());
    } catch {
      toast.error("ذخیره علاقه‌مندی انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setTimeout(() => setAnimating(false), 500);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={pending}
      whileTap={{ scale: 0.85 }}
      animate={animating ? { scale: [1, 1.35, 0.9, 1.1, 1] } : {}}
      transition={{ duration: 0.4 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60",
        compact && "gap-0 px-3 py-3",
        wishlisted
          ? "border-petrol-500 bg-petrol-600/10 text-petrol-700"
          : "border-navy-900/10 bg-transparent text-charcoal-500 hover:border-navy-900/20 hover:text-navy-900",
        className,
      )}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
    >
      <motion.div
        animate={animating ? { scale: [1, 1.5, 0.8, 1.2, 1], rotate: [0, -15, 15, -10, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        <Heart className={cn("size-4", wishlisted ? "fill-current" : "")} strokeWidth={1.8} />
      </motion.div>
      {!compact && (wishlisted ? "به علاقه‌مندی‌ها اضافه شد" : "افزودن به علاقه‌مندی‌ها")}
    </motion.button>
  );
}
