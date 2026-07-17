"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, Compass, Boxes, Cpu, Layers } from "lucide-react";
import { TiltCard } from "./TiltCard";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

const ICON_MAP: Record<string, React.ReactNode> = {
  Boxes: <Boxes className="size-6" strokeWidth={1.6} />,
  Cpu: <Cpu className="size-6" strokeWidth={1.6} />,
  Layers: <Layers className="size-6" strokeWidth={1.6} />,
  ShieldCheck: <Boxes className="size-6" strokeWidth={1.6} />,
  Compass: <Compass className="size-6" strokeWidth={1.6} />,
};

function renderIcon(iconName: string, className = "size-6") {
  if (!iconName) return <Boxes className={className} strokeWidth={1.6} />;
  // اگه آدرس تصویر باشه (با / یا http شروع بشه)
  if (iconName.startsWith("/") || iconName.startsWith("http")) {
    return <img src={iconName} alt="" className={className} />;
  }
  // اسم آیکون Lucide
  return ICON_MAP[iconName] || <Boxes className={className} strokeWidth={1.6} />;
}

export type HeroCardData = {
  icon: string;
  title: string;
  value: string;
};

export function Hero({ t, locale, cards }: {
  t: Dictionary;
  locale: Locale;
  cards?: HeroCardData[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yCards = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const Arrow = locale === "fa" ? ArrowLeft : ArrowLeft;

  return (
    <section
      id="hero"
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pt-28 pb-16 sm:px-6"
    >
      <div className="mx-auto grid w-full max-w-[96rem] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* متن اصلی */}
        <motion.div style={{ y: yTitle, opacity }} className="text-center lg:text-start">
          <motion.span
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="card inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-petrol-700"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-petrol-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-petrol-400" />
            </span>
            {t.hero.badge}
          </motion.span>

          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-6 text-4xl font-black leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="text-gradient-navy">{t.hero.title}</span>
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-base leading-8 text-charcoal-500 lg:mx-0"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link
              href="/shop"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-7 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 sm:w-auto"
            >
              {t.hero.ctaPrimary}
              <Arrow className="size-4 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
            </Link>
            <Link
              href="/finder"
              className="card inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-navy-800 transition-colors hover:text-navy-900 sm:w-auto"
            >
              <Compass className="size-4" strokeWidth={1.8} />
              {t.hero.ctaSecondary}
            </Link>
          </motion.div>
        </motion.div>

        {/* کارت‌های شناور سه‌بعدی - دسکتاپ */}
        <motion.div style={{ y: yCards }} className="relative hidden h-[30rem] lg:block">
          {cards && cards.length >= 3 ? (
            <>
              <FloatingCard className="absolute end-0 top-4 w-64" delay={0.3}
                icon={renderIcon(cards[0]?.icon)} title={cards[0]?.title || "سیستم تنوع محصول"}
                value={cards[0]?.value || "نامحدود"} accent />
              <FloatingCard className="absolute start-0 top-40 w-60" delay={0.5}
                icon={renderIcon(cards[1]?.icon)} title={cards[1]?.title || "هوش مصنوعی"}
                value={cards[1]?.value || "۴ ماژول"} />
              <FloatingCard className="absolute end-10 bottom-2 w-56" delay={0.7}
                icon={renderIcon(cards[2]?.icon)} title={cards[2]?.title || "واحدهای اندازه‌گیری"}
                value={cards[2]?.value || "۱۹+"} />
            </>
          ) : (
            <>
              <FloatingCard className="absolute end-0 top-4 w-64" delay={0.3}
                icon={renderIcon("Boxes")} title="سیستم تنوع محصول" value="نامحدود" accent />
              <FloatingCard className="absolute start-0 top-40 w-60" delay={0.5}
                icon={renderIcon("Cpu")} title="هوش مصنوعی" value="۴ ماژول" />
              <FloatingCard className="absolute end-10 bottom-2 w-56" delay={0.7}
                icon={renderIcon("Layers")} title="واحدهای اندازه‌گیری" value="۱۹+" />
            </>
          )}
        </motion.div>

        {/* کارت‌های شناور - موبایل (گرید ۳ تایی زیر متن) */}
        <div className="mt-8 grid grid-cols-3 gap-3 lg:hidden">
          {cards && cards.length >= 3 ? (
            [0, 1, 2].map((i) => (
              <MobileCard key={i} icon={renderIcon(cards[i]?.icon, "size-5")}
                title={cards[i]?.title || ""} value={cards[i]?.value || ""} accent={i === 0} />
            ))
          ) : (
            <>
              <MobileCard icon={renderIcon("Boxes", "size-5")} title="سیستم تنوع محصول" value="نامحدود" accent />
              <MobileCard icon={renderIcon("Cpu", "size-5")} title="هوش مصنوعی" value="۴ ماژول" />
              <MobileCard icon={renderIcon("Layers", "size-5")} title="واحدهای اندازه‌گیری" value="۱۹+" />
            </>
          )}
        </div>
      </div>

      {/* اسکرول‌داون */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div className="flex h-9 w-6 items-start justify-center rounded-full border border-navy-900/25 p-1.5">
          <motion.span
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="size-1.5 rounded-full bg-petrol-600"
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  className,
  delay,
  icon,
  title,
  value,
  accent,
}: {
  className?: string;
  delay: number;
  icon: React.ReactNode;
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 6 + delay * 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <TiltCard intensity={12}>
          <div
            className={`card rounded-[1.5rem] p-5 ${
              accent ? "ring-1 ring-petrol-500/30" : ""
            }`}
          >
            <div
              className={`flex size-12 items-center justify-center rounded-2xl ${
                accent ? "bg-petrol-600/15 text-petrol-700" : "bg-navy-900/5 text-navy-700"
              }`}
            >
              {icon}
            </div>
            <p className="mt-4 text-sm text-charcoal-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
          </div>
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}

// ─── کارت فشرده برای موبایل ───
function MobileCard({ icon, title, value, accent }: { icon: React.ReactNode; title: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`card rounded-xl p-3 text-center ${
        accent ? "ring-1 ring-petrol-500/30" : ""
      }`}
    >
      <div
        className={`mx-auto flex size-10 items-center justify-center rounded-xl ${
          accent ? "bg-petrol-600/15 text-petrol-700" : "bg-navy-900/5 text-navy-700"
        }`}
      >
        {icon}
      </div>
      <p className="mt-2 text-[9px] font-medium text-charcoal-500 line-clamp-1">{title}</p>
      <p className="mt-0.5 text-sm font-bold text-navy-900">{value}</p>
    </div>
  );
}