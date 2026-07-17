/**
 * 🧠 هوش مرکزی دستیاران — نسخه یکپارچه
 *
 * این سیستم:
 * ۱. بدون نیاز به API Key کار می‌کند (دانش‌نامه داخلی)
 * ۲. محصولات را از فایل‌های آپلودی تشخیص می‌دهد (product-intelligence)
 * ۳. تعاملات موفق را به خاطر می‌سپارد (یادگیری)
 * ۴. با کل سیستم دستیار (ادمین + عمومی) یکپارچه است
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { analyzeProductList, type SmartProduct } from "./product-intelligence";

// ─── دانش‌نامه داخلی (بدون نیاز به API) ───

interface KnowledgeEntry {
  keywords: string[];
  response: string;
  action?: string;
  actionData?: Record<string, any>;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // محصولات — ساخت
  { keywords: ["محصول جدید", "ایجاد محصول", "ساخت محصول", "اضافه کن محصول", "افزودن محصول"], response: "برای ایجاد محصول جدید، لطفاً اطلاعات زیر را بدهید:\n۱. نام محصول\n۲. قیمت (ریال)\n۳. دسته‌بندی\n۴. تنوع‌ها (در صورت وجود)\n\n📎 می‌توانید فایل Excel یا PDF لیست محصولات را هم آپلود کنید تا خودکار تشخیص دهم.\n\n🖼️ همچنین اگر نیاز به تصویر محصول دارید، می‌توانم از اینترنت جستجو کرده و با واترمارک سایت ذخیره کنم." },

  // تصویر محصول
  { keywords: ["تصویر", "عکس", "عکس محصول", "تصویر محصول", "عکس محصولات", "عکس اینترنتی", "عکس از نت"], response: "🖼️ می‌توانم تصویر واقعی محصولات را از اینترنت جستجو کنم.\n\nکافی است:\n۱. نام محصول را بگویید\n۲. برند را ذکر کنید\n\nسپس:\n• تصویر واقعی از اینترنت پیدا می‌شود\n• پس‌زمینه حذف می‌شود\n• واترمارک قبلی حذف می‌شود\n• واترمارک لوگوی سایت اضافه می‌شود\n• به محصول اختصاص داده می‌شود" },

  // تصویر بلاگ
  { keywords: ["تصویر بلاگ", "عکس مقاله", "عکس مطلب", "تصویر مطلب", "عکس پست"], response: "🎨 می‌توانم تصویر مرتبط با موضوع بلاگ را از اینترنت جستجو کنم.\n\nکافی است عنوان بلاگ را بگویید تا:\n• تصویر مرتبط پیدا شود\n• بهینه‌سازی شود\n• واترمارک لوگو اضافه شود\n• به پست بلاگ اختصاص داده شود" },

  // محصولات — لیست
  { keywords: ["محصول", "لیست محصول", "چند محصول", "نمایش محصول"], response: "برای مشاهده محصولات به صفحه مدیریت محصولات مراجعه کنید.", action: "goto_products" },

  // پردازش فایل و تشخیص محصول
  { keywords: ["فایل", "اکسل", "excel", "pdf", "آپلود", "لیست قیمت", "فاکتور"], response: "📎 فایل خود را (Excel, PDF, یا عکس) آپلود کنید. من:\n• محصولات را تشخیص می‌دهم\n• تنوع‌ها، برند، قیمت و کد هر محصول را استخراج می‌کنم\n• لیست کامل را نمایش می‌دهم\n• می‌توانم قیمت‌ها را مستقیماً در فروشگاه به‌روزرسانی کنم\n\n🖼️ اگر فایل تصویری (عکس فاکتور) است، از vision agent برای استخراج اطلاعات استفاده می‌شود." },

  // سفارشات
  { keywords: ["سفارش", "پیگیری", "وضعیت سفارش"], response: "برای پیگیری سفارش، شماره سفارش را وارد کنید." },

  // آپدیت قیمت از اکسل
  { keywords: ["آپدیت قیمت", "بروزرسانی قیمت", "قیمت از اکسل", "price update", "اکسل قیمت", "آپدیت از اکسل", "فایل اکسل قیمت", "قیمت فله"], response: "📊 **آپدیت قیمت از فایل اکسل** در دسترس است!\n\nبرای این کار:\n۱. به صفحه **مدیریت محصولات** بروید\n۲. روی دکمه **«آپدیت قیمت (اکسل)»** کلیک کنید\n۳. فایل اکسل خود را آپلود کنید (با ستون‌های CODE/SKU و PRICE/قیمت)\n۴. دکمه **«بررسی تطابق»** را بزنید تا پیش‌نمایش ببینید\n۵. سپس **«اعمال تغییرات»** را بزنید تا قیمت‌ها به‌روزرسانی شوند\n\n📌 همچنین می‌توانید درصد افزایش/کاهش کلی اعمال کنید." },

  // بلاگ + تصویر
  { keywords: ["بلاگ", "پست", "مقاله", "بنویس"], response: "برای نوشتن پست بلاگ، موضوع مقاله را بگویید تا برایتان بنویسم.\n\n💡 بعد از نوشتن بلاگ، می‌توانم به‌طور خودکار یک تصویر مرتبط از اینترنت پیدا کرده و به آن اختصاص دهم." },

  // اسلایدر
  { keywords: ["اسلاید", "اسلایدر", "بنر"], response: "برای ساخت اسلاید جدید، عنوان و متن اسلاید را بگویید." },

  // سئو
  { keywords: ["سئو", "seo", "بهینه‌سازی", "کلمه کلیدی", "متا"], response: "🔍 ابزارهای سئو در دسترس هستند:\n• تحقیق کلمات کلیدی\n• بهینه‌سازی متا تگ‌ها\n• تحلیل سئوی رقبا\n• امتیازدهی محتوا\n\nاز بخش هوش مصنوعی ادمین می‌توانید استفاده کنید." },

  // تحلیل رقبا
  { keywords: ["رقبا", "رقابت", "آنالیز رقبا", "بررسی بازار", "market"], response: "📊 ابزار تحلیل رقبا:\n• بررسی قیمت‌های رقبا\n• تحلیل کلمات کلیدی\n• استراتژی قیمت‌گذاری\n• پیشنهاد کمپین\n\nاز بخش هوش مصنوعی ادمین استفاده کنید." },

  // گزارش
  { keywords: ["گزارش", "فروش", "آمار", "چند تا"], response: "برای مشاهده آمار فروش به داشبورد مدیریت مراجعه کنید.\n\n📊 تحلیلگر داده فروش می‌تواند گزارش‌های دقیق فروش، محصولات پرفروش و کم‌فروش را ارائه دهد." },

  // مغز مرکزی
  { keywords: ["هوش مرکزی", "central brain", "مغز مرکزی", "دستیار هوشمند"], response: "🧠 مغز مرکزی سیستم هوش مصنوعی درنیکا ساحل شامل:\n• **مدیر محصول** — ایجاد و مدیریت محصولات با تنوع\n• **هوش تصویر** — جستجو و پردازش تصاویر محصول از اینترنت\n• **تصویر بلاگ** — جستجوی تصویر مرتبط با مطالب\n• **تولید محتوا** — نوشتن بلاگ و توضیحات\n• **تحلیلگر داده** — گزارش فروش و تحلیل\n• **بازاریاب** — تحلیل رقبا و کمپین\n• **متخصص سئو** — بهینه‌سازی کلمات کلیدی\n• **مدیر انبار** — کنترل موجودی\n\nهمه این agentها با هماهنگی مغز مرکزی کار می‌کنند." },

  // راهنما
  { keywords: ["راهنما", "help", "کمک", "چجوری"], response: "من می‌توانم در این موارد کمک کنم:\n• 📎 **آپلود و تحلیل فایل** (Excel, PDF, عکس) — تشخیص خودکار محصولات\n• 🛒 **ساخت محصول جدید** با تنوع\n• 🖼️ **جستجوی تصویر محصول** از اینترنت + واترمارک\n• ✍️ **نوشتن پست بلاگ** + تصویر مرتبط\n• 🖼️ **ساخت اسلاید و بنر**\n• 📊 **گزارش فروش** و تحلیل\n• 🔍 **تحلیل رقبا** و سئو\n• 📋 **تحلیل لیست قیمت** و بروزرسانی خودکار"},

  // سلام
  { keywords: ["سلام", "hi", "hello", "درود", "خوبی"], response: "سلام! 👋 به درنیکا ساحل خوش آمدید.\n\nچه کاری می‌توانم برایتان انجام دهم؟\n• 🛒 ایجاد محصول جدید\n• 🖼️ جستجوی تصویر از اینترنت\n• ✍️ نوشتن بلاگ\n• 📊 تحلیل داده و گزارش\n• 📎 آپلود فایل برای تشخیص خودکار محصولات" },

  // تماس
  { keywords: ["تماس", "شماره", "تلفن", "آدرس"], response: "اطلاعات تماس تأییدشده‌ای در تنظیمات سایت پیدا نشد. لطفاً از صفحه تماس با ما استفاده کنید." },

  // وقت
  { keywords: ["ساعت", "وقت", "کی", "زمان"], response: "ساعات پاسخگویی: ۸ صبح تا ۱۸ عصر" },

  // قیمت
  { keywords: ["قیمت", "چنده", "چقدر"], response: "برای مشاهده قیمت محصولات به فروشگاه مراجعه کنید." },

  // ثبت‌نام
  { keywords: ["ثبت‌نام", "عضویت", "اکانت", "حساب"], response: "برای ثبت‌نام روی دکمه ورود/عضویت در بالای صفحه کلیک کنید." },

  // تصویر هوشمند
  { keywords: ["image intelligence", "هوش تصویر", "عکس از گوگل", "عکس از نت"], response: "🔍 **هوش تصویر** می‌تواند:\n• تصویر واقعی محصول را از اینترنت (Google, DuckDuckGo) جستجو کند\n• پس‌زمینه را حذف کند\n• واترمارک‌های قبلی را حذف کند\n• واترمارک لوگوی درنیکا ساحل را اضافه کند\n• به محصول اختصاص دهد\n\nکافی است نام محصول را بگویید!" },
];

// ─── حافظه تعاملات ───

interface MemoryEntry {
  input: string;
  response: string;
  success: boolean;
  timestamp: number;
}

const shortTermMemory: MemoryEntry[] = [];

// ─── توابع اصلی ───

/**
 * پردازش پیام کاربر و برگرداندن پاسخ
 * بدون نیاز به API Key کار می‌کند
 * حالا product-intelligence رو هم صدا میزنه
 */
export async function processMessage(
  message: string,
  userId?: number,
  rawContext = "{}",
  fileProducts?: SmartProduct[],
): Promise<{ response: string; action?: string; products?: SmartProduct[] }> {
  const lower = message.toLowerCase().trim();

  // ۰. اگر محصولات از فایل استخراج شدن، نمایش بده
  if (fileProducts && fileProducts.length > 0) {
    return formatProductListResponse(fileProducts, message);
  }

  // ۰.۵ تحلیل متن برای محصولات (اگر کاربر متنی شامل لیست محصول فرستاده)
  if (message.length > 50) {
    const detected = analyzeProductList(message);
    if (detected.length >= 2) {
      return formatProductListResponse(detected, message);
    }
  }

  try {
    const context = JSON.parse(rawContext) as {
      products?: Array<{ title: string; slug: string; minPrice: string; stock: number }>;
      contact?: Record<string, unknown>;
    };
    if (context.products?.length) {
      const lines = context.products.slice(0, 5).map((product) => {
        const price = Number(product.minPrice || 0).toLocaleString("fa-IR");
        const availability = Number(product.stock) > 0 ? `${Number(product.stock).toLocaleString("fa-IR")} عدد موجود` : "برای موجودی استعلام بگیرید";
        return `• ${product.title} — ${price} ریال — ${availability} — /shop/${product.slug}`;
      });
      return { response: `محصولات مرتبط موجود در فروشگاه:\n${lines.join("\n")}` };
    }

    if (["تماس", "شماره", "تلفن", "آدرس", "ایمیل"].some((term) => lower.includes(term))) {
      const values = Object.entries(context.contact || {}).filter(([, value]) => String(value || "").trim());
      if (values.length) return { response: values.map(([key, value]) => `${key}: ${String(value)}`).join("\n") };
    }
  } catch { /* context is optional */ }

  // ۱. جستجو در حافظه طولانی مدت (دیتابیس)
  const longTerm = await searchLongTermMemory(lower);
  if (longTerm) {
    recordMemory(lower, longTerm.response, true, userId);
    return { response: longTerm.response, action: longTerm.action };
  }

  // ۲. جستجو در دانش‌نامه داخلی
  const match = findBestMatch(lower);
  if (match) {
    recordMemory(lower, match.response, true, userId);
    return { response: match.response, action: match.action };
  }

  // ۳. جستجو در حافظه کوتاه مدت
  const shortTerm = findShortTermMatch(lower);
  if (shortTerm) {
    return { response: shortTerm.response };
  }

  // ۴. پیش‌فرض هوشمند — بررسی کلمات کلیدی اضافی
  // اگر کاربر درباره تصویر یا عکس پرسیده
  if (lower.includes("عکس") || lower.includes("تصویر") || lower.includes("عکس از اینترنت") || lower.includes("عکس محصول")) {
    const imgResponse = "🖼️ می‌توانم تصویر محصول را از اینترنت جستجو کنم. لطفاً نام محصول را بگویید تا:\n• تصویر واقعی از اینترنت پیدا کنم\n• پس‌زمینه را حذف کنم\n• واترمارک لوگوی سایت را اضافه کنم";
    recordMemory(lower, imgResponse, true, userId);
    return { response: imgResponse };
  }

  // اگر کاربر درباره بلاگ + تصویر پرسیده
  if ((lower.includes("بلاگ") || lower.includes("مقاله") || lower.includes("مطلب")) && (lower.includes("عکس") || lower.includes("تصویر"))) {
    const blogImgResponse = "🎨 هم می‌توانم بلاگ بنویسم و هم تصویر مرتبط پیدا کنم!\n\nکافی است موضوع بلاگ را بگویید تا:\n۱. محتوای سئو شده بنویسم\n۲. تصویر مرتبط از اینترنت پیدا کنم\n۳. واترمارک اضافه کنم\n۴. به پست بلاگ اختصاص دهم";
    recordMemory(lower, blogImgResponse, true, userId);
    return { response: blogImgResponse };
  }

  // اگر کاربر درباره تحلیل رقبا پرسیده
  if (lower.includes("رقبا") || lower.includes("رقابت") || lower.includes("market") || lower.includes("بازار")) {
    const marketResponse = "📊 ابزار تحلیل بازار و رقبا در دسترس است:\n• بررسی قیمت‌ها و محصولات رقبا\n• تحلیل کلمات کلیدی\n• پیشنهاد استراتژی قیمت‌گذاری\n• ایده‌های کمپین تبلیغاتی\n\nاز بخش هوش مصنوعی ادمین استفاده کنید.";
    recordMemory(lower, marketResponse, true, userId);
    return { response: marketResponse };
  }

  // ۵. پیش‌فرض نهایی
  const fallback = "سوال شما را متوجه نشدم. لطفاً واضح‌تر بپرسید یا از گزینه /help استفاده کنید.\n\n📎 می‌توانید فایل محصولات (Excel, PDF, عکس) را آپلود کنید تا خودکار تحلیل کنم.\n\n💡 توانایی‌های من:\n• 🛒 ایجاد محصول با تنوع\n• 🖼️ جستجوی تصویر از اینترنت\n• ✍️ نوشتن بلاگ + تصویر مرتبط\n• 📊 تحلیل داده و گزارش\n• 🔍 تحلیل رقبا و سئو";
  recordMemory(lower, fallback, false, userId);
  return { response: fallback };
}

/**
 * فرمت‌بندی پاسخ برای لیست محصولات استخراج‌شده
 */
function formatProductListResponse(products: SmartProduct[], originalMessage: string): { response: string; products: SmartProduct[] } {
  let response = `🔍 **${products.length} محصول** از فایل/متن شما تشخیص دادم:\n\n`;

  for (let i = 0; i < Math.min(products.length, 15); i++) {
    const p = products[i];
    const priceStr = p.price ? ` — ${Number(p.price).toLocaleString("fa-IR")} ریال` : "";
    const brandStr = p.brand ? ` | 🏷 ${p.brand}` : "";
    const skuStr = p.sku ? ` | 🔢 ${p.sku}` : "";

    response += `**${i + 1}. ${p.title}**${priceStr}${brandStr}${skuStr}\n`;

    if (p.variants.length > 0) {
      response += `   ↳ ${p.variants.length} تنوع:\n`;
      for (const v of p.variants.slice(0, 5)) {
        const vPrice = Number(v.price || 0).toLocaleString("fa-IR");
        response += `     • ${v.name} — ${vPrice} ریال | SKU: ${v.sku}\n`;
      }
      if (p.variants.length > 5) response += `     ... و ${p.variants.length - 5} تنوع دیگر\n`;
    }
    response += "\n";
  }

  if (products.length > 15) {
    response += `... و ${products.length - 15} محصول دیگر\n\n`;
  }

  response += "---\n💡 **اقدامات قابل انجام:**\n";
  response += "• برای **ایجاد این محصولات در فروشگاه** بگویید: «این محصولات را ایجاد کن»\n";
  response += "• برای **بروزرسانی قیمت‌ها** بگویید: «قیمت‌ها را بروزرسانی کن»\n";
  response += "• برای **جستجوی تصویر از اینترنت** بگویید: «برای هر محصول عکس پیدا کن»\n";
  response += "• برای **ذخیره به عنوان پیش‌نویس** بگویید: «ذخیره کن»\n";

  return { response, products };
}

/**
 * یافتن بهترین تطابق در دانش‌نامه
 */
function findBestMatch(input: string): KnowledgeEntry | null {
  let bestEntry: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (input.includes(keyword)) score += 2;
      if (keyword.length > 2) {
        const parts = keyword.split("");
        for (let i = 0; i < parts.length - 1; i++) {
          if (input.includes(parts.slice(i, i + 2).join(""))) score += 0.5;
        }
      }
    }
    const totalKeywordLen = entry.keywords.join("").length;
    if (score > 0 && input.length > totalKeywordLen * 0.7) {
      score -= 0.3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore >= 2 ? bestEntry : null;
}

/**
 * جستجو در حافظه کوتاه مدت
 */
function findShortTermMatch(input: string): MemoryEntry | null {
  const now = Date.now();
  const recent = shortTermMemory.filter(m => now - m.timestamp < 10 * 60 * 1000);

  for (const mem of recent) {
    if (mem.success && input.includes(mem.input.slice(0, 10))) {
      return mem;
    }
  }
  return null;
}

/**
 * جستجو در حافظه طولانی مدت (دیتابیس)
 */
async function searchLongTermMemory(input: string): Promise<KnowledgeEntry | null> {
  try {
    const [saved] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, "assistant_memory"), eq(siteSettings.group, "ai")))
      .limit(1);

    if (saved?.value) {
      const memories: KnowledgeEntry[] = JSON.parse(saved.value as string || "[]");
      const match = memories.find(m => m.keywords.some(k => input.includes(k)));
      return match || null;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * ذخیره تعامل در حافظه کوتاه مدت
 */
function recordMemory(input: string, response: string, success: boolean, userId?: number) {
  shortTermMemory.unshift({ input, response, success, timestamp: Date.now() });
  if (shortTermMemory.length > 100) shortTermMemory.pop();
}

/**
 * ذخیره دانش جدید در حافظه طولانی مدت (یادگیری)
 */
export async function learnNew(input: string, response: string, keywords?: string[]) {
  try {
    const [existing] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, "assistant_memory"), eq(siteSettings.group, "ai")))
      .limit(1);

    const memories: KnowledgeEntry[] = existing?.value ? JSON.parse(existing.value as string) : [];

    const newEntry: KnowledgeEntry = {
      keywords: keywords || extractKeywords(input),
      response,
    };

    // جلوگیری از تکراری
    const isDuplicate = memories.some(m =>
      m.response === response &&
      m.keywords.some(k => newEntry.keywords.includes(k))
    );
    if (isDuplicate) return;

    memories.unshift(newEntry);
    if (memories.length > 200) memories.pop();

    await db.insert(siteSettings)
      .values({ key: "assistant_memory", value: JSON.stringify(memories), group: "ai", locale: "fa" })
      .onConflictDoUpdate({ target: [siteSettings.key, siteSettings.locale], set: { value: JSON.stringify(memories) } });
  } catch { /* ignore */ }
}

/**
 * استخراج کلمات کلیدی از متن
 */
function extractKeywords(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 5);
}

/**
 * ارزیابی پاسخ — برای یادگیری تقویتی
 * از UI صدا زده میشه (دکمه 👍/👎)
 */
export function rateResponse(input: string, response: string, rating: "good" | "bad" | "neutral") {
  const entry = shortTermMemory.find(m => m.input === input && m.response === response);
  if (entry) entry.success = rating === "good";
  if (rating === "good") void learnNew(input.slice(0, 500), response.slice(0, 2_000));
}

/**
 * تحلیل فایل و استخراج محصولات
 * از assistant/file route صدا زده میشه
 */
export function analyzeFileContent(text: string): SmartProduct[] {
  try {
    return analyzeProductList(text);
  } catch {
    return [];
  }
}
