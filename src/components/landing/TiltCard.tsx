"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * کارت سه‌بعدی با چرخش نسبت به موس (perspective tilt).
 * روی موبایل به‌صورت لمسی صاف باقی می‌ماند و فقط انیمیشن ورود اجرا می‌شود.
 */
export function TiltCard({
  children,
  className,
  intensity = 10,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rx = useSpring(useTransform(my, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 150,
    damping: 15,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 150,
    damping: 15,
  });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={cn("perspective will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
