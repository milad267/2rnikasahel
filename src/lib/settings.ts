import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const settingsCache = new Map<string, any>();

/**
 * یک تنظیم خاص را از دیتابیس دریافت می‌کند (با کش)
 * @param key کلید تنظیم، مثلاً 'email.smtp.host'
 * @param group گروه تنظیم، مثلاً 'general'
 */
export async function getSetting<T = any>(key: string, group: string = "general"): Promise<T | null> {
  const cacheKey = `${group}:${key}`;
  if (settingsCache.has(cacheKey)) return settingsCache.get(cacheKey);

  const [setting] = await db.select({ value: siteSettings.value }).from(siteSettings).where(and(eq(siteSettings.key, key), eq(siteSettings.group, group)));
  if (!setting) return null;

  settingsCache.set(cacheKey, setting.value);
  return setting.value as T;
}