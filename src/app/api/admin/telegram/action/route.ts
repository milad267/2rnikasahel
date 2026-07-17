import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { enforceRateLimit } from "@/lib/request-security";
import { getPublicOrigin } from "@/lib/public-url";
import { safeErrorResponse } from "@/lib/safe-error";
import { getProxyConfig, fetchWithProxy, parseV2RayLink } from "@/lib/proxy";

type TelegramAction = "test" | "setup-webhook" | "remove-webhook" | "send-test" | "set-commands";

async function telegramSetting(key: string): Promise<string> {
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(and(eq(siteSettings.key, `telegram.${key}`), eq(siteSettings.group, "telegram")))
    .limit(1);
  return typeof row?.value === "string" ? row.value.trim() : "";
}

async function callTelegram(token: string, method: string, payload?: Record<string, unknown>) {
  const proxyConfig = await getProxyConfig();
  const response = await fetchWithProxy(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: payload ? "POST" : "GET",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store",
    },
    proxyConfig,
  );
  const data = await response.json().catch(() => ({ ok: false, description: "پاسخ نامعتبر از تلگرام" }));
  if (!response.ok || !data.ok) {
    throw new Error(String(data.description || "ارتباط با تلگرام ناموفق بود"));
  }
  return data;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limited = enforceRateLimit(req, "admin-telegram", 20, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "") as TelegramAction;
    const token = await telegramSetting("bot_token");
    if (!token) return NextResponse.json({ ok: false, error: "ابتدا توکن ربات را ذخیره کنید." }, { status: 400 });

    if (action === "test") {
      const data = await callTelegram(token, "getMe");
      return NextResponse.json({ ok: true, username: data.result?.username || "" });
    }

    if (action === "setup-webhook") {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
      if (process.env.NODE_ENV === "production" && secret.length < 24) {
        return NextResponse.json({ ok: false, error: "کلید امنیتی وب‌هوک تلگرام در سرور تنظیم نشده است." }, { status: 503 });
      }
      const requestedUrl = String(body.url || "").trim();
      const webhookUrl = requestedUrl || `${getPublicOrigin(req)}/api/telegram/webhook`;
      const parsed = new URL(webhookUrl);
      if ((process.env.NODE_ENV === "production" && parsed.protocol !== "https:") || !parsed.pathname.endsWith("/api/telegram/webhook")) {
        return NextResponse.json({ ok: false, error: "آدرس وب‌هوک معتبر نیست." }, { status: 400 });
      }
      await callTelegram(token, "setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        ...(secret ? { secret_token: secret } : {}),
      });
      const info = await callTelegram(token, "getWebhookInfo");
      return NextResponse.json({ ok: true, url: webhookUrl, info: info.result });
    }

    if (action === "remove-webhook") {
      await callTelegram(token, "deleteWebhook", { drop_pending_updates: false });
      return NextResponse.json({ ok: true });
    }

    if (action === "send-test") {
      const chatId = await telegramSetting("default_chat_id");
      if (!/^-?\d+$/.test(chatId)) {
        return NextResponse.json({ ok: false, error: "Chat ID معتبر را ذخیره کنید." }, { status: 400 });
      }
      await callTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: "✅ پیام آزمایشی فروشگاه با موفقیت ارسال شد.",
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "set-commands") {
      await callTelegram(token, "setMyCommands", {
        commands: [
          { command: "start", description: "شروع و خوش‌آمدگویی" },
          { command: "status", description: "وضعیت فروشگاه" },
          { command: "order", description: "پیگیری سفارش" },
          { command: "help", description: "راهنما" },
        ],
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });
  } catch (error) {
    return safeErrorResponse(error, "telegram-action", 502);
  }
}
