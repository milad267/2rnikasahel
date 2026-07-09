import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

/** GET: اطلاعات پروفایل */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });
  return NextResponse.json({ ok: true, user });
}

/** PUT: ویرایش پروفایل (نام، نام شرکت، ایمیل) */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const name = body?.name ? String(body.name).trim() : undefined;
    const companyName = body?.companyName !== undefined
      ? (body.companyName ? String(body.companyName).trim() : null)
      : undefined;
    const email = body?.email !== undefined
      ? (body.email ? String(body.email).trim() : null)
      : undefined;

    if (name && (name.length < 2 || name.length > 160)) {
      return NextResponse.json({ ok: false, error: "نام باید بین ۲ تا ۱۶۰ کاراکتر باشد." }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (companyName !== undefined) updates.companyName = companyName;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "هیچ تغییری ارسال نشده." }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning({ id: users.id, name: users.name, email: users.email, companyName: users.companyName });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
