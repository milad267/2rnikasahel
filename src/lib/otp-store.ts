/**
 * ذخیره‌سازی OTP با Rate Limiting
 *
 * - در تولید باید از Redis استفاده شود
 * - هر شماره/ایمیل: حداکثر ۳ درخواست در ۵ دقیقه
 * - هر IP: حداکثر ۵ درخواست در ۵ دقیقه
 * - کدها ۵ دقیقه اعتبار دارند
 * - حداکثر ۳ تلاش ناموفق برای هر کد
 */

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

function normalizeTarget(target: string): string {
  return target.trim().toLowerCase();
}

/** ذخیره کد جدید */
export function storeOtp(target: string, code: string): void {
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
}

/** بررسی و مصرف کد */
export function verifyOtp(target: string, code: string): {
  valid: boolean;
  error?: string;
} {
  const key = normalizeTarget(target);
  const entry = otpMap.get(key);

  if (!entry) {
    return { valid: false, error: "کد تایید منقضی شده یا یافت نشد. دوباره درخواست کنید." };
  }

  if (entry.expiresAt < Date.now()) {
    otpMap.delete(key);
    return { valid: false, error: "کد تایید منقضی شده است. دوباره درخواست کنید." };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpMap.delete(key);
    return { valid: false, error: "تعداد تلاش‌های مجاز تمام شده. دوباره درخواست کنید." };
  }

  entry.attempts++;

  if (entry.code !== code) {
    return { valid: false, error: `کد تایید اشتباه است. ${MAX_ATTEMPTS - entry.attempts} تلاش باقی مانده.` };
  }

  // مصرف موفق — کد پاک می‌شود
  otpMap.delete(key);
  return { valid: true };
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

/** پاکسازی خودکار هر ۲ دقیقه */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpMap.entries()) {
    if (entry.expiresAt < now) otpMap.delete(key);
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
