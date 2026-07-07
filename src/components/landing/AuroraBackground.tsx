"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { TechnicalElements } from "./TechnicalElements";

/**
 * پس‌زمینه ثابت انیمیشنی روشن (Pearl Aurora).
 * ناحیه محتوای سایت سفید صدفی است و لایه‌های نور نرم با حرکت موس جابه‌جا می‌شوند
 * تا حس عمق و حرکت زنده ایجاد شود. هدر و فوتر روی این پس‌زمینه تیره باقی می‌مانند.
 */
export function AuroraBackground() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  const sx = useSpring(mx, { stiffness: 40, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 40, damping: 18, mass: 0.6 });

  const layer1X = useTransform(sx, (v) => v * 24);
  const layer1Y = useTransform(sy, (v) => v * 24);
  const layer2X = useTransform(sx, (v) => v * -40);
  const layer2Y = useTransform(sy, (v) => v * -40);
  const layer3X = useTransform(sx, (v) => v * 14);
  const layer3Y = useTransform(sy, (v) => v * 14);
  const gridX = useTransform(sx, (v) => v * -8);
  const gridY = useTransform(sy, (v) => v * -8);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mx.set(nx);
      my.set(ny);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-pearl-100"
    >
      {/* گرادیان پایه صدفی روشن */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-10%,#ffffff_0%,#f6f2e9_45%,#ece5d5_100%)]" />

      {/* لکه‌های نور نرم متحرک با تِینت نفتی/سرمه‌ای بسیار ملایم */}
      <motion.div
        style={{ x: layer2X, y: layer2Y }}
        className="absolute -left-40 top-[-10%] size-[46rem] rounded-full bg-petrol-300/25 blur-[130px] animate-aurora"
      />
      <motion.div
        style={{ x: layer1X, y: layer1Y }}
        className="absolute right-[-15%] top-[12%] size-[42rem] rounded-full bg-[#ffffff]/70 blur-[120px] animate-float-slow"
      />
      <motion.div
        style={{ x: layer3X, y: layer3Y }}
        className="absolute bottom-[-18%] left-[18%] size-[46rem] rounded-full bg-navy-500/12 blur-[150px] animate-aurora"
      />
      <motion.div
        style={{ x: layer1X, y: layer2Y }}
        className="absolute bottom-[8%] right-[8%] size-[34rem] rounded-full bg-pearl-300/50 blur-[110px] animate-float-slow"
      />

      {/* شبکه نقطه‌ای تیره ملایم */}
      <motion.div
        style={{ x: gridX, y: gridY }}
        className="grid-dots-dark absolute inset-[-4%] opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
      />

      {/* المان‌های تخصصی تأسیسات — شناور و آرام */}
      <TechnicalElements />

      {/* خطوط افق نفتی ملایم */}
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-petrol-500/15 to-transparent" />
      <div className="absolute inset-x-0 top-2/3 h-px bg-gradient-to-r from-transparent via-navy-500/12 to-transparent" />

      {/* هاله‌ی نرم پایین صفحه */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_120%,transparent_60%,#ddd2ba_100%)] opacity-40" />
    </div>
  );
}
