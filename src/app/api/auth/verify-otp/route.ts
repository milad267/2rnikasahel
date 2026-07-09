import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createAuthToken, USER_TOKEN_COOKIE, hashPassword } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
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
    const result = verifyOtp(target, code);

    // پشتیبانی از کد ثابت توسعه
    const isDevBypass =
      process.env.NODE_ENV !== "production" && code === "123456";

    if (!result.valid && !isDevBypass) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error?.includes("اشتباه") ? 401 : 400 },
      );
    }

    // تشخیص نوع target
    const cleanTarget = target.replace(/\s/g, "");
    const isPhone = /^0?9\d{9}$/.test(cleanTarget);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);

    let [user] = isPhone
      ? await db.select().from(users).where(eq(users.phone, target)).limit(1)
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
          phone: isPhone ? target : null,
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
    res.cookies.set(USER_TOKEN_COOKIE, token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // ۳۰ روز
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    console.error("[verify-otp]", error);
    return NextResponse.json(
      { ok: false, error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
