import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Layers, Sparkles, Users, Target, Award } from "lucide-react";
import { getSetting } from "@/lib/settings";
import { SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pageTitle = await getSetting<string>("about.page_title", "about") || "درباره ما";
  return {
    title: "درباره ما",
    description: `درباره ${SITE_NAME} — ${pageTitle}`,
  };
}

const ICON_MAP: Record<string, any> = { Award, Layers, Sparkles, Users, Target };

export default async function AboutPage() {
  const [
    rawPageTitle, rawPageDesc,
    rawValues,
    missionTitle, missionDesc,
    visionTitle, visionDesc,
    ctaTitle, ctaDesc,
    ctaBtn1, ctaBtn1Link, ctaBtn2, ctaBtn2Link,
  ] = await Promise.all([
    getSetting<string>("about.page_title", "about"),
    getSetting<string>("about.page_desc", "about"),
    getSetting<string>("about.values", "about"),
    getSetting<string>("about.mission_title", "about"),
    getSetting<string>("about.mission_desc", "about"),
    getSetting<string>("about.vision_title", "about"),
    getSetting<string>("about.vision_desc", "about"),
    getSetting<string>("about.cta_title", "about"),
    getSetting<string>("about.cta_desc", "about"),
    getSetting<string>("about.cta_btn1", "about"),
    getSetting<string>("about.cta_btn1_link", "about"),
    getSetting<string>("about.cta_btn2", "about"),
    getSetting<string>("about.cta_btn2_link", "about"),
  ]);

  const pageTitle = rawPageTitle || "مرجع تخصصی تجهیزات صنعتی و تأسیسات";
  const pageDesc = rawPageDesc || "درنیکا ساحل با هدف ساده‌سازی و هوشمندسازی خرید تجهیزات صنعتی و تأسیساتی راه‌اندازی شده است. ما با گردآوری گسترده‌ترین سبد محصولات از برندهای معتبر، ارائهٔ مشاورهٔ فنی و بهره‌گیری از فناوری هوش مصنوعی، تجربه‌ای متفاوت و مطمئن از خرید صنعتی را برای مشتریان، پیمانکاران و کسب‌وکارها فراهم می‌کنیم.";

  // Parse values JSON
  let values: { icon: string; title: string; desc: string }[] = [];
  try {
    const parsed = JSON.parse(rawValues || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      values = parsed.map((v: any, i: number) => ({
        icon: v.icon || ["Award","Layers","Sparkles","Users"][i] || "Award",
        title: v.title || "",
        desc: v.desc || "",
      }));
    }
  } catch {}
  if (values.length === 0) {
    values = [
      { icon: "Award", title: "کیفیت تضمین‌شده", desc: "تمام محصولات دارای گارانتی اصالت و سلامت فیزیکی هستند." },
      { icon: "Layers", title: "تنوع بی‌نظیر", desc: "هزاران کد کالای صنعتی و تأسیساتی از برندهای معتبر داخلی و خارجی." },
      { icon: "Sparkles", title: "مشاوره هوشمند", desc: "راهنمای انتخاب محصول مبتنی بر هوش مصنوعی برای خرید دقیق‌تر." },
      { icon: "Users", title: "پرتال پیمانکاران", desc: "قیمت‌گذاری اختصاصی، استعلام قیمت و پیگیری بصری سفارش‌ها." },
    ];
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pt-48">
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
            درباره {SITE_NAME}
          </span>
          <h1 className="text-gradient-navy mt-4 py-1 text-3xl font-black leading-[1.35] sm:text-5xl">
            {pageTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-charcoal-600 sm:text-base">
            {pageDesc}
          </p>
        </div>

        {/* ارزش‌ها */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => {
            const Icon = ICON_MAP[v.icon] || Award;
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

        {/* ماموریت و چشم‌انداز */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-[1.75rem] p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-navy-900/5 text-navy-700">
              <Target className="size-6" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-xl font-black text-navy-900">{missionTitle || "ماموریت ما"}</h2>
            <p className="mt-3 text-sm leading-8 text-charcoal-600">
              {missionDesc || "فراهم‌کردن دسترسی سریع، شفاف و مطمئن به تجهیزات صنعتی با بهترین قیمت و پشتیبانی تخصصی؛ به‌گونه‌ای که هر پروژه‌ای، در هر مقیاسی، بتواند با اطمینان کامل تأمین شود."}
            </p>
          </div>
          <div className="card rounded-[1.75rem] p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-navy-900/5 text-navy-700">
              <Sparkles className="size-6" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-xl font-black text-navy-900">{visionTitle || "چشم‌انداز ما"}</h2>
            <p className="mt-3 text-sm leading-8 text-charcoal-600">
              {visionDesc || "تبدیل‌شدن به معتبرترین پلتفرم دیجیتال تأمین تجهیزات صنعتی و تأسیساتی در کشور، با تکیه بر نوآوری، فناوری هوش مصنوعی و تجربهٔ کاربری در تراز جهانی."}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-4 rounded-[2rem] bg-navy-900 px-8 py-12 text-center">
          <h2 className="text-2xl font-black text-pearl-50">{ctaTitle || "آمادهٔ شروع همکاری هستید؟"}</h2>
          <p className="max-w-xl text-sm text-pearl-200/70">
            {ctaDesc || "محصولات ما را کاوش کنید یا برای دریافت مشاوره و استعلام قیمت با ما در تماس باشید."}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href={ctaBtn1Link || "/shop"} className="rounded-full bg-petrol-600 px-6 py-3 text-sm font-bold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500">
              {ctaBtn1 || "ورود به فروشگاه"}
            </Link>
            <Link href={ctaBtn2Link || "/contact"} className="rounded-full bg-pearl-50 px-6 py-3 text-sm font-bold text-navy-900 transition-all hover:bg-pearl-100">
              {ctaBtn2 || "تماس با ما"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
