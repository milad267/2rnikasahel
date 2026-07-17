import { getSetting } from "./settings";
import { decrypt, isEncrypted } from "./encryption";

/**
 * پیامک را با استفاده از ارائه‌دهنده فعال در پنل مدیریت ارسال می‌کند.
 * ارائه‌دهنده‌ها و کلیدها از تنظیمات پنل مدیریت خوانده می‌شوند:
 *   sms.active_provider
 *   sms.<provider>.api_key | sms.<provider>.sender | sms.<provider>.username | sms.<provider>.password
 */

const isDev = process.env.NODE_ENV !== "production";

type SmsResult = { success: boolean; error?: string };

async function get(key: string): Promise<string> {
  let val = (await getSetting<string>(`sms.${key}`, "sms")) || "";
  if (val && isEncrypted(val)) {
    try { val = decrypt(val); } catch { /* ignore */ }
  }
  return val;
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const provider = (await getSetting<string>("sms.active_provider", "sms")) || "";

  try {
    switch (provider) {
      case "kavenegar":
        return await sendKavenegar(to, message);
      case "smsir":
        return await sendSmsIr(to, message);
      case "ghasedak":
        return await sendGhasedak(to, message);
      case "farazsms":
        return await sendFarazSms(to, message);
      case "melipayamak":
        return await sendMeliPayamak(to, message);
      default:
        if (isDev) {
          console.warn(`[SMS - Mock] هیچ ارائه‌دهنده فعالی تنظیم نشده. ارسال شبیه‌سازی‌شده به ${to}: "${message}"`);
          return { success: true };
        }
        return { success: false, error: "هیچ ارائه‌دهنده پیامک فعالی تنظیم نشده است." };
    }
  } catch (err: any) {
    console.error(`[SMS - ${provider}] خطا در ارسال:`, err?.message || err);
    // در تولید، خطا را برمی‌گردانیم؛ در توسعه اجازه ادامه می‌دهیم
    if (isDev) return { success: true };
    return { success: false, error: "ارسال پیامک با خطا مواجه شد." };
  }
}

// ─── کاوه‌نگار ───
async function sendKavenegar(to: string, message: string): Promise<SmsResult> {
  const apiKey = await get("kavenegar.api_key");
  const sender = await get("kavenegar.sender");
  if (!apiKey) return { success: false, error: "کلید API کاوه‌نگار تنظیم نشده است." };

  const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
  const params = new URLSearchParams({ receptor: to, message });
  if (sender) params.set("sender", sender);

  const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  const ok = data?.return?.status === 200;
  return ok ? { success: true } : { success: false, error: data?.return?.message || "خطای کاوه‌نگار" };
}

// ─── SMS.ir (v1) ───
async function sendSmsIr(to: string, message: string): Promise<SmsResult> {
  const apiKey = await get("smsir.api_key");
  const sender = await get("smsir.sender");
  if (!apiKey) return { success: false, error: "کلید API اس‌ام‌اس‌آی‌آر تنظیم نشده است." };

  const res = await fetch("https://api.sms.ir/v1/send/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ lineNumber: sender || undefined, messageText: message, mobiles: [to] }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && (data?.status === 1 || data?.status === true);
  return ok ? { success: true } : { success: false, error: data?.message || "خطای SMS.ir" };
}

// ─── قاصدک ───
async function sendGhasedak(to: string, message: string): Promise<SmsResult> {
  const apiKey = await get("ghasedak.api_key");
  const sender = await get("ghasedak.sender");
  if (!apiKey) return { success: false, error: "کلید API قاصدک تنظیم نشده است." };

  const res = await fetch("https://api.ghasedak.me/v2/sms/send/simple", {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ receptor: to, message, linenumber: sender || "" }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data?.result?.code === 200;
  return ok ? { success: true } : { success: false, error: data?.result?.message || "خطای قاصدک" };
}

// ─── فراز اس‌ام‌اس (ippanel) ───
async function sendFarazSms(to: string, message: string): Promise<SmsResult> {
  const apiKey = await get("farazsms.api_key");
  const sender = await get("farazsms.sender");
  if (!apiKey) return { success: false, error: "کلید API فراز اس‌ام‌اس تنظیم نشده است." };

  const res = await fetch("https://api2.ippanel.com/api/v1/sms/send/webservice/single", {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: [to], sender: sender || "", message }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && (data?.status === "OK" || data?.code === 200 || data?.data);
  return ok ? { success: true } : { success: false, error: data?.error_message || data?.message || "خطای فراز اس‌ام‌اس" };
}

// ─── ملی پیامک ───
async function sendMeliPayamak(to: string, message: string): Promise<SmsResult> {
  const username = await get("melipayamak.username");
  const password = await get("melipayamak.password");
  const sender = await get("melipayamak.sender");
  if (!username || !password) return { success: false, error: "نام کاربری/رمز ملی پیامک تنظیم نشده است." };

  const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/SendSMS", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password, to, from: sender || "", text: message }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  // مقدار RetStatus === 1 یعنی موفق
  const ok = res.ok && (data?.RetStatus === 1 || data?.Value);
  return ok ? { success: true } : { success: false, error: data?.StrRetStatus || "خطای ملی پیامک" };
}
