import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { routeRequest } from "@/lib/agents/router";
import { rateResponse } from "@/lib/assistant-brain";
import { enforceRateLimit, safeChatAttachments, safeChatHistory, safeExtractedProducts } from "@/lib/request-security";
import { hasModuleAccess } from "@/lib/admin-permissions-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    if (!await hasModuleAccess(user.id, user.role, "ai")) {
      return NextResponse.json({ ok: false, error: "شما به دستیار هوش مصنوعی دسترسی ندارید." }, { status: 403 });
    }
    const limited = enforceRateLimit(req, `admin-assistant-chat:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const message = String(body?.message || "").trim();
    const fileContent = String(body?.fileContent || "").slice(0, 20_000) || undefined;
    const fileProducts = safeExtractedProducts(body?.fileProducts, 100);
    const history = safeChatHistory(body?.history, 15);
    const attachments = safeChatAttachments(body?.attachments, 25);

    // مدیریت بازخورد یادگیری
    if (message.startsWith("/rate ")) {
      const rating = body?.rating as "good" | "bad" | "neutral" | undefined;
      const rateInput = body?.rateInput as string | undefined;
      const rateOutput = body?.rateOutput as string | undefined;
      if (rating && rateInput && rateOutput) {
        rateResponse(rateInput, rateOutput, rating);
        return NextResponse.json({
          ok: true,
          response: rating === "good"
            ? "👍 بازخورد شما ثبت شد. از این یاد می‌گیرم و در پاسخ‌های بعدی بهتر عمل می‌کنم."
            : "👎 متوجه شدم. این بازخورد به من کمک می‌کند بهبود پیدا کنم.",
        });
      }
    }

    if (!message) {
      return NextResponse.json({ ok: false, error: "متن پیام نمی‌تواند خالی باشد." }, { status: 400 });
    }

    // استفاده از روتر جدید
    const result = await routeRequest({
      message,
      userId: user.id,
      isAdmin: true,
      adminRole: user.role,
      sessionId: `admin-${user.id}`,
      history,
      fileContent,
      fileProducts,
      attachments,
    });

    return NextResponse.json({
      ok: true,
      response: result.response,
      intent: result.intent,
      agentsCalled: result.agentsCalled,
      results: result.results,
      totalLatencyMs: result.totalLatencyMs,
      source: result.source,
      attachments: result.attachments,
    });
  } catch (error) {
    console.error("[ADMIN_ASSISTANT_CHAT]", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور" }, { status: 500 });
  }
}
