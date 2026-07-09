import crypto from "crypto";
import { storeOtp, verifyOtp as verifyStoredOtp, getOtpRemainingSeconds, RateLimitError } from "./otp-store";
import { sendEmail } from "./email";
import { sendSms } from "./sms";

/**
 * یک کد OTP جدید تولید کرده و آن را از طریق ایمیل یا پیامک ارسال می‌کند
 */
export async function sendOtp(target: string, type: "phone" | "email") {
  // تولید کد ۶ رقمی
  const code = crypto.randomInt(100000, 999999).toString();

  // ذخیره کد و بررسی Rate Limit
  // اگر تعداد درخواست‌ها زیاد باشد، storeOtp یک RateLimitError پرتاب می‌کند
  storeOtp(target, code);

  const brandName = "درنیکا ساحل"; // این باید از تنظیمات خوانده شود

  if (type === "email") {
    await sendEmail({
      to: target,
      subject: `کد تایید شما در ${brandName}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; text-align: right;">
          <p>کد تایید شما برای ورود به <strong>${brandName}</strong>:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${code}</p>
          <p style="font-size: 12px; color: #888;">این کد تا ۵ دقیقه دیگر معتبر است.</p>
        </div>
      `,
    });
  } else {
    // phone
    await sendSms(target, `کد تایید شما برای ${brandName}: ${code}`);
  }

  // برای حالت توسعه، کد را برمی‌گردانیم
  return { devCode: process.env.NODE_ENV === "development" ? code : undefined };
}

export { verifyStoredOtp, getOtpRemainingSeconds, RateLimitError };