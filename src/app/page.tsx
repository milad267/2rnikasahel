import { getI18n } from "@/lib/i18n/server";
import { getLandingSlides, getLandingFeatures } from "@/lib/landing";
import { getSetting } from "@/lib/settings";
import { Hero, type HeroCardData } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { TiltCard } from "@/components/landing/TiltCard";
import { TrustBox } from "@/components/landing/TrustBox";
import { LandingSlider } from "@/components/landing/LandingSlider";
import { renderFeatureIcon } from "@/components/landing/IconMap";
import { ScrollDots } from "@/components/landing/ScrollDots";
import { AboutSection } from "@/components/layout/AboutSection";
import { Package, BadgeCheck, HardHat, Headset, ShieldCheck, type LucideIcon } from "lucide-react";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const [slides, features, rawCards, aboutTitle, aboutText, rawAboutItems] = await Promise.all([
    getLandingSlides(),
    getLandingFeatures(),
    getSetting<string>("hero.cards", "landing"),
    getSetting<string>("about.title", "general"),
    getSetting<string>("about.content", "general"),
    getSetting<string>("landing.about.items", "landing"),
  ]);

  // ساخت کارت‌های شناور از تنظیمات
  let heroCards: HeroCardData[] = [];
  try {
    const parsed = JSON.parse(rawCards || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      heroCards = parsed.map((c: any) => ({ icon: c.icon || "Boxes", title: c.title || "", value: c.value || "" }));
    }
  } catch {}
  if (heroCards.length === 0) {
    heroCards = [
      { icon: "Boxes", title: "سیستم تنوع محصول", value: "نامحدود" },
      { icon: "Cpu", title: "هوش مصنوعی", value: "۴ ماژول" },
      { icon: "Layers", title: "واحدهای اندازه‌گیری", value: "۱۹+" },
    ];
  }

  // آیتم‌های بخش درباره ما از تنظیمات
  let aboutItems: { icon: string; title: string; text: string }[] | null = null;
  try {
    const parsed = JSON.parse(rawAboutItems || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      aboutItems = parsed.map((c: any) => ({ icon: c.icon || "Boxes", title: c.title || "", text: c.text || "" }));
    }
  } catch {}

  return (
    <>
      <Hero t={t} locale={locale} cards={heroCards} />

      {/* اسلایدر لاکچری */}
      <section id="slider" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[96rem]">
          <LandingSlider slides={slides} locale={locale} />
        </div>
      </section>

      {/* آمار سایت */}
      <section id="stats" className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[96rem]">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="Package" value={t.stats.products} />
              <StatCard icon="BadgeCheck" value={t.stats.brands} />
              <StatCard icon="HardHat" value={t.stats.contractors} />
              <StatCard icon="Headset" value={t.stats.support} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* باکس اعتماد */}
      <section id="trust" className="py-4">
        <TrustBox t={t} />
      </section>

      {/* ویژگی‌ها (از دیتابیس — قابل ویرایش در ادمین) */}
      <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[96rem]">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-gradient-navy text-3xl font-black tracking-tight sm:text-5xl">
                {t.features.title}
              </h2>
              <p className="mt-4 text-charcoal-500">{t.features.subtitle}</p>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {features.length > 0
              ? features.map((f, i) => {
                  return (
                    <Reveal key={f.id} delay={i * 0.05}>
                      <TiltCard intensity={6} className="h-full">
                        <div className="card group flex h-full flex-col rounded-[1.25rem] p-3 sm:p-6 transition-shadow duration-500 hover:shadow-[0_30px_70px_-40px_rgba(19,78,92,0.6)]">
                          <div className="flex size-10 sm:size-14 items-center justify-center rounded-xl sm:rounded-2xl bg-petrol-600/12 text-petrol-700 transition-colors group-hover:bg-petrol-600/20">
                            {renderFeatureIcon(f.icon, "size-5 sm:size-7")}
                          </div>
                          <h3 className="mt-3 sm:mt-5 text-xs sm:text-lg font-bold text-navy-900">{f.title}</h3>
                          <div className="flex-1" />
                          <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm leading-5 sm:leading-7 text-charcoal-500">{f.desc}</p>
                        </div>
                      </TiltCard>
                    </Reveal>
                  );
                })
              : // fallback از دیکشنری (قابل ویرایش در پنل ادمین)
                ["variants", "ai", "b2b", "secure"].map((key, i) => {
                  const item = t.features.items[key as keyof typeof t.features.items];
                  return (
                    <Reveal key={key} delay={i * 0.05}>
                      <TiltCard intensity={6} className="h-full">
                        <div className="card group flex h-full flex-col rounded-[1.25rem] p-3 sm:p-6">
                          <div className="flex size-10 sm:size-14 items-center justify-center rounded-xl sm:rounded-2xl bg-petrol-600/12 text-petrol-700">
                            {renderFeatureIcon((item as any).icon, "size-5 sm:size-7")}
                          </div>
                          <h3 className="mt-3 sm:mt-5 text-xs sm:text-lg font-bold text-navy-900">{item.title}</h3>
                          <div className="flex-1" />
                          <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm leading-5 sm:leading-7 text-charcoal-500">{item.desc}</p>
                        </div>
                      </TiltCard>
                    </Reveal>
                  );
                })}
          </div>
        </div>
      </section>

      <AboutSection title={aboutTitle} text={aboutText} items={aboutItems} />

      {/* ناوبری نقطه‌ای اسکرول */}
      <ScrollDots />
    </>
  );
}

// ─── کارت آمار ───
const STAT_ICONS: Record<string, LucideIcon> = {
  Package, BadgeCheck, HardHat, Headset, ShieldCheck,
};

function StatCard({ icon, value }: { icon: string; value: string }) {
  const Icon = STAT_ICONS[icon] || ShieldCheck;
  return (
    <div className="card flex flex-col items-center justify-center rounded-[1.25rem] p-5 text-center transition-shadow hover:shadow-lg">
      <div className="flex size-12 items-center justify-center rounded-xl bg-petrol-600/12 text-petrol-700">
        <Icon className="size-6" strokeWidth={1.5} />
      </div>
      <span className="mt-3 text-lg font-bold text-navy-900 sm:text-xl">{value}</span>
    </div>
  );
}