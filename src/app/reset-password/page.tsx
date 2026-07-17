"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // پیش‌پر کردن شماره موبایل از پارامتر URL
  useEffect(() => {
    const p = searchParams.get("phone");
    if (p) setPhone(p);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }
      setSuccess(true);
      // ورود خودکار انجام شده؛ انتقال به پروفایل
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1600);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!phone) return;
    setResending(true);
    setError("");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      }).catch(() => {});
    } finally {
      setResending(false);
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
          <h1 className="mt-6 text-gradient-navy text-2xl font-black sm:text-3xl">تنظیم رمز عبور جدید</h1>
          <p className="mt-2 text-xs text-charcoal-500 sm:text-sm">
            کد بازیابی ارسال‌شده و رمز عبور جدید خود را وارد کنید.
          </p>
        </div>

        {/* فرم اصلی */}
        <div className="card rounded-[2rem] p-6 shadow-xl sm:p-8">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="size-8" strokeWidth={1.6} />
              </div>
              <p className="text-sm font-semibold text-navy-900">رمز عبور با موفقیت تغییر کرد</p>
              <p className="text-xs leading-6 text-charcoal-500">
                در حال انتقال به حساب کاربری شما هستید...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* شماره موبایل */}
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

                {/* کد بازیابی */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-navy-900">کد بازیابی</label>
                  <div className="relative">
                    <KeyRound className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="کد ۶ رقمی"
                      maxLength={6}
                      className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-center text-sm tracking-[0.4em] text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
                      dir="ltr"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !phone}
                    className="mt-2 text-[11px] font-medium text-petrol-700 transition-colors hover:text-navy-900 disabled:opacity-50"
                  >
                    {resending ? "در حال ارسال مجدد..." : "ارسال مجدد کد"}
                  </button>
                </div>

                {/* رمز عبور جدید */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-navy-900">رمز عبور جدید</label>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="حداقل ۸ کاراکتر"
                      className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-11 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                      className="absolute end-3 top-2.5 flex size-7 items-center justify-center rounded-lg text-charcoal-400 transition-colors hover:text-petrol-600"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" strokeWidth={1.6} />
                      ) : (
                        <Eye className="size-4" strokeWidth={1.6} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword.length < 8}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50"
                >
                  {loading ? "در حال ثبت..." : "تغییر رمز و ورود"}
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
              بازگشت به صفحه ورود
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
