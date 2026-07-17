import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendSms } from "@/lib/sms";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/communications/broadcast
 * ارسال پیام همگانی به تمام کاربرانی که شماره موبایل ثبت کرده‌اند
 * body: { message: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ ok: false, error: "متن پیام را وارد کنید." }, { status: 400 });
    }

    const text = message.trim();

    // دریافت کاربران دارای شماره موبایل
    const allUsers = await db
      .select({ id: users.id, phone: users.phone, name: users.name })
      .from(users)
      .where(and(eq(users.isActive, true)));

    if (allUsers.length === 0) {
      return NextResponse.json({ ok: false, error: "هیچ کاربر فعالی یافت نشد." }, { status: 404 });
    }

    // ارسال به صورت ترتیبی (sequential) برای جلوگیری از محدودیت API
    let successCount = 0;
    let failCount = 0;
    const errors: { phone: string; error: string }[] = [];

    for (const user of allUsers) {
      try {
        const result = await sendSms(user.phone, text);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push({ phone: user.phone, error: result.error || "نامشخص" });
        }
      } catch (err: any) {
        failCount++;
        errors.push({ phone: user.phone, error: err?.message || "خطای ناشناخته" });
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        total: allUsers.length,
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // فقط ۱۰ خطای اول
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "خطای سرور" },
      { status: 500 },
    );
  }
}
