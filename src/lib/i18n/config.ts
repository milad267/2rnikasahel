export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fa";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};

export const localeLabel: Record<Locale, string> = {
  fa: "فارسی",
  en: "English",
};

export const LOCALE_COOKIE = "dornika_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
