import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const identifier = String(body?.identifier || "").trim(); // می‌تونه موبایل، ایمیل یا نام کاربری باشه
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

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "اطلاعات وارد شده اشتباه است." }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ ok: false, error: "حساب کاربری شما غیرفعال شده است." }, { status: 403 });
    }

    const token = createAuthToken(user.id, user.phone, user.role);
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role } });
    res.cookies.set(USER_TOKEN_COOKIE, token, { path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
