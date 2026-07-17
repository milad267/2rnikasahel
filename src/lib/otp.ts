import crypto from "crypto";
import { storeOtp, verifyOtp as verifyStoredOtp, getOtpRemainingSeconds, RateLimitError } from "./otp-store";
import { sendEmail } from "./email";
import { sendSms } from "./sms";

/**
 * یک کد OTP جدید تولید کرده و آن را از طریق ایمیل یا پیامک ارسال می‌کند
 * با تایم‌اوت ۷ ثانیه‌ای برای جلوگیری از کندی
 */
export async function sendOtp(target: string, type: "phone" | "email") {
  // تولید کد ۶ رقمی
  const code = crypto.randomInt(100000, 999999).toString();

  // ذخیره کد و بررسی Rate Limit
  await storeOtp(target, code);

  const brandName = "درنیکا ساحل";

  if (type === "email") {
    // ارسال با تایم‌اوت
    const emailPromise = sendEmail({
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
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("ارسال ایمیل زمان بر شد")), 7000)
    );
    await Promise.race([emailPromise, timeoutPromise]);
  } else {
    // phone
    const smsPromise = sendSms(target, `کد تایید شما برای ${brandName}: ${code}`);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("ارسال پیامک زمان بر شد")), 7000)
    );
    await Promise.race([smsPromise, timeoutPromise]);
  }

  return { devCode: process.env.NODE_ENV === "development" ? code : undefined };
}

export { verifyStoredOtp, getOtpRemainingSeconds, RateLimitError };