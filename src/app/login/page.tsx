"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Phone, Lock, Building2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<"customer" | "contractor">("customer");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:pt-44">
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
                <Lock className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white sm:text-sm"
                  dir="ltr"
                />
              </div>
            </div>

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
                setIsRegister(!isRegister);
                setError("");
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
