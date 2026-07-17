"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";

/**
 * دکمه «پرداخت سفارش» برای سفارش‌های در انتظار پرداخت.
 * سفارش موجود را به درگاه پرداخت هدایت می‌کند (بدون ساختن سفارش جدید).
 */
export function PayNowButton({ orderId }: { orderId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطا در اتصال به درگاه پرداخت.");
      }

      if (data.alreadyPaid) {
        // سفارش قبلاً پرداخت شده — رفرش برای نمایش وضعیت جدید
        window.location.reload();
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      throw new Error("آدرس درگاه پرداخت دریافت نشد.");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-5 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
        ) : (
          <CreditCard className="size-4" strokeWidth={1.8} />
        )}
        {loading ? "در حال اتصال به درگاه..." : "پرداخت سفارش"}
      </button>
      {error && <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
