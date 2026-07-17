import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/request-security";
import { safeErrorResponse } from "@/lib/safe-error";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "auth-register", 5, 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone || "").trim();
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");
    const role = body?.role === "contractor" ? "contractor" : "customer";
    const companyName = body?.companyName ? String(body.companyName).trim() : null;

    const normalizedPhone = phone.replace(/[\s-]/g, "").replace(/^\+98/, "0");
    if (!/^09\d{9}$/.test(normalizedPhone) || name.length < 2 || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "نام، شماره موبایل و کلمه عبور (حداقل ۸ کاراکتر) الزامی است." },
        { status: 400 },
      );
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, normalizedPhone)).limit(1);
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "این شماره موبایل قبلاً ثبت شده است. لطفاً وارد شوید." },
        { status: 409 },
      );
    }

    // نقش کاربر همیشه فقط customer است؛ ارتقا فقط با سوپرادمین انجام می‌شود.
    const finalRole = "customer" as const;

    const passwordHash = hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({ phone: normalizedPhone, name, passwordHash, role: finalRole, companyName })
      .returning();

    const token = createAuthToken(created.id, created.phone, created.role);
    const res = NextResponse.json({ ok: true, user: { id: created.id, name: created.name, phone: created.phone, role: created.role } });
    res.cookies.set(USER_TOKEN_COOKIE, token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (error) {
    return safeErrorResponse(error, "auth-register");
  }
}
