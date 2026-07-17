/**
 * ذخیره‌سازی OTP با Rate Limiting + persistence در دیتابیس
 *
 * - دارای persistence روی siteSettings برای ماندگاری در ری‌استارت سرور
 * - کش درون حافظه‌ای برای سرعت بالا
 * - هر شماره/ایمیل: حداکثر ۳ درخواست در ۵ دقیقه
 * - هر IP: حداکثر ۵ درخواست در ۵ دقیقه
 * - کدها ۵ دقیقه اعتبار دارند
 * - حداکثر ۳ تلاش ناموفق برای هر کد
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  requestCount: number;
  firstRequestAt: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const otpMap = new Map<string, OtpEntry>();
const ipRateMap = new Map<string, RateLimitEntry>();

const OTP_TTL = 5 * 60 * 1000; // ۵ دقیقه
const MAX_ATTEMPTS = 3;
const MAX_REQUESTS_PER_TARGET = 3; // حداکثر ۳ کد در ۵ دقیقه
const RATE_WINDOW = 5 * 60 * 1000; // پنجره ۵ دقیقه‌ای
const MAX_IP_REQUESTS = 5; // حداکثر ۵ درخواست از هر IP

const OTP_SETTINGS_GROUP = "_otp";

function normalizeTarget(target: string): string {
  return target.trim().toLowerCase();
}

/** بارگذاری OTP‌های معتبر از دیتابیس به حافظه */
async function loadOtpsFromDb(): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(
        and(eq(siteSettings.group, OTP_SETTINGS_GROUP), eq(siteSettings.locale, "")),
      );
    const now = Date.now();
    for (const row of rows) {
      const entry = row.value as OtpEntry | null;
      if (entry && entry.expiresAt > now) {
        const target = row.key.replace(/^otp:/, "");
        otpMap.set(target, entry);
      } else {
        // پاک کردن OTPهای منقضی از دیتابیس
        await db
          .delete(siteSettings)
          .where(eq(siteSettings.id, row.id))
          .catch(() => {});
      }
    }
  } catch {
    // دیتابیس در دسترس نیست — ادامه با حافظه
  }
}

// بارگذاری اولیه OTPها از دیتابیس
loadOtpsFromDb();

/** ذخیره کد جدید */
export async function storeOtp(target: string, code: string): Promise<void> {
  const key = normalizeTarget(target);
  const entry = otpMap.get(key);

  if (entry) {
    // بررسی محدودیت تعداد درخواست
    if (entry.requestCount >= MAX_REQUESTS_PER_TARGET) {
      // اگر پنجره ریت‌لیمیت هنوز فعال است
      if (Date.now() - entry.firstRequestAt < RATE_WINDOW) {
        throw new RateLimitError(
          "تعداد درخواست‌های مجاز تمام شده. لطفاً ۵ دقیقه دیگر تلاش کنید.",
        );
      }
      // ریست کردن شمارنده
      entry.requestCount = 0;
      entry.firstRequestAt = Date.now();
    }
    entry.code = code;
    entry.expiresAt = Date.now() + OTP_TTL;
    entry.attempts = 0;
    entry.requestCount++;
  } else {
    otpMap.set(key, {
      code,
      expiresAt: Date.now() + OTP_TTL,
      attempts: 0,
      requestCount: 1,
      firstRequestAt: Date.now(),
    });
  }

  // ذخیره در دیتابیس برای ماندگاری در ری‌استارت سرور
  try {
    await db
      .insert(siteSettings)
      .values({
        key: `otp:${key}`,
        group: OTP_SETTINGS_GROUP,
        locale: "",
        value: otpMap.get(key)!,
      })
      .onConflictDoUpdate({
        target: [siteSettings.key, siteSettings.locale],
        set: { value: otpMap.get(key)! },
      });
  } catch {
    // دیتابیس در دسترس نیست — OTP فقط در حافظه باقی می‌ماند
  }
}

/** بررسی و مصرف کد */
export async function verifyOtp(target: string, code: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const key = normalizeTarget(target);
  let entry = otpMap.get(key);

  // اگر در حافظه نبود، از دیتابیس بخوان
  if (!entry) {
    try {
      const [row] = await db
        .select()
        .from(siteSettings)
        .where(
          and(
            eq(siteSettings.key, `otp:${key}`),
            eq(siteSettings.group, OTP_SETTINGS_GROUP),
            eq(siteSettings.locale, ""),
          ),
        )
        .limit(1);
      if (row) {
        entry = row.value as OtpEntry;
        if (entry && entry.expiresAt > Date.now()) {
          otpMap.set(key, entry);
        } else {
          entry = undefined;
        }
      }
    } catch {
      // دیتابیس در دسترس نیست
    }
  }

  if (!entry) {
    return { valid: false, error: "کد تایید منقضی شده یا یافت نشد. دوباره درخواست کنید." };
  }

  if (entry.expiresAt < Date.now()) {
    otpMap.delete(key);
    await deleteOtpFromDb(key);
    return { valid: false, error: "کد تایید منقضی شده است. دوباره درخواست کنید." };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpMap.delete(key);
    await deleteOtpFromDb(key);
    return { valid: false, error: "تعداد تلاش‌های مجاز تمام شده. دوباره درخواست کنید." };
  }

  entry.attempts++;

  if (entry.code !== code) {
    // به‌روزرسانی تعداد تلاش در دیتابیس
    await syncOtpToDb(key, entry);
    return { valid: false, error: `کد تایید اشتباه است. ${MAX_ATTEMPTS - entry.attempts} تلاش باقی مانده.` };
  }

  // مصرف موفق — کد پاک می‌شود
  otpMap.delete(key);
  await deleteOtpFromDb(key);
  return { valid: true };
}

/** همگام‌سازی یک OTP به دیتابیس */
async function syncOtpToDb(key: string, entry: OtpEntry): Promise<void> {
  try {
    await db
      .update(siteSettings)
      .set({ value: entry })
      .where(
        and(
          eq(siteSettings.key, `otp:${key}`),
          eq(siteSettings.group, OTP_SETTINGS_GROUP),
          eq(siteSettings.locale, ""),
        ),
      );
  } catch {
    // ignore
  }
}

/** حذف OTP از دیتابیس */
async function deleteOtpFromDb(key: string): Promise<void> {
  try {
    await db
      .delete(siteSettings)
      .where(
        and(
          eq(siteSettings.key, `otp:${key}`),
          eq(siteSettings.group, OTP_SETTINGS_GROUP),
          eq(siteSettings.locale, ""),
        ),
      );
  } catch {
    // ignore
  }
}

/** بررسی محدودیت IP */
export function checkIpRateLimit(ip: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const entry = ipRateMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW) {
    ipRateMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_IP_REQUESTS) {
    return {
      allowed: false,
      error: "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.",
    };
  }

  entry.count++;
  return { allowed: true };
}

/** آیا این target اخیراً کدی دریافت کرده؟ (برای نمایش تایمر) */
export function getOtpRemainingSeconds(target: string): number {
  const key = normalizeTarget(target);
  const entry = otpMap.get(key);
  if (!entry) return 0;
  const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/** پاکسازی خودکار هر ۲ دقیقه (حافظه) + پاکسازی دیتابیس */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpMap.entries()) {
    if (entry.expiresAt < now) {
      otpMap.delete(key);
      deleteOtpFromDb(key);
    }
  }
  for (const [ip, entry] of ipRateMap.entries()) {
    if (now - entry.windowStart > RATE_WINDOW) ipRateMap.delete(ip);
  }
}, 2 * 60 * 1000);

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
