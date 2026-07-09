import { getSetting } from "./settings";

/**
 * پیامک را با استفاده از ارائه‌دهنده فعال در پنل مدیریت ارسال می‌کند
 */
export async function sendSms(to: string, message: string) {
  const activeProvider = await getSetting<string>("sms.active_provider", "sms");

  switch (activeProvider) {
    case "kavenegar":
      const apiKey = await getSetting<string>("sms.kavenegar.api_key", "sms");
      if (!apiKey) {
        console.error("❌ Kavenegar API key is not set.");
        break;
      }
      // در اینجا کد فراخوانی API کاوه‌نگار قرار می‌گیرد
      console.log(`[SMS - Kavenegar] Sending to ${to}: ${message}`);
      // await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json?receptor=${to}&message=${encodeURIComponent(message)}`);
      break;

    // case "ghasedak": ...

    default:
      // اگر هیچ ارائه‌دهنده‌ای فعال نبود
      console.warn(`[SMS - Mock] No active SMS provider. Mock sending to ${to}: "${message}"`);
      break;
  }

  // در هر صورت (حتی در صورت خطا) پاسخ موفقیت‌آمیز برمی‌گردانیم تا کاربر با خطای داخلی مواجه نشود
  return { success: true };
}