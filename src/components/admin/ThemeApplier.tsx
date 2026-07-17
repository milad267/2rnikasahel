"use client";

import { useEffect, useState } from "react";

const PALETTE_COLORS: Record<string, string[]> = {
  // ─── کلاسیک ───
  "navy-petrol": ["#05101d","#134b5f","#1c6a7c","#f5f0eb","#0a1628"],
  "deep-ocean": ["#0a1628","#1a3a4a","#2d6a7a","#e8e4df","#0d1b2a"],
  "midnight-forest": ["#0d1b2a","#1b3a3a","#2a5a4a","#f0ebe4","#112233"],
  "slate-charcoal": ["#1a1a2e","#2d2d44","#4a4a6a","#e8e4df","#16213e"],
  "sand-stone": ["#2d2416","#5a4a3a","#8a7a5a","#f5f0e8","#3a2a1a"],
  "warm-umber": ["#1a0f0a","#3a2515","#6a4a2a","#ede4d8","#2a1a0d"],
  // ─── مدرن ───
  "obsidian": ["#000000","#1a1a1a","#333333","#f5f5f0","#0d0d0d"],
  "ivory-onyx": ["#1a1a2e","#3a3a5a","#e8dcc8","#faf6f0","#16213e"],
  "platinum": ["#1a1a2e","#4a4a6a","#c0c0c0","#f8f6f4","#2a2a4a"],
  "silver-mist": ["#2a2a3a","#4a4a5a","#8a8a9a","#f0eeec","#3a3a4a"],
  "pearl-white": ["#0d1b2a","#2a3a4a","#b8a898","#faf8f4","#1a2a3a"],
  "cloud-gray": ["#2a2a3a","#5a5a6a","#9a9aaa","#f0f0ec","#3a3a4a"],
  // ─── گرم ───
  "terracotta": ["#2a1a0a","#5a3a2a","#8a5a3a","#f5ede4","#3a2515"],
  "desert-sand": ["#3a2a1a","#6a5a3a","#a08a6a","#f8f0e4","#4a3a2a"],
  "cappuccino": ["#2a1a10","#4a3020","#7a5a3a","#f0e8dc","#3a2215"],
  "caramel": ["#1a1008","#3a2515","#7a5535","#f5ede0","#2a1a0d"],
  "cocoa": ["#1a0f0a","#3a2015","#5a3a2a","#ede4d8","#2a1a10"],
  "warm-stone": ["#1a1510","#3a2a20","#5a4a3a","#f0e8e0","#2a2018"],
  // ─── سرد ───
  "arctic": ["#0a1628","#1a3a5a","#5a8aaa","#f0f4f8","#122240"],
  "iceberg": ["#0a1a2a","#1a3a5a","#7ab0c8","#f0f6fa","#142840"],
  "denim": ["#0a1a2a","#1a3a6a","#4a7aaa","#f0f2f4","#122240"],
  "steel": ["#1a1a2a","#3a4a5a","#7a8a9a","#f0f0f0","#2a3a4a"],
  "cobalt": ["#0a0a1a","#1a2a5a","#3a5a8a","#f0f2f6","#101838"],
  "sapphire": ["#0a0a20","#1a2a6a","#3a5aaa","#f0f2f8","#101848"],
  // ─── طبیعی ───
  "driftwood": ["#2a2218","#4a3a2a","#7a6a5a","#f0eae0","#3a2e20"],
  "moss": ["#0a1a10","#1a3a2a","#3a5a4a","#f0f2ec","#14281e"],
  "olive": ["#1a1a10","#3a4a2a","#5a6a3a","#f0eee8","#28381e"],
  "taupe": ["#2a2218","#4a3a2a","#6a5a4a","#f0e8e0","#3a2e20"],
  "greige": ["#2a2a22","#4a4a3a","#6a6a5a","#f0eee8","#3a3a2e"],
  "warm-gray": ["#1a1815","#3a3530","#5a5550","#f0ece8","#2a2522"],
  // ─── تیره ───
  "dark-velvet": ["#0a0a12","#1a1028","#3a2850","#e8e4f0","#12102a"],
  "midnight-blue": ["#050510","#0a0a2a","#1a1a4a","#e8e8f2","#0a0a20"],
  "charcoal": ["#0d0d0d","#1a1a1a","#333333","#e8e8e8","#141414"],
  "raven": ["#080808","#151515","#2a2a2a","#e8e6e4","#101010"],
  "shadow": ["#0a0a0f","#1a1a22","#2a2a3a","#e8e6ec","#12121a"],
  "dark-ember": ["#100a08","#2a1a10","#4a2a1a","#e8e0dc","#1a1008"],
  // ─── لوکس ───
  "champagne": ["#1a1510","#3a3028","#8a7a6a","#f8f4ec","#2a2218"],
  "cream-silver": ["#1a1a22","#3a3a4a","#a8a8b8","#faf8f4","#2a2a3a"],
  "ivory-gold": ["#1a1510","#3a2a1a","#a08868","#f8f4ec","#2a1e12"],
  "alabaster": ["#1a1815","#3a3530","#9a9088","#faf8f6","#2a2522"],
  "porcelain": ["#1a1a20","#3a3a44","#b0b0ba","#faf9f6","#2a2a34"],
  // ─── خاص ───
  "burgundy": ["#1a0808","#3a1515","#5a2525","#f0e8e8","#221010"],
  "forest-deep": ["#0a1008","#1a2a18","#2a4a30","#e8ece6","#121e14"],
  "wine-cellar": ["#150a08","#2a1410","#4a2218","#e8e2e0","#1a0e0a"],
  "graphite": ["#0d0d12","#1c1c24","#35354a","#e8e8ec","#14141a"],
  "storm": ["#0d1218","#1c2830","#3a4a58","#e8ecee","#141e28"],
  "earth": ["#181008","#2a2018","#4a3a2a","#ece8e0","#201810"],
  "smoke": ["#14141a","#282838","#484860","#e8e8ec","#1c1c28"],
  "twilight": ["#0e0a16","#1e1430","#3a2850","#e8e4ee","#14102a"],
  "copper": ["#1a0f08","#3a2218","#6a3a28","#f0e8e0","#2a1810"],
  "bronze": ["#1a1208","#3a2818","#5a3a20","#f0e8dc","#2a1c10"],
  "polar-night": ["#080a0d","#121820","#202a3a","#e8eaec","#0e141c"],
  "ash": ["#151518","#2e2e32","#52525a","#ececee","#202024"],
  "moonlight": ["#0a0a14","#1a1a32","#4a4a6a","#f0eef4","#14142a"],
};

export function ThemeApplier({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState("navy-petrol");

  const fetchPalette = () => {
    fetch("/api/admin/palettes")
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.active) {
          setActive(d.active);
        } else {
          setActive("navy-petrol");
        }
      })
      .catch(() => setActive("navy-petrol"));
  };

  useEffect(() => {
    fetchPalette();

    // گوش دادن به تغییر پالت از طریق ایونت سفارشی
    const handlePaletteChange = (e: CustomEvent) => {
      if (e.detail?.slug) {
        setActive(e.detail.slug);
      } else {
        fetchPalette();
      }
    };

    window.addEventListener("palette-changed", handlePaletteChange as EventListener);
    return () => window.removeEventListener("palette-changed", handlePaletteChange as EventListener);
  }, []);

  const colors = PALETTE_COLORS[active] || PALETTE_COLORS["navy-petrol"];

  // تبدیل رنگ‌های پالت به variables Tailwind
  const shadeGen = (hex: string, factor = 0.15) => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    const lighten = (v: number) => Math.min(255, Math.round(v + (255 - v) * factor));
    const darken = (v: number) => Math.round(v * (1 - factor));
    return {
      light: `#${lighten(r).toString(16).padStart(2,'0')}${lighten(g).toString(16).padStart(2,'0')}${lighten(b).toString(16).padStart(2,'0')}`,
      dark: `#${darken(r).toString(16).padStart(2,'0')}${darken(g).toString(16).padStart(2,'0')}${darken(b).toString(16).padStart(2,'0')}`,
    };
  };

  useEffect(() => {
    const root = document.documentElement;
    const [p, s, a, bg, txt] = colors;
    // Primary (navy)
    root.style.setProperty("--color-navy-950", shadeGen(p, 0.02).dark);
    root.style.setProperty("--color-navy-900", p);
    root.style.setProperty("--color-navy-800", shadeGen(p, 0.08).light);
    root.style.setProperty("--color-navy-700", shadeGen(p, 0.15).light);
    root.style.setProperty("--color-navy-600", shadeGen(p, 0.25).light);
    root.style.setProperty("--color-navy-500", shadeGen(p, 0.35).light);
    // Secondary (petrol)
    root.style.setProperty("--color-petrol-900", shadeGen(s, 0.02).dark);
    root.style.setProperty("--color-petrol-800", shadeGen(s, 0.08).light);
    root.style.setProperty("--color-petrol-700", s);
    root.style.setProperty("--color-petrol-600", shadeGen(s, 0.15).light);
    root.style.setProperty("--color-petrol-500", shadeGen(s, 0.25).light);
    root.style.setProperty("--color-petrol-400", shadeGen(s, 0.35).light);
    root.style.setProperty("--color-petrol-300", shadeGen(s, 0.50).light);
    // Background (pearl)
    root.style.setProperty("--color-pearl-50", shadeGen(bg, 0.3).light);
    root.style.setProperty("--color-pearl-100", bg);
    root.style.setProperty("--color-pearl-200", shadeGen(bg, 0.08).dark);
    root.style.setProperty("--color-pearl-300", shadeGen(bg, 0.15).dark);
    // Text (charcoal based on text color)
    root.style.setProperty("--color-charcoal-500", txt);
    root.style.setProperty("--color-charcoal-400", shadeGen(txt, 0.2).light);
    root.style.setProperty("--color-charcoal-600", shadeGen(txt, 0.1).dark);
  }, [active, colors]);

  return <>{children}</>;
}