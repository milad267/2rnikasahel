import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp-store";

/**
 * POST /api/auth/reset-password
 *
 * تنظیم رمز عبور جدید پس از تأیید کد بازیابی (OTP).
 * پس از موفقیت، کاربر به‌صورت خودکار وارد حساب می‌شود.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone || "").trim().replace(/\s/g, "");
    const code = String(body?.code || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!phone || !/^0?9\d{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست." }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ ok: false, error: "کد بازیابی را وارد کنید." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد." },
        { status: 400 },
      );
    }

    // بررسی کد OTP (با پشتیبانی از کد ثابت توسعه)
    const result = await verifyOtp(phone, code);
    const isDevBypass = process.env.NODE_ENV === "development" && code === "123456";

    if (!result.valid && !isDevBypass) {
      return NextResponse.json(
        { ok: false, error: result.error || "کد بازیابی نامعتبر است." },
        { status: result.error?.includes("اشتباه") ? 401 : 400 },
      );
    }

    // یافتن کاربر
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "کاربری با این شماره یافت نشد." },
        { status: 404 },
      );
    }

    // به‌روزرسانی رمز عبور
    const newHash = hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    // ورود خودکار پس از بازنشانی رمز
    const token = createAuthToken(user.id, user.phone || phone, user.role);
    const res = NextResponse.json({
      ok: true,
      message: "رمز عبور با موفقیت تغییر کرد و وارد حساب شدید.",
    });
    res.cookies.set(USER_TOKEN_COOKIE, token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (error) {
    console.error("[RESET_PASSWORD_API_ERROR]", error);
    return NextResponse.json(
      { ok: false, error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
