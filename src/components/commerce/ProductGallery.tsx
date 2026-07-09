"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

type Props = {
  images: string[];
  title: string;
};

export function ProductGallery({ images, title }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const allImages = images.length > 0 ? images : [];

  const goTo = useCallback((index: number) => {
    if (index < 0) setCurrentIndex(allImages.length - 1);
    else if (index >= allImages.length) setCurrentIndex(0);
    else setCurrentIndex(index);
  }, [allImages.length]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") goTo(currentIndex + 1);
      if (e.key === "ArrowLeft") goTo(currentIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, currentIndex, goTo]);

  // Drag handling for lightbox
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(e.clientX);
    setDragOffset(0);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart === null) return;
    setDragOffset(e.clientX - dragStart);
  };
  const handleMouseUp = () => {
    if (dragStart === null) return;
    if (dragOffset > 80) goTo(currentIndex - 1);
    else if (dragOffset < -80) goTo(currentIndex + 1);
    setDragStart(null);
    setDragOffset(0);
  };

  // Touch support
  const touchStart = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (diff > 80) goTo(currentIndex - 1);
    else if (diff < -80) goTo(currentIndex + 1);
    touchStart.current = null;
  };

  if (allImages.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[2rem] bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
        <span className="text-6xl font-black tracking-widest text-navy-900/10 select-none">درنیکا ساحل</span>
      </div>
    );
  }

  return (
    <>
      {/* گالری اصلی */}
      <div className="space-y-3">
        {/* تصویر بزرگ */}
        <div
          ref={containerRef}
          onClick={() => setLightboxOpen(true)}
          className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-navy-900/5"
        >
          <div className="flex aspect-[4/3] items-center justify-center">
            <img
              src={allImages[currentIndex]}
              alt={`${title} - ${currentIndex + 1}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          {/* دکمه زوم */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3.5" strokeWidth={1.8} />
            بزرگنمایی
          </div>

          {/* فلش‌ها روی تصویر اصلی */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 text-navy-900 shadow-md opacity-0 transition-all hover:bg-white group-hover:opacity-100"
              >
                <ChevronRight className="size-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 text-navy-900 shadow-md opacity-0 transition-all hover:bg-white group-hover:opacity-100"
              >
                <ChevronLeft className="size-5" strokeWidth={2} />
              </button>
            </>
          )}
        </div>

        {/* نوار تصاویر کوچک */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" dir="ltr">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`shrink-0 size-16 overflow-hidden rounded-xl border-2 transition-all ${
                  i === currentIndex
                    ? "border-petrol-500 shadow-md ring-1 ring-petrol-300"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── لایت‌باکس ─── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* دکمه بستن */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 left-5 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            <X className="size-5" strokeWidth={2} />
          </button>

          {/* شمارنده */}
          <div className="absolute top-5 right-5 z-10 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md">
            {currentIndex + 1} / {allImages.length}
          </div>

          {/* فلش قبلی */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={() => goTo(currentIndex - 1)}
              className="absolute right-5 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              <ChevronRight className="size-6" strokeWidth={2} />
            </button>
          )}

          {/* تصویر اصلی لایت‌باکس */}
          <div
            className="flex max-h-[85vh] max-w-[90vw] items-center justify-center"
            style={{ transform: dragOffset ? `translateX(${dragOffset}px)` : undefined, transition: dragStart !== null ? "none" : "transform 0.3s ease" }}
          >
            <img
              src={allImages[currentIndex]}
              alt={`${title} - ${currentIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              draggable={false}
            />
          </div>

          {/* فلش بعدی */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              className="absolute left-5 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              <ChevronLeft className="size-6" strokeWidth={2} />
            </button>
          )}

          {/* تصاویر کوچک پایین لایت‌باکس */}
          <div className="absolute bottom-5 flex gap-2 overflow-x-auto px-10" dir="ltr">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`shrink-0 size-12 overflow-hidden rounded-lg border-2 transition-all ${
                  i === currentIndex ? "border-white ring-2 ring-white/50" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
