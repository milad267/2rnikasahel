import nodemailer from "nodemailer";
import { getSettings, getSetting } from "./settings";
import { decrypt, isEncrypted } from "./encryption";

/**
 * ایمیل را با استفاده از تنظیمات SMTP ذخیره شده در دیتابیس ارسال می‌کند
 * با تایم‌اوت ۵ ثانیه‌ای برای جلوگیری از کندی لاگین
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; }) {
  // یکجا همه تنظیمات SMTP را می‌خوانیم (فقط ۱ کوئری)
  const smtp = await getSettings<{
    "email.smtp.host": string;
    "email.smtp.port": number;
    "email.smtp.user": string;
    "email.smtp.pass": string;
    "email.smtp.from": string;
  }>("email", ["email.smtp.host", "email.smtp.port", "email.smtp.user", "email.smtp.pass", "email.smtp.from"]);

  const host = smtp["email.smtp.host"];
  const port = smtp["email.smtp.port"];
  const user = smtp["email.smtp.user"];
  let pass = smtp["email.smtp.pass"];
  // رمزگشایی رمز SMTP اگر رمزنگاری شده باشد
  if (pass && isEncrypted(pass)) {
    try { pass = decrypt(pass); } catch { /* ignore */ }
  }
  const fromEmail = smtp["email.smtp.from"] || "noreply@dornika.co";
  const fromName = (await getSetting<string>("brand.name", "general")) || "درنیکا ساحل";

  if (!host || !port || !user || !pass) {
    // در حالت توسعه، یک پاسخ ساختگی برمی‌گردانیم
    if (process.env.NODE_ENV === "development") {
      console.log(`📧 Mock Email to ${to}: Subject: ${subject}`);
      return { success: true };
    }
    throw new Error("سرویس ایمیل پیکربندی نشده است.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
    connectionTimeout: 5000, // ۵ ثانیه تایم‌اوت
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });

  // اضافه کردن تایم‌اوت به sendMail (با Promise.race)
  await Promise.race([
    transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    }),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("ارسال ایمیل زمان بر شد (۱۰ ثانیه)")), 10000)
    ),
  ]);

  return { success: true };
}
