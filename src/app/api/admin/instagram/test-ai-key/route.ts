import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/instagram/test-ai-key
 * تست اعتبار API Key برای OpenAI یا Gemini
 * Body: { provider: "openai" | "gemini", key: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { ok: false, error: "پروایدر و کلید API الزامی است" },
        { status: 400 },
      );
    }

    if (provider === "openai") {
      return await testOpenAiKey(key);
    } else if (provider === "gemini") {
      return await testGeminiKey(key);
    } else {
      return NextResponse.json(
        { ok: false, error: "پروایدر نامعتبر است" },
        { status: 400 },
      );
    }
  } catch (error) {
    return safeErrorResponse(error, "instagram-test-ai-key");
  }
}

/**
 * تست کلید OpenAI با فراخوانی API مدل‌ها
 */
async function testOpenAiKey(key: string) {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      // مدل‌های مناسب برای تولید محتوا
      const models = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) =>
          id.startsWith("gpt-") || id.startsWith("o")
        );
      const preferredModel =
        models.find((m: string) => m.includes("gpt-4o")) ||
        models.find((m: string) => m.includes("gpt-4")) ||
        models[0] ||
        "gpt-4o";

      return NextResponse.json({
        ok: true,
        valid: true,
        model: preferredModel,
        message: `✅ اعتبارسنجی شد. مدل‌های доступ: ${preferredModel}`,
      });
    } else {
      const err = await res.text();
      let errorMsg = "کلید OpenAI نامعتبر است";
      try {
        const parsed = JSON.parse(err);
        errorMsg = parsed.error?.message || parsed.error?.code || errorMsg;
      } catch { /* ignore */ }

      return NextResponse.json({
        ok: true,
        valid: false,
        error: errorMsg,
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      ok: true,
      valid: false,
      error: `خطا: ${error?.message || "عدم دسترسی به سرور OpenAI"}`,
    });
  }
}

/**
 * تست کلید Gemini با فراخوانی API لیست مدل‌ها
 */
async function testGeminiKey(key: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    );

    if (res.ok) {
      const data = await res.json();
      const models = (data.models || [])
        .map((m: any) => m.name?.replace("models/", ""))
        .filter(Boolean);

      const preferredModel =
        models.find((m: string) => m.includes("gemini-2.0-flash")) ||
        models.find((m: string) => m.includes("gemini-1.5-pro")) ||
        models.find((m: string) => m.includes("gemini-1.5-flash")) ||
        models[0] ||
        "gemini-2.0-flash";

      return NextResponse.json({
        ok: true,
        valid: true,
        model: preferredModel,
        message: `✅ اعتبارسنجی شد. مدل‌های доступ: ${preferredModel}`,
      });
    } else {
      const err = await res.text();
      let errorMsg = "کلید Gemini نامعتبر است";
      try {
        const parsed = JSON.parse(err);
        errorMsg = parsed.error?.message || parsed.error?.status || errorMsg;
      } catch { /* ignore */ }

      return NextResponse.json({
        ok: true,
        valid: false,
        error: errorMsg,
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      ok: true,
      valid: false,
      error: `خطا: ${error?.message || "عدم دسترسی به سرور Gemini"}`,
    });
  }
}
