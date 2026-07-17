"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, User, Phone, Lock, Building2, ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const REMEMBER_KEY = "dornika_remember_login";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams?.get("mode") === "register");
  const [role, setRole] = useState<"customer" | "contractor">("customer");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync register mode when URL changes
  useEffect(() => {
    const mode = searchParams?.get("mode");
    setIsRegister(mode === "register");
  }, [searchParams]);

  // بارگذاری شماره موبایل ذخیره‌شده هنگام باز شدن صفحه (مرا به خاطر بسپار)
  // NOTE: رمز عبور هرگز در localStorage ذخیره نمی‌شود
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const data = JSON.parse(saved) as { phone?: string };
        if (data.phone) setPhone(data.phone);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister ? { phone, name, password, role, companyName } : { phone, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }

      // ذخیره یا پاک کردن شماره موبایل بر اساس «مرا به خاطر بسپار»
      // فقط شماره موبایل ذخیره می‌شود، NOT رمز عبور
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ phone }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* ignore */
      }

      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
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
          <h1 className="mt-6 text-gradient-navy text-2xl font-black sm:text-3xl">
            {isRegister ? "ثبت‌نام در درنیکا ساحل" : "ورود به حساب کاربری"}
          </h1>
          <p className="mt-2 text-xs text-charcoal-500 sm:text-sm">
            {isRegister
              ? "حساب کاربری جدید بسازید و از امکانات پلتفرم صنعتی استفاده کنید."
              : "شماره موبایل و کلمه عبور خود را وارد کنید."}
          </p>
        </div>

        {/* فرم اصلی */}
        <div className="card rounded-[2rem] p-6 shadow-xl sm:p-8">
          {/* سوییچ مشتری / پیمانکار در حالت ثبت‌نام */}
          {isRegister && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-navy-900/5 p-1.5">
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  role === "customer"
                    ? "bg-petrol-600 text-pearl-50 shadow-md"
                    : "text-charcoal-500 hover:text-navy-900"
                }`}
              >
                <User className="size-4" strokeWidth={1.8} />
                مشتری حقیقی
              </button>
              <button
                type="button"
                onClick={() => setRole("contractor")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  role === "contractor"
                    ? "bg-petrol-600 text-pearl-50 shadow-md"
                    : "text-charcoal-500 hover:text-navy-900"
                }`}
              >
                <Building2 className="size-4" strokeWidth={1.8} />
                پیمانکار / B2B
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-navy-900">نام و نام خانوادگی</label>
                  <div className="relative">
                    <User className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: علی رضایی"
                      className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
                    />
                  </div>
                </div>

                {role === "contractor" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-navy-900">نام شرکت / سازمان</label>
                    <div className="relative">
                      <Building2 className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="مثال: شرکت تأسیسات ساحل جنوب"
                        className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

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

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">کلمه عبور</label>
              <div className="relative">
                {/* آیکن قفل در ابتدای فیلد (سمت راست در RTL) */}
                <Lock className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-11 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
                  dir="ltr"
                />
                {/* دکمه نمایش/مخفی کردن رمز در انتهای فیلد (سمت چپ در RTL) تا با آیکن قفل تداخل نداشته باشد */}
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

            {/* مرا به خاطر بسپار + فراموشی رمز عبور */}
            {!isRegister && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-charcoal-500">
                  <button
                    type="button"
                    role="checkbox"
                    aria-label="مرا به خاطر بسپار"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe((v) => !v)}
                    className={`flex size-5 items-center justify-center rounded-md border transition-all ${
                      rememberMe
                        ? "border-petrol-600 bg-petrol-600 text-pearl-50"
                        : "border-navy-900/20 bg-white text-transparent"
                    }`}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </button>
                  مرا به خاطر بسپار
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-petrol-700 transition-colors hover:text-navy-900"
                >
                  فراموشی رمز عبور؟
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50"
            >
              {loading ? "در حال پردازش..." : isRegister ? "ثبت‌نام و ورود" : "ورود به حساب"}
              <ArrowRight className="size-4" strokeWidth={2} />
            </button>
          </form>

          {/* سوییچ بین ورود و ثبت‌نام */}
          <div className="mt-6 border-t border-navy-900/10 pt-6 text-center">
            <button
              type="button"
              onClick={() => {
                const nextRegister = !isRegister;
                setIsRegister(nextRegister);
                setError("");
                router.replace(nextRegister ? "/login?mode=register" : "/login", { scroll: false });
              }}
              className="text-xs font-medium text-petrol-700 transition-colors hover:text-navy-900 sm:text-sm"
            >
              {isRegister ? "قبلاً حساب کاربری داشته‌اید؟ وارد شوید" : "حساب کاربری ندارید؟ اکنون ثبت‌نام کنید"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-charcoal-500">
          با ورود به درنیکا ساحل، قوانین و شرایط استفاده از خدمات را می‌پذیرید.
        </div>
      </div>
    </div>
  );
}
