import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Layers, Sparkles, Users, Target, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "درباره درنیکا ساحل، مرجع تخصصی تجهیزات صنعتی و تأسیسات.",
};

const values = [
  { icon: Award, title: "کیفیت تضمین‌شده", desc: "تمام محصولات دارای گارانتی اصالت و سلامت فیزیکی هستند." },
  { icon: Layers, title: "تنوع بی‌نظیر", desc: "هزاران کد کالای صنعتی و تأسیساتی از برندهای معتبر داخلی و خارجی." },
  { icon: Sparkles, title: "مشاوره هوشمند", desc: "راهنمای انتخاب محصول مبتنی بر هوش مصنوعی برای خرید دقیق‌تر." },
  { icon: Users, title: "پرتال پیمانکاران", desc: "قیمت‌گذاری اختصاصی، استعلام قیمت و پیگیری بصری سفارش‌ها." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        {/* مسیر ناوبری */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-charcoal-500">
          <Link href="/" className="transition-colors hover:text-petrol-600">خانه</Link>
          <span>/</span>
          <span className="text-navy-900">درباره ما</span>
        </nav>

        {/* هدر */}
        <div className="card overflow-hidden rounded-[2rem] p-8 sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-petrol-600/10 px-3 py-1 text-[11px] font-medium text-petrol-700">
            <ShieldCheck className="size-3.5" strokeWidth={1.7} />
            درباره درنیکا ساحل
          </span>
          <h1 className="text-gradient-navy mt-4 py-1 text-3xl font-black leading-[1.35] sm:text-5xl">
            مرجع تخصصی تجهیزات صنعتی و تأسیسات
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-charcoal-600 sm:text-base">
            درنیکا ساحل با هدف ساده‌سازی و هوشمندسازی خرید تجهیزات صنعتی و تأسیساتی راه‌اندازی شده است.
            ما با گردآوری گسترده‌ترین سبد محصولات از برندهای معتبر، ارائهٔ مشاورهٔ فنی و بهره‌گیری از
            فناوری هوش مصنوعی، تجربه‌ای متفاوت و مطمئن از خرید صنعتی را برای مشتریان، پیمانکاران و
            کسب‌وکارها فراهم می‌کنیم.
          </p>
        </div>

        {/* ارزش‌ها */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="card rounded-[1.75rem] p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-petrol-600/12 text-petrol-700">
                  <Icon className="size-6" strokeWidth={1.5} />
                </span>
                <h3 className="mt-4 text-base font-bold text-navy-900">{v.title}</h3>
                <p className="mt-2 text-xs leading-6 text-charcoal-500">{v.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ماموریت */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-[1.75rem] p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-navy-900/5 text-navy-700">
              <Target className="size-6" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-xl font-black text-navy-900">ماموریت ما</h2>
            <p className="mt-3 text-sm leading-8 text-charcoal-600">
              فراهم‌کردن دسترسی سریع، شفاف و مطمئن به تجهیزات صنعتی با بهترین قیمت و پشتیبانی تخصصی؛
              به‌گونه‌ای که هر پروژه‌ای، در هر مقیاسی، بتواند با اطمینان کامل تأمین شود.
            </p>
          </div>
          <div className="card rounded-[1.75rem] p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-navy-900/5 text-navy-700">
              <Sparkles className="size-6" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-xl font-black text-navy-900">چشم‌انداز ما</h2>
            <p className="mt-3 text-sm leading-8 text-charcoal-600">
              تبدیل‌شدن به معتبرترین پلتفرم دیجیتال تأمین تجهیزات صنعتی و تأسیساتی در کشور، با تکیه بر
              نوآوری، فناوری هوش مصنوعی و تجربهٔ کاربری در تراز جهانی.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-4 rounded-[2rem] bg-navy-900 px-8 py-12 text-center">
          <h2 className="text-2xl font-black text-pearl-50">آمادهٔ شروع همکاری هستید؟</h2>
          <p className="max-w-xl text-sm text-pearl-200/70">
            محصولات ما را کاوش کنید یا برای دریافت مشاوره و استعلام قیمت با ما در تماس باشید.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/shop" className="rounded-full bg-petrol-600 px-6 py-3 text-sm font-bold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500">
              ورود به فروشگاه
            </Link>
            <Link href="/contact" className="rounded-full bg-pearl-50 px-6 py-3 text-sm font-bold text-navy-900 transition-all hover:bg-pearl-100">
              تماس با ما
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
