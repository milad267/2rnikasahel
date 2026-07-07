import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone || "").trim();
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");
    const role = body?.role === "contractor" ? "contractor" : "customer";
    const companyName = body?.companyName ? String(body.companyName).trim() : null;

    if (!phone || !name || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "نام، شماره موبایل و کلمه عبور (حداقل ۶ کاراکتر) الزامی است." },
        { status: 400 },
      );
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "این شماره موبایل قبلاً ثبت شده است. لطفاً وارد شوید." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({ phone, name, passwordHash, role, companyName })
      .returning();

    const token = createAuthToken(created.id, created.phone, created.role);
    const res = NextResponse.json({ ok: true, user: { id: created.id, name: created.name, phone: created.phone, role: created.role } });
    res.cookies.set(USER_TOKEN_COOKIE, token, { path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
