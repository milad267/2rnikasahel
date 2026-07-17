/**
 * ابزارهای مشترک سئو (SEO)
 * آدرس پایه‌ی سایت از متغیر محیطی NEXT_PUBLIC_SITE_URL خوانده می‌شود؛
 * در غیر این صورت مقدار پیش‌فرض استفاده می‌شود.
 */

export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://dornikasahel.com"
).replace(/\/$/, "");

export const SITE_NAME = "درنیکا ساحل";

// تصویر پیش‌فرض اشتراک‌گذاری (Open Graph). از لوگوی موجود استفاده می‌شود.
export const DEFAULT_OG_IMAGE = "/logo/logo.svg";


/** ساخت یک URL کامل و مطلق از یک مسیر نسبی یا مطلق */
export function absoluteUrl(path?: string | null): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** کوتاه‌سازی متن برای توضیحات متا (description) */
export function truncate(text: string | null | undefined, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

/** حذف تگ‌های HTML از متن (برای description از محتوای بلاگ) */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
