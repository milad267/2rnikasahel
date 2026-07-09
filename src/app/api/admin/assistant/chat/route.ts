import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const message = String(body?.message || "").trim();

    if (!message) {
      return NextResponse.json({ ok: false, error: "متن پیام نمی‌تواند خالی باشد." }, { status: 400 });
    }

    // Fallback تا زمان راه‌اندازی مجدد AI
    return NextResponse.json({
      ok: true,
      response: "🤖 دستیار هوش مصنوعی در حال راه‌اندازی مجدد است. لطفاً از صفحه تنظیمات AI یک ارائه‌دهنده معتبر انتخاب کنید.",
    });
  } catch (error) {
    console.error("[ASSISTANT_CHAT_ERROR]", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور" }, { status: 500 });
  }
}
