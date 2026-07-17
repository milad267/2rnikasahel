/**
 * تنظیمات زبان — فقط فارسی (بدون پشتیبانی از زبان دوم)
 * تمام بخش‌های سایت فقط به زبان فارسی و راست‌چین ارائه می‌شوند.
 */
export const locales = ["fa"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fa";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  fa: "rtl",
};

export const LOCALE_COOKIE = "dornika_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fa";
}
