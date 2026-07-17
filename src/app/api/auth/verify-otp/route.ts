import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createAuthToken, USER_TOKEN_COOKIE, hashPassword } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp-store";
import { enforceRateLimit } from "@/lib/request-security";
import { mergeGuestCart, SESSION_COOKIE } from "@/lib/commerce";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "otp-verify", 12, 5 * 60 * 1000);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => null);
    const target = String(body?.target || "").trim();
    const code = String(body?.code || "").trim();
    const name = String(body?.name || "").trim();
    // isRegister دیگر لازم نیست — اگر کاربر جدید باشه خودکار ثبت‌نام می‌شه

    if (!target || !code) {
      return NextResponse.json(
        { ok: false, error: "شماره موبایل/ایمیل و کد تایید الزامی است." },
        { status: 400 },
      );
    }

    // بررسی کد (علیه rate limiting و expiration)
    const result = await verifyOtp(target, code);

    // پشتیبانی از کد ثابت توسعه (فقط در محیط development)
    const isDevBypass =
      process.env.NODE_ENV === "development" && code === "123456";

    if (!result.valid && !isDevBypass) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error?.includes("اشتباه") ? 401 : 400 },
      );
    }

    // تشخیص نوع target — نرمال‌سازی شماره موبایل
    const cleanTarget = target.replace(/\s/g, "");
    const isPhone = /^0?9\d{9}$/.test(cleanTarget);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
    // شماره موبایل را نرمال کن: اگر با ۹ شروع شد، ۰ اضافه کن
    const normalizedPhone = isPhone
      ? (cleanTarget.startsWith("0") ? cleanTarget : "0" + cleanTarget)
      : null;

    let [user] = isPhone && normalizedPhone !== null
      ? await db.select().from(users).where(eq(users.phone, normalizedPhone)).limit(1)
      : isEmail
        ? await db.select().from(users).where(eq(users.email, target)).limit(1)
        : [undefined];

    if (!user) {
      // ثبت‌نام خودکار
      if (!name) {
        return NextResponse.json(
          {
            ok: false,
            error: "برای ثبت‌نام، لطفاً نام خود را وارد کنید.",
            requiresName: true,
          },
          { status: 400 },
        );
      }

      // پسورد تصادفی (کاربر می‌تونه بعداً از پروفایل تغییر بده)
      const randomPassword = hashPassword(
        Math.random().toString(36) + Date.now().toString(36),
      );

      const [created] = await db
        .insert(users)
        .values({
          name,
          phone: isPhone ? normalizedPhone : null,
          email: isEmail ? target : null,
          passwordHash: randomPassword,
          role: "customer",
        } as any)
        .returning();
      user = created;
    }

    // ایجاد توکن و ست کردن کوکی
    const token = createAuthToken(user.id, user.phone || target, user.role);
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
    const useSecure = process.env.NODE_ENV === "production" && String(process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://");
    res.cookies.set(USER_TOKEN_COOKIE, token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: useSecure,
    });
    // ادغام سبد خرید مهمان به حساب کاربری
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    if (sessionToken) {
      await mergeGuestCart(user.id, sessionToken);
    }
    return res;
  } catch (error) {
    console.error("[verify-otp]", error);
    return NextResponse.json(
      { ok: false, error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
