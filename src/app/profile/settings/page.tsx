"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ArrowLeft, User, Bell, Globe, Moon, Sun, Smartphone, Mail, ShieldCheck, LogOut, Save, Loader2, Check, X, Eye, EyeOff, Monitor, History, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Notification settings
  const [notifSms, setNotifSms] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifTelegram, setNotifTelegram] = useState(false);
  const [notifOrderUpdates, setNotifOrderUpdates] = useState(true);
  const [notifPromotions, setNotifPromotions] = useState(false);

  // Privacy settings
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);

  // Display settings
  const [language, setLanguage] = useState<"fa" | "en">("fa");

  function handleSave() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      toast.success("✅ تنظیمات ذخیره شد");
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/profile" className="flex size-9 items-center justify-center rounded-full bg-navy-900/5 text-navy-700 hover:bg-navy-900/10">
            <ArrowLeft className="size-4" strokeWidth={1.8} />
          </Link>
          <div className="flex-1">
            <h1 className="text-gradient-navy text-2xl font-black sm:text-3xl">تنظیمات حساب</h1>
            <p className="mt-1 text-sm text-charcoal-500">مدیریت تنظیمات اعلان‌ها، حریم خصوصی و نمایش</p>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 rounded-full bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-pearl-50 shadow-md hover:bg-petrol-500 disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />}
            {loading ? "..." : saved ? "ذخیره شد" : "ذخیره"}
          </button>
        </div>

        <div className="space-y-4">
          {/* ─── اعلان‌ها ─── */}
          <div className="card rounded-[1.75rem] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900 mb-4">
              <Bell className="size-4 text-petrol-600" strokeWidth={1.8} />
              اعلان‌ها
            </h2>
            <div className="space-y-3">
              {[
                { label: "📱 اعلان از طریق پیامک", value: notifSms, set: setNotifSms, desc: "وضعیت سفارش‌ها و پیام‌های مهم" },
                { label: "📧 اعلان از طریق ایمیل", value: notifEmail, set: setNotifEmail, desc: "فاکتورها و تأییدیه‌های خرید" },
                { label: "🤖 اعلان از طریق تلگرام", value: notifTelegram, set: setNotifTelegram, desc: "اطلاع‌رسانی سریع وضعیت سفارش" },
              ].map((item, i) => (
                <label key={i} className="flex items-center justify-between rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 cursor-pointer hover:bg-navy-900/[0.04]">
                  <div>
                    <span className="text-xs font-medium text-navy-900">{item.label}</span>
                    <p className="text-[9px] text-charcoal-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div className={cn("relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors shrink-0 overflow-hidden", item.value ? "bg-petrol-600" : "bg-navy-900/20")} onClick={() => item.set(!item.value)}>
                    <span className={cn("block size-4 rounded-full bg-white shadow-sm transition-transform", item.value ? "translate-x-4" : "translate-x-0")} />
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-3 border-t border-navy-900/10 pt-3">
              <p className="text-[10px] font-semibold text-navy-900 mb-2">دریافت اعلان برای:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🛒 تغییر وضعیت سفارش", value: notifOrderUpdates, set: setNotifOrderUpdates },
                  { label: "🎉 تخفیف‌ها و پیشنهادها", value: notifPromotions, set: setNotifPromotions },
                ].map((item, i) => (
                  <button key={i} onClick={() => item.set(!item.value)}
                    className={cn("rounded-lg border px-3 py-1.5 text-[10px] font-medium transition-all", item.value ? "border-petrol-200 bg-petrol-50 text-petrol-700" : "border-navy-900/10 text-charcoal-500 hover:bg-navy-900/[0.02]")}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── حریم خصوصی ─── */}
          <div className="card rounded-[1.75rem] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900 mb-4">
              <ShieldCheck className="size-4 text-petrol-600" strokeWidth={1.8} />
              حریم خصوصی
            </h2>
            <div className="space-y-3">
              {[
                { label: "📱 نمایش شماره موبایل در پروفایل", value: showPhone, set: setShowPhone },
                { label: "📧 نمایش ایمیل در پروفایل", value: showEmail, set: setShowEmail },
                { label: "📜 ذخیره تاریخچه جستجو", value: saveHistory, set: setSaveHistory },
              ].map((item, i) => (
                <label key={i} className="flex items-center justify-between rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 cursor-pointer hover:bg-navy-900/[0.04]">
                  <span className="text-xs font-medium text-navy-900">{item.label}</span>
                  <div className={cn("relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors shrink-0 overflow-hidden", item.value ? "bg-petrol-600" : "bg-navy-900/20")} onClick={() => item.set(!item.value)}>
                    <span className={cn("block size-4 rounded-full bg-white shadow-sm transition-transform", item.value ? "translate-x-4" : "translate-x-0")} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ─── تنظیمات نمایش ─── */}
          <div className="card rounded-[1.75rem] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900 mb-4">
              <Globe className="size-4 text-petrol-600" strokeWidth={1.8} />
              نمایش و زبان
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy-900">زبان</label>
                <select value={language} onChange={e => setLanguage(e.target.value as "fa" | "en")}
                  className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500">
                  <option value="fa">🇮🇷 فارسی</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy-900">قالب نمایش</label>
                <div className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-[10px] font-medium text-charcoal-500">
                  حالت روشن برای همه بخش‌ها فعال است.
                </div>
              </div>
            </div>
          </div>

          {/* ─── امنیت ─── */}
          <div className="card rounded-[1.75rem] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900 mb-4">
              <ShieldCheck className="size-4 text-petrol-600" strokeWidth={1.8} />
              امنیت
            </h2>
            <div className="space-y-3">
              {[
                { icon: KeyRound, label: "تغییر رمز عبور", desc: "هر ۳ ماه یکبار رمز خود را تغییر دهید", href: "/profile", color: "petrol" },
                { icon: Smartphone, label: "دستگاه‌های متصل", desc: "مدیریت دستگاه‌هایی که به حساب شما دسترسی دارند", href: "/profile", color: "blue" },
                { icon: History, label: "تاریخچه ورود", desc: "آخرین ورودهای موفق و ناموفق به حساب", href: "/profile", color: "amber" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link key={i} href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 hover:bg-navy-900/[0.04] transition-all">
                    <div className={cn("flex size-9 items-center justify-center rounded-xl", `bg-${item.color}-100 text-${item.color}-600`)}>
                      <Icon className="size-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-navy-900">{item.label}</p>
                      <p className="text-[9px] text-charcoal-400">{item.desc}</p>
                    </div>
                    <ArrowLeft className="size-4 text-charcoal-300 shrink-0" strokeWidth={1.5} />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ─── خروج از حساب ─── */}
          <div className="card rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-navy-900">خروج از حساب</h2>
                <p className="text-xs text-charcoal-500 mt-0.5">از تمام دستگاه‌ها خارج شوید</p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button type="submit"
                  className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-all">
                  <LogOut className="size-4" strokeWidth={1.6} /> خروج
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons imported from lucide-react
