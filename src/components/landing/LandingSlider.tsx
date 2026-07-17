"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
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

// ─── المان‌های تزیینی هندسی ───
const decorativeShapes = [
  { id: 1, size: 280, x: "5%", y: "10%", blur: 180, opacity: 0.12 },
  { id: 2, size: 420, x: "75%", y: "-8%", blur: 220, opacity: 0.08 },
  { id: 3, size: 200, x: "82%", y: "60%", blur: 160, opacity: 0.15 },
  { id: 4, size: 340, x: "-6%", y: "55%", blur: 200, opacity: 0.10 },
];

// ─── کامپوننت دکمه مغناطیسی ───
function MagneticButton({
  children,
  href,
  className = "",
  accentColor,
  style,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
  accentColor?: string | null;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mx.set(x * 0.2);
    my.set(y * 0.2);
  };

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const springX = useSpring(mx, { stiffness: 150, damping: 8 });
  const springY = useSpring(my, { stiffness: 150, damping: 8 });

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ ...style, x: springX, y: springY } as any}
      className={className}
    >
      {children}
    </motion.a>
  );
}

export function LandingSlider({ slides, locale }: { slides: Slide[]; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const count = slides.length;

  // ─── 3D Tilt روی کارت ───
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [8, -8]), { stiffness: 80, damping: 12 });
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-8, 8]), { stiffness: 80, damping: 12 });

  // ─── Glow position follows mouse ───
  const glowX = useSpring(useTransform(tiltX, [-0.5, 0.5], [20, 80]), { stiffness: 60, damping: 15 });
  const glowY = useSpring(useTransform(tiltY, [-0.5, 0.5], [20, 80]), { stiffness: 60, damping: 15 });

  const handleTilt = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    tiltX.set(Math.min(0.5, Math.max(-0.5, nx)));
    tiltY.set(Math.min(0.5, Math.max(-0.5, ny)));
  }, [tiltX, tiltY]);

  const resetTilt = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

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

  const fractionStr = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  // ─── واریانت‌های انیمیشن با زوم کند (Ken Burns) ───
  const zoomVariants = {
    enter: { scale: 1.15 },
    center: { scale: 1.08, transition: { duration: 7, ease: "easeOut" as const } },
    exit: { scale: 1.15, transition: { duration: 0.6 } },
  };

  // ─── واریانت‌های متن با اسپرینگ ───
  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const textItemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); resetTilt(); }}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("[data-text]")) e.preventDefault();
      }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchMove={(e) => { touchEndX.current = e.touches[0].clientX; }}
      onTouchEnd={() => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;
        if (Math.abs(diff) > threshold) {
          if (diff > 0) go(1);
          else go(-1);
        }
      }}
    >
      <motion.div
        ref={cardRef}
        onPointerMove={handleTilt}
        onPointerLeave={resetTilt}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="perspective will-change-transform card group relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_120px_-40px_rgba(3,12,22,0.55)]"
      >
        {/* ─── حاشیه گرادیانت متحرک ─── */}
        <div className="pointer-events-none absolute -inset-[1px] z-30 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-r from-transparent via-pearl-50/15 to-transparent animate-[shimmer_4s_ease-in-out_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="pointer-events-none absolute -inset-[1.5px] z-30 rounded-[2rem] sm:rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, transparent, ${slide.accentColor || "#6cbccb"}66, transparent, ${slide.accentColor || "#6cbccb"}33, transparent)`,
            animation: "spin 6s linear infinite",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1.5px",
          }}
        />
        {/* کانتینر اسلاید با ارتفاع خودکار و responsive */}
        <div className="relative aspect-[3/2] sm:aspect-[16/7] md:aspect-[21/9] lg:aspect-[24/9]" style={{ transformStyle: "preserve-3d" }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, scale: 1.06, x: direction > 0 ? 80 : -80, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.94, x: direction > 0 ? -80 : 80, filter: "blur(6px)" }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {/* ─── لایه پس‌زمینه با زوم کند Ken Burns ─── */}
              {slide.image ? (
                <motion.div
                  className="absolute inset-[-12%] bg-cover bg-center"
                  style={{ backgroundImage: `url(${slide.image})` }}
                  variants={zoomVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
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

              {/* ─── پوشش‌های گرادیان ─── */}
              <div className="absolute inset-0 bg-gradient-to-l from-navy-950/85 via-navy-950/55 to-navy-950/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-navy-950/10 to-transparent" />

              {/* ─── المان‌های تزیینی شناور ─── */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {decorativeShapes.map((shape) => (
                  <div
                    key={shape.id}
                    style={{
                      position: "absolute",
                      left: shape.x,
                      top: shape.y,
                      width: shape.size,
                      height: shape.size,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${slide.accentColor || "#6cbccb"}22, transparent)`,
                      filter: `blur(${shape.blur}px)`,
                      opacity: shape.opacity,
                    }}
                  />
                ))}

                {/* دایره‌های کوچک تزیینی - با افکت 3D از tilt والد */}
                <div className="absolute right-[12%] top-[18%] size-3 rounded-full border border-pearl-50/10 opacity-40" />
                <div className="absolute left-[15%] bottom-[22%] size-2 rounded-full bg-pearl-50/8" />
                <div className="absolute right-[28%] bottom-[35%] size-1.5 rounded-full bg-pearl-50/15" />
                <div className="absolute left-[8%] top-[45%] size-4 rounded-full border border-pearl-50/8 opacity-30" />

                {/* خطوط تزیینی عمودی */}
                <div className="absolute right-[18%] top-[10%] h-12 w-px bg-gradient-to-b from-pearl-50/0 via-pearl-50/10 to-pearl-50/0" />
                <div className="absolute left-[22%] bottom-[15%] h-8 w-px bg-gradient-to-b from-pearl-50/0 via-pearl-50/8 to-pearl-50/0" />

                {/* ─── رفلکت نوری متحرک روی متن ─── */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.06) 0%, transparent 60%)`,
                  }}
                />
              </div>

              {/* ─── بافت نویز ظریف ─── */}
              <div
                className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: "256px 256px",
                }}
              />

              {/* ─── محتوای اسلاید ─── */}
              <div className="relative z-10 flex h-full flex-col justify-center pr-14 pl-4 sm:px-8 md:px-16" style={{ transformStyle: "preserve-3d" }}>
                <motion.div
                  data-text
                  variants={textContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="max-w-lg md:max-w-xl"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {slide.badge && (
                    <motion.span
                      variants={textItemVariants}
                      className="mb-1.5 md:mb-4 inline-flex items-center gap-1 md:gap-2 rounded-full border px-2 md:px-3.5 py-0.5 md:py-1.5 text-[8px] md:text-[11px] lg:text-xs font-medium backdrop-blur-md"
                      style={{
                        borderColor: `${slide.accentColor || "#6cbccb"}55`,
                        color: slide.accentColor || "#6cbccb",
                        backgroundColor: `${slide.accentColor || "#6cbccb"}1a`,
                      }}
                    >
                      <span className="relative flex size-1 md:size-2">
                        <span
                          className="absolute inline-flex size-full animate-ping rounded-full opacity-70"
                          style={{ backgroundColor: slide.accentColor || "#6cbccb" }}
                        />
                        <span
                          className="relative inline-flex size-1 md:size-2 rounded-full"
                          style={{ backgroundColor: slide.accentColor || "#6cbccb" }}
                        />
                      </span>
                      {slide.badge}
                    </motion.span>
                  )}

                  <motion.h2
                    variants={textItemVariants}
                    className="text-base sm:text-2xl md:text-4xl lg:text-5xl font-black leading-[1.15] tracking-tight bg-gradient-to-r from-pearl-50 via-pearl-100 to-pearl-200 bg-clip-text text-transparent"
                    style={{ filter: "drop-shadow(0 2px 30px rgba(0,0,0,0.6))" }}
                  >
                    {slide.title}
                  </motion.h2>

                  {slide.subtitle && (
                    <motion.p
                      variants={textItemVariants}
                      className="mt-1.5 md:mt-4 max-w-sm md:max-w-lg text-[10px] sm:text-sm md:text-base leading-5 md:leading-7 text-pearl-200/80"
                    >
                      {slide.subtitle}
                    </motion.p>
                  )}

                  <motion.div
                    variants={textItemVariants}
                    className="mt-3 md:mt-7 flex flex-wrap gap-1.5 md:gap-3"
                  >
                    {slide.ctaText && slide.ctaHref && (
                      <MagneticButton
                        href={slide.ctaHref}
                        accentColor={slide.accentColor}
                        className="group relative inline-flex items-center gap-1 md:gap-2 rounded-full px-3 md:px-6 py-1.5 md:py-3 text-[9px] md:text-xs lg:text-sm font-semibold text-pearl-50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: slide.accentColor || "#196374",
                          boxShadow: `0 12px 40px -12px ${slide.accentColor || "#196374"}aa`,
                        } as React.CSSProperties}
                      >
                        {/* پالس گلو اطراف دکمه */}
                        <span
                          className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{
                            background: `radial-gradient(ellipse at center, ${slide.accentColor || "#196374"}44 0%, transparent 70%)`,
                            animation: "pulseGlow 2s ease-in-out infinite",
                          }}
                        />
                        {slide.ctaText}
                        <Arrow className={arrowClass} strokeWidth={2} />
                      </MagneticButton>
                    )}
                    {slide.cta2Text && slide.cta2Href && (
                      <MagneticButton
                        href={slide.cta2Href}
                        accentColor={slide.accentColor}
                        className="group inline-flex items-center gap-1 md:gap-2 rounded-full px-3 md:px-6 py-1.5 md:py-3 text-[9px] md:text-xs lg:text-sm font-semibold text-pearl-100 backdrop-blur-xl transition-all hover:text-pearl-50 hover:bg-pearl-100/10"
                        style={{
                          border: "1px solid rgba(255,255,255,0.12)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                        } as React.CSSProperties}
                      >
                        {slide.cta2Text}
                      </MagneticButton>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ─── دکمه‌های ناوبری ─── */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="قبلی"
                className="glass absolute start-2 md:start-4 top-1/2 z-20 flex size-8 md:size-11 -translate-y-1/2 items-center justify-center rounded-full text-pearl-100/70 transition-all hover:scale-110 hover:text-pearl-50 hover:bg-pearl-100/15 active:scale-95"
              >
                <ChevronRight className="size-4 md:size-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="بعدی"
                className="glass absolute end-2 md:end-4 top-1/2 z-20 flex size-8 md:size-11 -translate-y-1/2 items-center justify-center rounded-full text-pearl-100/70 transition-all hover:scale-110 hover:text-pearl-50 hover:bg-pearl-100/15 active:scale-95"
              >
                <ChevronLeft className="size-4 md:size-5" strokeWidth={2} />
              </button>
            </>
          )}
        </div>

        {/* ─── نوار ناوبری پایین ─── */}
        {count > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-6 pb-4 md:pb-5">
            {/* شمارنده کسری */}
            <div className="hidden sm:flex items-center gap-2.5 text-pearl-50/50">
              <span className="text-xs font-mono font-bold tracking-wider tabular-nums text-pearl-50/80">
                {fractionStr}
              </span>
              <span className="h-px w-8 bg-gradient-to-r from-pearl-50/30 to-transparent" />
            </div>

            {/* نقاط پیشرفت با طراحی شیشه‌ای */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-pearl-100/5 backdrop-blur-sm">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`اسلاید ${i + 1}`}
                  className="relative h-1 overflow-hidden rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: i === index ? 40 : i === index - 1 || i === index + 1 ? 12 : 6,
                    backgroundColor: i === index ? `${slide.accentColor || "#6cbccb"}55` : "rgba(255,255,255,0.15)",
                  }}
                >
                  {i === index && !paused && (
                    <motion.span
                      key={`prog-${index}`}
                      className="absolute inset-y-0 start-0 rounded-full"
                      style={{ backgroundColor: slide.accentColor || "#6cbccb" }}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                    />
                  )}
                  {i === index && paused && (
                    <span className="absolute inset-0 rounded-full" style={{ backgroundColor: slide.accentColor || "#6cbccb" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── براقی لبه (edge highlight) ─── */}
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] ring-1 ring-inset ring-white/5" />
      </motion.div>
    </div>
  );
}
