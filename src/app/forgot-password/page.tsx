"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        return;
      }
      setSent(true);
      // پس از چند لحظه به صفحه وارد کردن کد و رمز جدید هدایت می‌شویم
      setTimeout(() => {
        router.push(`/reset-password?phone=${encodeURIComponent(phone.trim())}`);
      }, 1500);
    } catch (err) {
      setError((err as Error).message || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6 lg:pt-44">
      <div className="mx-auto max-w-md">
        {/* هدر باکس */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Logo variant="dark" />
          </Link>
          <h1 className="mt-6 text-gradient-navy text-2xl font-black sm:text-3xl">فراموشی رمز عبور</h1>
          <p className="mt-2 text-xs text-charcoal-500 sm:text-sm">
            شماره موبایل حساب خود را وارد کنید تا لینک/کد بازیابی رمز عبور برایتان ارسال شود.
          </p>
        </div>

        {/* فرم اصلی */}
        <div className="card rounded-[2rem] p-6 shadow-xl sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-petrol-600/10 text-petrol-600">
                <MailCheck className="size-8" strokeWidth={1.6} />
              </div>
              <p className="text-sm font-semibold text-navy-900">کد بازیابی ارسال شد</p>
              <p className="text-xs leading-6 text-charcoal-500">
                اگر این شماره در سیستم ثبت شده باشد، کد بازیابی برای شما پیامک می‌شود. در حال انتقال به
                صفحه‌ی ثبت رمز عبور جدید هستید...
              </p>
              <Link
                href={`/reset-password?phone=${encodeURIComponent(phone.trim())}`}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500"
              >
                ادامه و وارد کردن کد
                <ArrowLeft className="size-4" strokeWidth={2} />
              </Link>

            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-navy-900">شماره موبایل</label>
                  <div className="relative">
                    <Phone className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50"
                >
                  {loading ? "در حال ارسال..." : "ارسال کد بازیابی"}
                  <ArrowRight className="size-4" strokeWidth={2} />
                </button>
              </form>
            </>
          )}

          <div className="mt-6 border-t border-navy-900/10 pt-6 text-center">
            <Link
              href="/login"
              className="text-xs font-medium text-petrol-700 transition-colors hover:text-navy-900 sm:text-sm"
            >
              رمز عبور خود را به خاطر آوردید؟ وارد شوید
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
