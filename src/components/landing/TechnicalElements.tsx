"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";

/* ==========================================================================
   المان‌های تخصصی تأسیسات — نقشه‌گونه و مهندسی (Line-art)
   لوله، شیر دروازه‌ای، فلنج، مانومتر، زانویی، سه‌راهی، پمپ
   طراحی دقیق و بزرگسال؛ بدون شکل کارتونی، با حرکت بسیار آرام
   ========================================================================== */

const STROKE = "#0b2136";

function Blueprint({
  children,
  className,
  size = 220,
  viewBox = "0 0 120 120",
}: {
  children: ReactNode;
  className?: string;
  size?: number;
  viewBox?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      className={className}
      stroke={STROKE}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** مانومتر / گِیج فشار */
function Gauge() {
  return (
    <Blueprint>
      <circle cx="60" cy="54" r="34" />
      <circle cx="60" cy="54" r="40" strokeDasharray="2 5" opacity="0.55" />
      <circle cx="60" cy="54" r="3.2" fill={STROKE} stroke="none" />
      {/* عقربه */}
      <path d="M60 54 L78 40" strokeWidth="1.8" />
      {/* درجه‌بندی */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = (-210 + i * 24) * (Math.PI / 180);
        const x1 = 60 + Math.cos(a) * 28;
        const y1 = 54 + Math.sin(a) * 28;
        const x2 = 60 + Math.cos(a) * 33;
        const y2 = 54 + Math.sin(a) * 33;
        return <path key={i} d={`M${x1.toFixed(6)} ${y1.toFixed(6)} L${x2.toFixed(6)} ${y2.toFixed(6)}`} />;
      })}
      {/* اتصال پایین */}
      <path d="M55 87 L55 98 L65 98 L65 87" />
      <path d="M52 98 L68 98 L68 104 L52 104 Z" />
    </Blueprint>
  );
}

/** شیر دروازه‌ای (Gate Valve) با فلایویل */
function GateValve() {
  return (
    <Blueprint viewBox="0 0 140 120">
      {/* بدنه لوله چپ/راست */}
      <path d="M6 66 L34 66 M106 66 L134 66" />
      <path d="M6 78 L34 78 M106 78 L134 78" />
      {/* فلنج‌ها */}
      <path d="M34 58 L34 86 M40 60 L40 84" />
      <path d="M106 58 L106 86 M100 60 L100 84" />
      {/* بدنه شیر (پاپیونی) */}
      <path d="M40 60 L60 72 L40 84 Z" />
      <path d="M100 60 L80 72 L100 84 Z" />
      <path d="M60 72 L80 72" />
      {/* بونت و ساقه */}
      <path d="M64 60 L76 60 L74 40 L66 40 Z" />
      <path d="M70 40 L70 20" />
      {/* فلایویل */}
      <circle cx="70" cy="16" r="12" />
      <circle cx="70" cy="16" r="3" fill={STROKE} stroke="none" />
      <path d="M58 16 L82 16 M70 4 L70 28" />
    </Blueprint>
  );
}

/** فلنج با پیچ‌ها (نمای روبرو) */
function Flange() {
  return (
    <Blueprint>
      <circle cx="60" cy="60" r="42" />
      <circle cx="60" cy="60" r="34" strokeDasharray="1 0" opacity="0.7" />
      <circle cx="60" cy="60" r="16" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45) * (Math.PI / 180);
        const x = 60 + Math.cos(a) * 26;
        const y = 60 + Math.sin(a) * 26;
        return <circle key={i} cx={x.toFixed(6)} cy={y.toFixed(6)} r="3.4" />;
      })}
    </Blueprint>
  );
}

/** زانویی ۹۰ درجه با فلنج */
function Elbow() {
  return (
    <Blueprint>
      <path d="M30 12 L30 60 A30 30 0 0 0 60 90 L108 90" />
      <path d="M42 12 L42 60 A18 18 0 0 0 60 78 L108 78" />
      {/* فلنج بالا */}
      <path d="M24 12 L48 12 M26 6 L46 6" />
      {/* فلنج راست */}
      <path d="M108 72 L108 96 M114 74 L114 94" />
      {/* خطوط مرکز */}
      <path d="M36 14 L36 58" strokeDasharray="3 4" opacity="0.5" />
      <path d="M62 84 L106 84" strokeDasharray="3 4" opacity="0.5" />
    </Blueprint>
  );
}

/** سه‌راهی (Tee fitting) */
function TeeFitting() {
  return (
    <Blueprint viewBox="0 0 140 120">
      <path d="M10 48 L130 48" />
      <path d="M10 74 L56 74 M84 74 L130 74" />
      <path d="M56 74 L56 112 M84 74 L84 112" />
      {/* فلنج‌ها */}
      <path d="M10 42 L10 80 M130 42 L130 80" />
      <path d="M50 112 L90 112" />
      <path d="M18 48 L18 74 M122 48 L122 74" strokeDasharray="3 4" opacity="0.5" />
    </Blueprint>
  );
}

/** پمپ سانتریفیوژ (نمای شماتیک) */
function Pump() {
  return (
    <Blueprint viewBox="0 0 140 120">
      <circle cx="58" cy="58" r="34" />
      {/* پروانه */}
      <path d="M58 58 m0 -22 a22 22 0 0 1 19 11" opacity="0.6" />
      <path d="M58 58 m19 11 a22 22 0 0 1 -38 0" opacity="0.6" />
      <path d="M58 58 m-19 -11 a22 22 0 0 1 19 -11" opacity="0.6" />
      <circle cx="58" cy="58" r="5" fill={STROKE} stroke="none" />
      {/* خروجی بالا */}
      <path d="M58 24 L58 8 L92 8 L92 20" />
      <path d="M74 8 L74 -2" opacity="0" />
      {/* ورودی افقی */}
      <path d="M92 50 L128 50 L128 66 L92 66" />
      {/* پایه */}
      <path d="M30 92 L86 92 L92 108 L24 108 Z" />
    </Blueprint>
  );
}

/** مقطع لوله با جوش/رزوه */
function PipeRun() {
  return (
    <Blueprint viewBox="0 0 160 60">
      <path d="M4 18 L156 18 M4 42 L156 42" />
      <path d="M40 12 L40 48 M42 12 L42 48" opacity="0.8" />
      <path d="M112 12 L112 48 M114 12 L114 48" opacity="0.8" />
      <path d="M76 18 L76 42" strokeDasharray="3 3" opacity="0.5" />
      <path d="M4 30 L156 30" strokeDasharray="4 5" opacity="0.35" />
    </Blueprint>
  );
}

type Item = {
  node: ReactNode;
  className: string;
  depth: number; // میزان واکنش به موس
  driftX: number;
  driftY: number;
  duration: number;
  rotate: number;
  opacity: number;
};

const ITEMS: Item[] = [
  { node: <Gauge />, className: "top-[14%] left-[6%] w-40 md:w-56", depth: 22, driftX: 30, driftY: -18, duration: 26, rotate: 6, opacity: 0.16 },
  { node: <GateValve />, className: "top-[62%] left-[3%] w-52 md:w-72", depth: 34, driftX: -24, driftY: 26, duration: 32, rotate: -5, opacity: 0.14 },
  { node: <Flange />, className: "top-[8%] right-[8%] w-36 md:w-52", depth: 28, driftX: -30, driftY: 22, duration: 30, rotate: 8, opacity: 0.15 },
  { node: <Elbow />, className: "top-[46%] right-[5%] w-44 md:w-60", depth: 18, driftX: 26, driftY: -20, duration: 34, rotate: -6, opacity: 0.13 },
  { node: <TeeFitting />, className: "bottom-[6%] right-[24%] w-48 md:w-64", depth: 40, driftX: -20, driftY: -24, duration: 38, rotate: 4, opacity: 0.12 },
  { node: <Pump />, className: "bottom-[10%] left-[26%] w-48 md:w-64", depth: 24, driftX: 22, driftY: 18, duration: 36, rotate: -4, opacity: 0.12 },
  { node: <PipeRun />, className: "top-[36%] left-[38%] w-60 md:w-80", depth: 14, driftX: 34, driftY: 14, duration: 40, rotate: 3, opacity: 0.1 },
];

function FloatingItem({ item, mx, my }: { item: Item; mx: ReturnType<typeof useSpring>; my: ReturnType<typeof useSpring> }) {
  const x = useTransform(mx, (v) => v * item.depth);
  const y = useTransform(my, (v) => v * item.depth);
  return (
    <motion.div style={{ x, y }} className={`absolute ${item.className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: item.opacity,
          x: [0, item.driftX, 0],
          y: [0, item.driftY, 0],
          rotate: [0, item.rotate, 0],
        }}
        transition={{
          opacity: { duration: 2 },
          x: { duration: item.duration, repeat: Infinity, ease: "easeInOut" },
          y: { duration: item.duration * 1.15, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: item.duration * 1.3, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {item.node}
      </motion.div>
    </motion.div>
  );
}

export function TechnicalElements() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 30, damping: 20, mass: 0.8 });
  const sy = useSpring(my, { stiffness: 30, damping: 20, mass: 0.8 });

  useEffect(() => {
    function onMove(e: PointerEvent) {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(circle_at_center,black,transparent_92%)]"
    >
      {ITEMS.map((item, i) => (
        <FloatingItem key={i} item={item} mx={sx} my={sy} />
      ))}
    </div>
  );
}
