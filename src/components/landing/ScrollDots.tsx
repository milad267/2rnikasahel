"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: "hero", label: "صفحه اصلی" },
  { id: "slider", label: "رویداد های ویژه" },
  { id: "trust", label: "اعتماد" },
  { id: "features", label: "ویژگی‌ها" },
  { id: "about", label: "درباره ما" },
];

export function ScrollDots() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isClicking = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);

  // ─── ردیابی بخش جاری با IntersectionObserver (دقیق و بی‌مکث) ───
  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClicking.current) return;

        // مرتب‌سازی بر اساس بیشترین نسبت دید
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const best = visible[0];
          const idx = sectionIds.indexOf(best.target.id);
          if (idx !== -1 && idx !== activeIndexRef.current) {
            activeIndexRef.current = idx;
            setActiveIndex(idx);
          }
        }
      },
      { threshold: [0.15, 0.3, 0.45, 0.6], rootMargin: "-80px 0px -25% 0px" },
    );

    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    elements.forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // ─── باز/بسته شدن ناوبری حین اسکرول ───
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        setIsScrolling(false);
      }, 2000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const handleDotClick = useCallback((sectionId: string, index: number) => {
    isClicking.current = true;
    setActiveIndex(index);
    activeIndexRef.current = index;
    setIsScrolling(true);
    const el = document.getElementById(sectionId);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setTimeout(() => { isClicking.current = false; }, 1000);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => { setIsScrolling(false); }, 2500);
  }, []);

  const isExpanded = isScrolling || isHovered;

  return (
    <nav
      className={`scroll-dots-nav ${isExpanded ? "scroll-dots-nav--expanded" : "scroll-dots-nav--collapsed"}`}
      aria-label="ناوبری بخش‌های صفحه"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="scroll-dots-track">
        {SECTIONS.map((section, i) => (
          <button
            key={section.id}
            type="button"
            className={`scroll-dot ${i === activeIndex ? "scroll-dot--active" : ""}`}
            onClick={() => handleDotClick(section.id, i)}
            aria-label={`برو به بخش ${section.label}`}
            aria-current={i === activeIndex ? "true" : undefined}
          >
            <span className="scroll-dot__core" />
            <span className="scroll-dot__pulse" />
            <span className="scroll-dot__label">{section.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
