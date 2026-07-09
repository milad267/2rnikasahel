import nodemailer from "nodemailer";
import { getSetting } from "./settings";

/**
 * ایمیل را با استفاده از تنظیمات SMTP ذخیره شده در دیتابیس ارسال می‌کند
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; }) {
  const host = await getSetting<string>("email.smtp.host", "email");
  const port = await getSetting<number>("email.smtp.port", "email");
  const user = await getSetting<string>("email.smtp.user", "email");
  const pass = await getSetting<string>("email.smtp.pass", "email");
  const fromName = await getSetting<string>("brand.name", "general") || "درنیکا ساحل";
  const fromEmail = await getSetting<string>("email.smtp.from", "email") || `noreply@dornika.co`;

  if (!host || !port || !user || !pass) {
    console.error("❌ SMTP settings are not configured in the admin panel.");
    // در حالت توسعه، برای جلوگیری از خطا، یک پاسخ موفقیت‌آمیز ساختگی برمی‌گردانیم
    if (process.env.NODE_ENV === "development") {
      console.log(`📧 Mock Email to ${to}: Subject: ${subject}`);
      return { success: true };
    }
    throw new Error("سرویس ایمیل پیکربندی نشده است.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  return { success: true };
}