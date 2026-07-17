"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Move } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  /** غیرفعال‌کردن قابلیت جابجایی با درگ */
  draggable?: boolean;
};

const SIZE_MAP = {
  sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg",
  xl: "max-w-xl", "2xl": "max-w-2xl", "3xl": "max-w-3xl", "4xl": "max-w-4xl",
};

export function Modal({ isOpen, onClose, title, headerAction, children, footer, size = "3xl", draggable = true }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  // با هر بار باز شدن، موقعیت به مرکز برمی‌گردد
  useEffect(() => { if (isOpen) setPos({ x: 0, y: 0 }); }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [isOpen, onClose]);

  // درگ با ماوس از روی هدر
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current) return;
      setPos({ x: drag.current.baseX + (e.clientX - drag.current.startX), y: drag.current.baseY + (e.clientY - drag.current.startY) });
    }
    function onUp() { drag.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  function startDrag(e: React.MouseEvent) {
    if (!draggable) return;
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div
        className={cn("bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] my-auto", SIZE_MAP[size])}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — دستگیره درگ */}
        <div
          className={cn("flex-shrink-0 flex items-center justify-between p-5 border-b bg-white rounded-t-2xl select-none", draggable && "cursor-move")}
          onMouseDown={startDrag}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {draggable && <Move className="size-4 text-slate-300" />} {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerAction}
            <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Body - اسکرول با غلتک ماوس */}
        <div
          className="flex-1 p-6 modal-scroll"
          style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          onWheel={(e) => e.stopPropagation()}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 flex items-center justify-end gap-3 p-5 border-t bg-white rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
