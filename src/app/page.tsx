import { Boxes } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getLandingSlides, getLandingFeatures } from "@/lib/landing";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { TiltCard } from "@/components/landing/TiltCard";
import { TrustBox } from "@/components/landing/TrustBox";
import { LandingSlider } from "@/components/landing/LandingSlider";
import { getFeatureIcon } from "@/components/landing/IconMap";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const [slides, features] = await Promise.all([getLandingSlides(), getLandingFeatures()]);

  return (
    <>
      <Hero t={t} locale={locale} />

      {/* اسلایدر لاکچری */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <LandingSlider slides={slides} locale={locale} />
        </div>
      </section>

      {/* باکس اعتماد */}
      <section className="py-4">
        <TrustBox />
      </section>

      {/* ویژگی‌ها (از دیتابیس — قابل ویرایش در ادمین) */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-gradient-navy text-3xl font-black tracking-tight sm:text-5xl">
                {t.features.title}
              </h2>
              <p className="mt-4 text-charcoal-500">{t.features.subtitle}</p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.length > 0
              ? features.map((f, i) => {
                  const Icon = getFeatureIcon(f.icon);
                  return (
                    <Reveal key={f.id} delay={i * 0.08}>
                      <TiltCard intensity={8} className="h-full">
                        <div className="card group flex h-full flex-col rounded-[1.75rem] p-6 transition-shadow duration-500 hover:shadow-[0_30px_70px_-40px_rgba(19,78,92,0.6)]">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-petrol-600/12 text-petrol-700 transition-colors group-hover:bg-petrol-600/20">
                            <Icon className="size-7" strokeWidth={1.5} />
                          </div>
                          <h3 className="mt-5 text-lg font-bold text-navy-900">{f.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-charcoal-500">{f.desc}</p>
                        </div>
                      </TiltCard>
                    </Reveal>
                  );
                })
              : // fallback در صورت نبود داده
                ["variants", "ai", "b2b", "secure"].map((key, i) => {
                  const item = t.features.items[key as keyof typeof t.features.items];
                  return (
                    <Reveal key={key} delay={i * 0.08}>
                      <TiltCard intensity={8} className="h-full">
                        <div className="card group flex h-full flex-col rounded-[1.75rem] p-6">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-petrol-600/12 text-petrol-700">
                            <Boxes className="size-7" strokeWidth={1.5} />
                          </div>
                          <h3 className="mt-5 text-lg font-bold text-navy-900">{item.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-charcoal-500">{item.desc}</p>
                        </div>
                      </TiltCard>
                    </Reveal>
                  );
                })}
          </div>
        </div>
      </section>
    </>
  );
}
