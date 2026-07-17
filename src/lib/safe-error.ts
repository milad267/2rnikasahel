/**
 * توابع کمکی برای مدیریت ایمن خطاها
 * - لاگ کامل خطا در سرور
 * - برگرداندن پیام generic به کلاینت (جلوگیری از نشت اطلاعات)
 */

import { NextResponse } from "next/server";

/**
 * تبدیل خطا به پاسخ JSON امن
 * خطای واقعی در سرور لاگ می‌شود و پیام generic به کاربر برمی‌گردد
 */
export function safeErrorResponse(error: unknown, context: string, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, error instanceof Error ? error.stack || message : message);
  return NextResponse.json(
    { ok: false, error: "خطای داخلی سرور رخ داد. لطفاً دوباره تلاش کنید." },
    { status },
  );
}

/**
 * تبدیل خطا به یک پیام امن (برای استفاده در responseهای خاص)
 */
export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[safeError]", message);
  return "خطای داخلی سرور رخ داد. لطفاً دوباره تلاش کنید.";
}
