import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { getAiConfig } from "@/lib/ai";
import { trackedChatCompletion } from "@/lib/ai-usage";
import { hasModuleAccess } from "@/lib/admin-permissions-server";

export const dynamic = "force-dynamic";

/**
 * تست اتصال به سرویس هوش مصنوعی برای هر role
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  if (!await hasModuleAccess(user.id, user.role, "ai")) {
    return NextResponse.json({ ok: false, error: "شما به تنظیمات هوش مصنوعی دسترسی ندارید." }, { status: 403 });
  }

  let body: {
    provider?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    task?: string; // هر roleای قبول میشه
  } = {};
  try { body = await req.json(); } catch { /* optional */ }

  // تعیین پیکربندی — اولویت با body، بعد تنظیمات ذخیره‌شده
  let provider = (body.provider || "").trim();
  let apiKey = (body.apiKey || "").trim();
  let model = (body.model || "").trim();
  let baseUrl = (body.baseUrl || "").trim();
  const task = body.task || "chat";

  // اگه apiKey توی body نیست، از تنظیمات ذخیره‌شده بخون
  if (!apiKey) {
    const saved = await getAiConfig(task);
    if (saved) {
      provider = provider || saved.provider || "";
      apiKey = saved.apiKey || "";
      model = model || saved.model || "";
      baseUrl = baseUrl || saved.baseUrl || "";
    }
  }

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: `کلید API برای "${task}" تنظیم نشده است. لطفاً از صفحه مدیریت AI یک کلید وارد کنید.`,
    }, { status: 400 });
  }

  if (!model) {
    model = "gpt-4o-mini";
  }

  // نگاشت baseUrl پیش‌فرض
  if (!baseUrl) {
    if (provider === "groq") baseUrl = "https://api.groq.com/openai/v1";
    else if (provider === "gemini") baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
    else if (provider === "openrouter") baseUrl = "https://openrouter.ai/api/v1";
    else if (provider === "deepseek") baseUrl = "https://api.deepseek.com/v1";
    else if (provider === "together") baseUrl = "https://api.together.xyz/v1";
    else baseUrl = "https://api.openai.com/v1";
  }

  const started = Date.now();
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || undefined,
      timeout: 15000,
      maxRetries: 1,
    });

    const res: any = await trackedChatCompletion(client, {
      model,
      messages: [
        { role: "system", content: "Reply with exactly: OK" },
        { role: "user", content: "ping" },
      ],
      max_tokens: 10,
      temperature: 0,
    }, { agent: task, task: "connection-test", provider: provider || "openai", model, userId: user.id, isAdmin: true });

    const reply = res.choices?.[0]?.message?.content?.trim() || "";
    const latency = Date.now() - started;

    return NextResponse.json({
      ok: true,
      message: `✅ اتصال برقرار شد (${latency}ms) — ${provider || "openai"} / ${model}`,
      model,
      provider: provider || "openai",
      reply,
      latency,
    });
  } catch (error: any) {
    console.error("[AI_TEST_ERROR]", task, provider, model, error?.message);

    let msg = error?.message || "خطای ناشناخته";
    if (error?.status === 401 || msg.includes("401") || msg.includes("Unauthorized") || msg.includes("invalid api key") || msg.includes("Incorrect API key")) {
      msg = "⛔ کلید API نامعتبر است (401). لطفاً کلید را بررسی کنید.";
    } else if (error?.status === 404 || msg.includes("404") || msg.includes("not found") || msg.includes("model_not_found")) {
      msg = "🔍 مدل یا آدرس Base URL یافت نشد (404). نام مدل و Base URL را بررسی کنید.";
    } else if (error?.status === 429 || msg.includes("429") || msg.includes("rate limit")) {
      msg = "⏳ محدودیت نرخ درخواست (429). لطفاً چند لحظه صبر کنید.";
    } else if (error?.status === 403 || msg.includes("403") || msg.includes("Forbidden")) {
      msg = "🚫 دسترسی غیرمجاز (403). ممکن است کشور شما تحریم باشد — از VPN استفاده کنید یا provider دیگری انتخاب کنید.";
    } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
      msg = "🌐 اتصال به سرور برقرار نشد (Timeout). اینترنت یا VPN را بررسی کنید.";
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
