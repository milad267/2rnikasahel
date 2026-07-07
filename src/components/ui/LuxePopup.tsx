"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type PopupProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
};

/**
 * پاپ‌آپ لوکس درنیکا:
 * - باکس داخلی: سفید (card) با سایه
 * - بیرون باکس: شیشه‌ای (backdrop blur)
 * - قابل درگ با موس
 * - اسکرول داخلی
 * - همیشه وسط صفحه
 */
export function LuxePopup({ open, onClose, title, children, maxWidth = "max-w-lg" }: PopupProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 24, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 280, damping: 24, mass: 0.5 });
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragStart = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
    dragStart.current = true;
    setIsDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      x.set(x.get() + dx);
      y.set(y.get() + dy);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    },
    [x, y],
  );

  const onPointerUp = useCallback(() => {
    dragStart.current = false;
    setIsDragging(false);
  }, []);

  // هر بار باز شدن، موقعیت رو ریست کن وسط
  useEffect(() => {
    if (open) {
      x.set(0);
      y.set(0);
    }
  }, [open, x, y]);

  // بستن با Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* پس‌زمینه شیشه‌ای تار */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-950/55 backdrop-blur-md"
          />

          {/* باکس سفید اصلی (card) — وسط صفحه با انیمیشن */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ x: springX, y: springY }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={cn(
              "card relative w-full overflow-hidden rounded-[2rem] shadow-[0_40px_120px_-40px_rgba(3,12,22,0.55)] border-navy-900/10",
              maxWidth,
              isDragging ? "cursor-grabbing" : "cursor-default",
            )}
          >
            {/* handle درگ */}
            <div
              data-drag-handle
              className="flex w-full cursor-grab items-center justify-between border-b border-navy-900/8 px-5 py-3 active:cursor-grabbing"
            >
              <div data-drag-handle className="flex items-center gap-2 text-charcoal-400">
                <GripHorizontal className="size-4" strokeWidth={1.8} />
                {title && (
                  <span data-drag-handle className="select-none text-xs font-semibold text-charcoal-500">
                    {title}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full bg-navy-900/5 text-charcoal-500 transition-colors hover:bg-navy-900/10 hover:text-navy-900"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            {/* محتوای اسکرول‌شونده داخلی */}
            <div className="max-h-[65vh] overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-gutter:stable]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
