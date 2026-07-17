import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/birthday?key=SECRET_KEY
 *
 * این اندپوینت توسط Cron Job روزانه فراخوانی می‌شود تا به کاربرانی که امروز
 * روز تولدشان است، پیامک و ایمیل تبریک ارسال کند.
 *
 * برای امنیت، یک کلید مخفی در تنظیمات ذخیره می‌شود و باید در Query String ارسال گردد.
 */

export async function GET(req: NextRequest) {
  try {
    // 1. بررسی کلید امنیتی
    const secretKey = await getSetting("cron.birthday.secret_key", "system");
    const providedKey = req.nextUrl.searchParams.get("key");

    if (secretKey && providedKey !== secretKey) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
    }

    // 2. پیدا کردن کاربرانی که امروز تولدشان است
    const today = new Date();
    const month = today.getMonth() + 1; // 1-based
    const day = today.getDate();

    const birthdayUsers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        birthDate: users.birthDate,
      })
      .from(users)
      .where(
        sql`EXTRACT(MONTH FROM ${users.birthDate}) = ${month} AND EXTRACT(DAY FROM ${users.birthDate}) = ${day}`
      );

    if (birthdayUsers.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "امروز هیچ کاربری تولد ندارد.",
        sent: 0,
        failed: 0,
      });
    }

    // 3. ارسال پیام تبریک
    const results: { userId: number; name: string; sms: boolean; email: boolean; error?: string }[] = [];

    for (const user of birthdayUsers) {
      const result: { userId: number; name: string; sms: boolean; email: boolean; error?: string } = {
        userId: user.id,
        name: user.name,
        sms: false,
        email: false,
      };

      try {
        // ارسال پیامک
        const smsMessage = `${user.name} عزیز،\n\nسایت درنیکا ساحل روز تولدت را تبریک می‌گوید! 🎂\n\nامیدواریم سالی پر از موفقیت و شادی داشته باشی.\n\nبا احترام،\nتیم درنیکا ساحل`;
        const smsResult = await sendSms(user.phone, smsMessage);
        result.sms = smsResult.success;

        // ارسال ایمیل (اگر ایمیل داشته باشد)
        if (user.email) {
          const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تبریک تولد</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a2e4a,#146b7e);padding:40px 30px;text-align:center;">
              <div style="font-size:56px;line-height:1;margin-bottom:16px;">🎂</div>
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:bold;">تولدت مبارک!</h1>
            </td>
          </tr>
          <!-- body -->
          <tr>
            <td style="padding:40px 30px;text-align:center;">
              <p style="font-size:18px;color:#1a2e3a;margin:0 0 20px;line-height:1.8;">
                ${user.name} عزیز،
              </p>
              <p style="font-size:15px;color:#4a5a65;margin:0 0 24px;line-height:1.8;">
                سایت <strong style="color:#146b7e;">درنیکا ساحل</strong> این روز خاص را به تو تبریک می‌گوید.
                <br>
                امیدواریم سالی پر از موفقیت، شادی و لحظات خوش داشته باشی.
              </p>
              <div style="font-size:40px;line-height:1;margin:20px 0;">🎉🎈🎊</div>
              <p style="font-size:13px;color:#8a9aa5;margin:30px 0 0;line-height:1.6;">
                با احترام،<br>
                <strong style="color:#146b7e;">تیم درنیکا ساحل</strong>
              </p>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:20px 30px;text-align:center;border-top:1px solid #e8ecef;">
              <p style="font-size:11px;color:#8a9aa5;margin:0;">
                این پیام به‌صورت خودکار به‌مناسبت روز تولد شما ارسال شده است.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          await sendEmail({
            to: user.email,
            subject: "🎂 تولدت مبارک! — درنیکا ساحل",
            html: emailHtml,
          });
          result.email = true;
        }
      } catch (err) {
        result.error = (err as Error).message;
      }

      results.push(result);
    }

    const sentCount = results.filter((r) => r.sms || r.email).length;
    const failedCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      ok: true,
      message: `تبریک به ${birthdayUsers.length} کاربر ارسال شد.`,
      total: birthdayUsers.length,
      sent: sentCount,
      failed: failedCount,
      details: results,
    });
  } catch (error) {
    console.error("Birthday cron error:", error);
    return NextResponse.json(
      { ok: false, error: "خطا در ارسال تبریک تولد" },
      { status: 500 }
    );
  }
}
