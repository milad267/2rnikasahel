import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const settingsCache = new Map<string, any>();

/**
 * یک تنظیم خاص را از دیتابیس دریافت می‌کند (با کش)
 */
export async function getSetting<T = any>(key: string, group: string = "general"): Promise<T | null> {
  const cacheKey = `${group}:${key}`;
  if (settingsCache.has(cacheKey)) return settingsCache.get(cacheKey);

  const [setting] = await db.select({ value: siteSettings.value }).from(siteSettings)
    .where(and(eq(siteSettings.key, key), eq(siteSettings.group, group)));
  if (!setting) return null;

  settingsCache.set(cacheKey, setting.value);
  return setting.value as T;
}

/**
 * گرفتن چندین تنظیم به صورت یکجا (فقط ۱ کوئری دیتابیس)
 * مثال: const { host, port } = await getSettings("email", ["smtp.host", "smtp.port"]);
 */
export async function getSettings<T = Record<string, any>>(group: string, keys: string[]): Promise<T> {
  const result: Record<string, any> = {};
  const uncached: string[] = [];

  for (const key of keys) {
    const cacheKey = `${group}:${key}`;
    if (settingsCache.has(cacheKey)) {
      result[key] = settingsCache.get(cacheKey);
    } else {
      uncached.push(key);
    }
  }

  if (uncached.length > 0) {
    const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.group, group), inArray(siteSettings.key, uncached.map(k => k))));
    
    for (const row of rows) {
      const cacheKey = `${group}:${row.key}`;
      settingsCache.set(cacheKey, row.value);
      result[row.key] = row.value;
    }
    // کلیدهایی که در دیتابیس نبودند را null ثبت کن
    for (const key of uncached) {
      const cacheKey = `${group}:${key}`;
      if (!settingsCache.has(cacheKey)) {
        settingsCache.set(cacheKey, null);
        if (!(key in result)) result[key] = null;
      }
    }
  }

  return result as T;
}

/**
 * پیش‌بارگذاری همه تنظیمات در کش (در startup صدا زده شود)
 */
export async function preloadSettings(): Promise<void> {
  const rows = await db.select().from(siteSettings);
  for (const row of rows) {
    settingsCache.set(`${row.group}:${row.key}`, row.value);
  }
}

/**
 * کش تنظیمات را پاک می‌کند
 */
export function clearSettingsCache(key?: string, group: string = "general") {
  if (key) {
    settingsCache.delete(`${group}:${key}`);
  } else {
    settingsCache.clear();
  }
}
