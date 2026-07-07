"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

export type Slide = {
  id: number;
  badge: string | null;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  cta2Text: string | null;
  cta2Href: string | null;
  accentColor: string | null;
  image: string | null;
};

const AUTOPLAY_MS = 6500;

export function LandingSlider({ slides, locale }: { slides: Slide[]; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides.length;

  const go = useCallback(
    (dir: number) => {
      setDirection(dir);
      setIndex((prev) => (prev + dir + count) % count);
    },
    [count],
  );

  const goTo = useCallback(
    (i: number) => {
      setDirection(i > index ? 1 : -1);
      setIndex(i);
    },
    [index],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    timer.current = setInterval(() => go(1), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, count, go]);

  if (count === 0) return null;
  const slide = slides[index];
  const Arrow = ArrowLeft;
  const arrowClass = "size-4 transition-transform group-hover:-translate-x-1";

  const variants = {
    enter: (dir: number) => ({ opacity: 0, scale: 1.08, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, scale: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, scale: 0.96, x: dir > 0 ? -60 : 60 }),
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("[data-text]")) e.preventDefault();
      }}
    >
      <div className="card relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
        {/* کانتینر اسلاید با ارتفاع ثابت */}
        <div className="relative h-[24rem] overflow-hidden sm:h-[26rem] md:h-[30rem]">
          <AnimatePresence custom={direction} mode="popLayout">
            <motion.div
              key={slide.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {/* لایه پس‌زمینه با افکت Ken Burns */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
              >
                {slide.image ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${slide.image})` }}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(120% 120% at 18% 12%, ${
                        slide.accentColor || "#124e5c"
                      }33 0%, #0b2136 45%, #05101d 100%)`,
                    }}
                  />
                )}
                {/* پوشش تیره برای خوانایی متن */}
                <div className="absolute inset-0 bg-gradient-to-l from-navy-950/85 via-navy-950/55 to-navy-950/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
                {/* شبکه نقطه‌ای ظریف */}
                <div className="grid-dots absolute inset-0 opacity-30" />
              </motion.div>

              {/* محتوای اسلاید — متن غیرقابل کپی */}
              <div className="relative z-10 flex h-full flex-col justify-center px-7 sm:px-12 md:px-16">
                <motion.div
                  data-text
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.6 }}
                  className="max-w-xl"
                >
                  {slide.badge && (
                    <span
                      className="mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md sm:text-xs"
                      style={{
                        borderColor: `${slide.accentColor || "#6cbccb"}55`,
                        color: slide.accentColor || "#6cbccb",
                        backgroundColor: `${slide.accentColor || "#6cbccb"}1a`,
                      }}
                    >
                      <span className="relative flex size-2">
                        <span
                          className="absolute inline-flex size-full animate-ping rounded-full opacity-70"
                          style={{ backgroundColor: slide.accentColor || "#6cbccb" }}
                        />
                        <span
                          className="relative inline-flex size-2 rounded-full"
                          style={{ backgroundColor: slide.accentColor || "#6cbccb" }}
                        />
                      </span>
                      {slide.badge}
                    </span>
                  )}

                  <h2
                    className="text-2xl font-black leading-[1.2] tracking-tight text-pearl-50 sm:text-4xl md:text-5xl"
                    style={{ textShadow: "0 2px 30px rgba(0,0,0,0.4)" }}
                  >
                    {slide.title}
                  </h2>

                  {slide.subtitle && (
                    <p className="mt-4 max-w-lg text-sm leading-7 text-pearl-200/80 sm:text-base sm:leading-8">
                      {slide.subtitle}
                    </p>
                  )}

                  <div className="mt-7 flex flex-wrap gap-3">
                    {slide.ctaText && slide.ctaHref && (
                      <Link
                        href={slide.ctaHref}
                        className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold text-pearl-50 shadow-lg transition-all hover:-translate-y-0.5 sm:text-sm"
                        style={{
                          backgroundColor: slide.accentColor || "#196374",
                          boxShadow: `0 12px 40px -12px ${slide.accentColor || "#196374"}aa`,
                        }}
                      >
                        {slide.ctaText}
                        <Arrow className={arrowClass} strokeWidth={2} />
                      </Link>
                    )}
                    {slide.cta2Text && slide.cta2Href && (
                      <Link
                        href={slide.cta2Href}
                        className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold text-pearl-100 transition-colors hover:text-pearl-50 sm:text-sm"
                      >
                        {slide.cta2Text}
                      </Link>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* دکمه‌های ناوبری */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="قبلی"
                className="glass absolute start-4 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-pearl-100 transition-all hover:bg-pearl-100/15 sm:size-11"
              >
                <ChevronRight className="size-5" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="بعدی"
                className="glass absolute end-4 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-pearl-100 transition-all hover:bg-pearl-100/15 sm:size-11"
              >
                <ChevronLeft className="size-5" strokeWidth={1.8} />
              </button>
            </>
          )}
        </div>

        {/* نوار پیشرفت + نقاط */}
        {count > 1 && (
          <div className="absolute bottom-5 z-20 flex w-full items-center justify-center gap-2 px-4">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`اسلاید ${i + 1}`}
                className="group relative h-1.5 overflow-hidden rounded-full bg-pearl-100/25 transition-all"
                style={{ width: i === index ? 36 : 12 }}
              >
                {i === index && !paused && (
                  <motion.span
                    key={`prog-${index}`}
                    className="absolute inset-y-0 start-0 rounded-full bg-pearl-50"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                  />
                )}
                {i === index && paused && (
                  <span className="absolute inset-0 rounded-full bg-pearl-50" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
