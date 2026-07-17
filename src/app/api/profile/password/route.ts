import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/safe-error";

/** PUT: تغییر رمز عبور */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "رمز عبور فعلی و جدید الزامی است." },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد." },
        { status: 400 },
      );
    }

    // تأیید رمز فعلی
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, error: "رمز عبور فعلی اشتباه است." },
        { status: 401 },
      );
    }

    const newHash = hashPassword(newPassword);

    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, user.id));

    return NextResponse.json({ ok: true, message: "رمز عبور با موفقیت تغییر کرد." });
  } catch (error) {
    return safeErrorResponse(error, "profile-password");
  }
}
