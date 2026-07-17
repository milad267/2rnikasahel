import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendOtp } from "@/lib/otp";

/**
 * درخواست بازیابی رمز عبور.
 * برای جلوگیری از افشای شماره‌های ثبت‌شده، پاسخ همیشه موفق است؛
 * تنها در صورتی که کاربر واقعاً وجود داشته باشد، کد بازیابی ارسال می‌شود.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone || "").trim().replace(/\s/g, "");

    if (!phone || !/^0?9\d{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست." }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (user) {
      // ارسال کد بازیابی فقط برای کاربران موجود
      await sendOtp(phone, "phone").catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: "اگر این شماره ثبت شده باشد، کد بازیابی رمز عبور ارسال خواهد شد.",
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_API_ERROR]", error);
    // باز هم پاسخ موفق تا اطلاعاتی درباره وجود/عدم وجود شماره فاش نشود
    return NextResponse.json({
      ok: true,
      message: "اگر این شماره ثبت شده باشد، کد بازیابی رمز عبور ارسال خواهد شد.",
    });
  }
}
