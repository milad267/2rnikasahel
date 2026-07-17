import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/request-security";
import { safeErrorResponse } from "@/lib/safe-error";
import { mergeGuestCart, SESSION_COOKIE } from "@/lib/commerce";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "auth-login", 8, 15 * 60 * 1000);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => null);
    const identifier = String(body?.identifier || body?.phone || "").trim(); // سازگار با فرم فعلی و کلاینت‌های جدید
    const password = String(body?.password || "");

    if (!identifier || !password) {
      return NextResponse.json({ ok: false, error: "شماره موبایل، ایمیل یا نام کاربری و کلمه عبور الزامی است." }, { status: 400 });
    }

    // جستجو با موبایل OR ایمیل OR نام کاربری
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, identifier),
          eq(users.email, identifier),
          eq(users.name, identifier),
        ),
      )
      .limit(1);

    if (!user) {
      return NextResponse.json({ ok: false, error: "اطلاعات وارد شده اشتباه است." }, { status: 401 });
    }

    // بررسی قفل شدن حساب
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json({
        ok: false,
        error: `حساب شما به دلیل تلاش‌های ناموفق زیاد قفل شده است. ${remaining} دقیقه دیگر تلاش کنید.`,
      }, { status: 423 });
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      // افزایش تعداد تلاش‌های ناموفق
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const MAX_ATTEMPTS = 5;
      const updateData: any = { failedLoginAttempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        // قفل کردن حساب به مدت 30 دقیقه
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await db.update(users).set(updateData).where(eq(users.id, user.id));
      return NextResponse.json({ ok: false, error: "اطلاعات وارد شده اشتباه است." }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ ok: false, error: "حساب کاربری شما غیرفعال شده است." }, { status: 403 });
    }

    // بازنشانی تلاش‌های ناموفق و ثبت آخرین ورود
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    }).where(eq(users.id, user.id));

    const token = createAuthToken(user.id, user.phone, user.role);
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role } });
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
    return safeErrorResponse(error, "auth-login");
  }
}
