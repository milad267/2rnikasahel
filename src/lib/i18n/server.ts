import { type Locale } from "./config";
import { getDictionary } from "./dictionaries";
import { applyLandingOverrides } from "./overrides";

/**
 * دریافت locale فعلی (همیشه فارسی — بدون پشتیبانی از زبان دوم)
 */
export async function getLocale(): Promise<Locale> {
  return "fa";
}

/**
 * دریافت دیکشنری و locale برای Server Components
 */
export async function getI18n() {
  const locale: Locale = "fa";
  const t = await applyLandingOverrides(getDictionary(locale));
  return { locale, t };
}
