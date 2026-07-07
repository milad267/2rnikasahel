"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * انیمیشن ورود هنگام اسکرول — کارت‌ها روی پس‌زمینه ثابت «سُر می‌خورند».
 */
export function Reveal({
  children,
  delay = 0,
  y = 40,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
