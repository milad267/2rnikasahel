/** ۵۰+ پالت رنگی لوکس و لاکچری صنعتی */
export interface ColorPalette {
  slug: string;
  name: string;
  colors: string[]; // [primary, secondary, accent, bg, text]
}

export const PALETTES: ColorPalette[] = [
  // ─── پالت‌های کلاسیک صنعتی ───
  { slug: "navy-petrol", name: "سرمه‌ای و نفتی", colors: ["#05101d", "#134b5f", "#1c6a7c", "#f5f0eb", "#0a1628"] },
  { slug: "deep-ocean", name: "اقیانوس عمیق", colors: ["#0a1628", "#1a3a4a", "#2d6a7a", "#e8e4df", "#0d1b2a"] },
  { slug: "midnight-forest", name: "جنگل نیمه‌شب", colors: ["#0d1b2a", "#1b3a3a", "#2a5a4a", "#f0ebe4", "#112233"] },
  { slug: "slate-charcoal", name: "تخته‌سنگی", colors: ["#1a1a2e", "#2d2d44", "#4a4a6a", "#e8e4df", "#16213e"] },
  { slug: "sand-stone", name: "ماسه و سنگ", colors: ["#2d2416", "#5a4a3a", "#8a7a5a", "#f5f0e8", "#3a2a1a"] },
  { slug: "warm-umber", name: "تمبر گرم", colors: ["#1a0f0a", "#3a2515", "#6a4a2a", "#ede4d8", "#2a1a0d"] },
  // ─── پالت‌های مدرن مینیمال ───
  { slug: "obsidian", name: "ابسیدین", colors: ["#000000", "#1a1a1a", "#333333", "#f5f5f0", "#0d0d0d"] },
  { slug: "ivory-onyx", name: "عاج و عقیق", colors: ["#1a1a2e", "#3a3a5a", "#e8dcc8", "#faf6f0", "#16213e"] },
  { slug: "platinum", name: "پلاتین", colors: ["#1a1a2e", "#4a4a6a", "#c0c0c0", "#f8f6f4", "#2a2a4a"] },
  { slug: "silver-mist", name: "نقره‌ای مه‌آلود", colors: ["#2a2a3a", "#4a4a5a", "#8a8a9a", "#f0eeec", "#3a3a4a"] },
  { slug: "pearl-white", name: "مرواریدی", colors: ["#0d1b2a", "#2a3a4a", "#b8a898", "#faf8f4", "#1a2a3a"] },
  { slug: "cloud-gray", name: "خاکستری ابری", colors: ["#2a2a3a", "#5a5a6a", "#9a9aaa", "#f0f0ec", "#3a3a4a"] },
  // ─── پالت‌های گرم و صمیمی ───
  { slug: "terracotta", name: "سفال", colors: ["#2a1a0a", "#5a3a2a", "#8a5a3a", "#f5ede4", "#3a2515"] },
  { slug: "desert-sand", name: "شن‌های کویر", colors: ["#3a2a1a", "#6a5a3a", "#a08a6a", "#f8f0e4", "#4a3a2a"] },
  { slug: "cappuccino", name: "کاپوچینو", colors: ["#2a1a10", "#4a3020", "#7a5a3a", "#f0e8dc", "#3a2215"] },
  { slug: "caramel", name: "کارامل", colors: ["#1a1008", "#3a2515", "#7a5535", "#f5ede0", "#2a1a0d"] },
  { slug: "cocoa", name: "کاکائو", colors: ["#1a0f0a", "#3a2015", "#5a3a2a", "#ede4d8", "#2a1a10"] },
  { slug: "warm-stone", name: "سنگ گرم", colors: ["#1a1510", "#3a2a20", "#5a4a3a", "#f0e8e0", "#2a2018"] },
  // ─── پالت‌های سرد و مدرن ───
  { slug: "arctic", name: "قطبی", colors: ["#0a1628", "#1a3a5a", "#5a8aaa", "#f0f4f8", "#122240"] },
  { slug: "iceberg", name: "کوه یخ", colors: ["#0a1a2a", "#1a3a5a", "#7ab0c8", "#f0f6fa", "#142840"] },
  { slug: "denim", name: "جین", colors: ["#0a1a2a", "#1a3a6a", "#4a7aaa", "#f0f2f4", "#122240"] },
  { slug: "steel", name: "فولاد", colors: ["#1a1a2a", "#3a4a5a", "#7a8a9a", "#f0f0f0", "#2a3a4a"] },
  { slug: "cobalt", name: "کبالت", colors: ["#0a0a1a", "#1a2a5a", "#3a5a8a", "#f0f2f6", "#101838"] },
  { slug: "sapphire", name: "یاقوت کبود", colors: ["#0a0a20", "#1a2a6a", "#3a5aaa", "#f0f2f8", "#101848"] },
  // ─── پالت‌های خنثی و طبیعی ───
  { slug: "driftwood", name: "چوب ساحلی", colors: ["#2a2218", "#4a3a2a", "#7a6a5a", "#f0eae0", "#3a2e20"] },
  { slug: "moss", name: "خزه", colors: ["#0a1a10", "#1a3a2a", "#3a5a4a", "#f0f2ec", "#14281e"] },
  { slug: "olive", name: "زیتونی", colors: ["#1a1a10", "#3a4a2a", "#5a6a3a", "#f0eee8", "#28381e"] },
  { slug: "taupe", name: "تاوپه", colors: ["#2a2218", "#4a3a2a", "#6a5a4a", "#f0e8e0", "#3a2e20"] },
  { slug: "greige", name: "گریژ", colors: ["#2a2a22", "#4a4a3a", "#6a6a5a", "#f0eee8", "#3a3a2e"] },
  { slug: "warm-gray", name: "خاکستری گرم", colors: ["#1a1815", "#3a3530", "#5a5550", "#f0ece8", "#2a2522"] },
  // ─── پالت‌های تیره و دراماتیک ───
  { slug: "dark-velvet", name: "مخمل تیره", colors: ["#0a0a12", "#1a1028", "#3a2850", "#e8e4f0", "#12102a"] },
  { slug: "midnight-blue", name: "آبی نیمه‌شب", colors: ["#050510", "#0a0a2a", "#1a1a4a", "#e8e8f2", "#0a0a20"] },
  { slug: "charcoal", name: "زغالی", colors: ["#0d0d0d", "#1a1a1a", "#333333", "#e8e8e8", "#141414"] },
  { slug: "raven", name: "کلاغ", colors: ["#080808", "#151515", "#2a2a2a", "#e8e6e4", "#101010"] },
  { slug: "shadow", name: "سایه", colors: ["#0a0a0f", "#1a1a22", "#2a2a3a", "#e8e6ec", "#12121a"] },
  { slug: "dark-ember", name: "اخگر تیره", colors: ["#100a08", "#2a1a10", "#4a2a1a", "#e8e0dc", "#1a1008"] },
  // ─── پالت‌های روشن و لوکس ───
  { slug: "champagne", name: "شامپاین", colors: ["#1a1510", "#3a3028", "#8a7a6a", "#f8f4ec", "#2a2218"] },
  { slug: "cream-silver", name: "خامه و نقره", colors: ["#1a1a22", "#3a3a4a", "#a8a8b8", "#faf8f4", "#2a2a3a"] },
  { slug: "ivory-gold", name: "عاج و طلا", colors: ["#1a1510", "#3a2a1a", "#a08868", "#f8f4ec", "#2a1e12"] },
  { slug: "alabaster", name: "مرمر", colors: ["#1a1815", "#3a3530", "#9a9088", "#faf8f6", "#2a2522"] },
  { slug: "porcelain", name: "چینی", colors: ["#1a1a20", "#3a3a44", "#b0b0ba", "#faf9f6", "#2a2a34"] },
  // ─── پالت‌های خاص ───
  { slug: "burgundy", name: "بورگاندی", colors: ["#1a0808", "#3a1515", "#5a2525", "#f0e8e8", "#221010"] },
  { slug: "forest-deep", name: "جنگل عمیق", colors: ["#0a1008", "#1a2a18", "#2a4a30", "#e8ece6", "#121e14"] },
  { slug: "wine-cellar", name: "انبار شراب", colors: ["#150a08", "#2a1410", "#4a2218", "#e8e2e0", "#1a0e0a"] },
  { slug: "graphite", name: "گرافیت", colors: ["#0d0d12", "#1c1c24", "#35354a", "#e8e8ec", "#14141a"] },
  { slug: "storm", name: "طوفان", colors: ["#0d1218", "#1c2830", "#3a4a58", "#e8ecee", "#141e28"] },
  { slug: "earth", name: "زمین", colors: ["#181008", "#2a2018", "#4a3a2a", "#ece8e0", "#201810"] },
  { slug: "smoke", name: "دود", colors: ["#14141a", "#282838", "#484860", "#e8e8ec", "#1c1c28"] },
  { slug: "twilight", name: "گرگ و میش", colors: ["#0e0a16", "#1e1430", "#3a2850", "#e8e4ee", "#14102a"] },
  { slug: "copper", name: "مسی", colors: ["#1a0f08", "#3a2218", "#6a3a28", "#f0e8e0", "#2a1810"] },
  { slug: "bronze", name: "برنز", colors: ["#1a1208", "#3a2818", "#5a3a20", "#f0e8dc", "#2a1c10"] },
  // ─── اضافی ───
  { slug: "polar-night", name: "شب قطبی", colors: ["#080a0d", "#121820", "#202a3a", "#e8eaec", "#0e141c"] },
  { slug: "ash", name: "خاکستر", colors: ["#151518", "#2e2e32", "#52525a", "#ececee", "#202024"] },
  { slug: "moonlight", name: "مهتاب", colors: ["#0a0a14", "#1a1a32", "#4a4a6a", "#f0eef4", "#14142a"] },
];
