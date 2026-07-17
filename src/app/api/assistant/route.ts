import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { enforceRateLimit, safeChatAttachments, safeChatHistory, safeExtractedProducts } from "@/lib/request-security";
import { routeRequest } from "@/lib/agents/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const isAdmin = !!user && (user.role === "superadmin" || user.role === "admin");

    const body = await req.json().catch(() => null);
    const message = String(body?.message || "").trim();
    const fileContent = String(body?.fileContent || "").slice(0, 20_000) || undefined;
    const fileProducts = safeExtractedProducts(body?.fileProducts, 100);
    const history = safeChatHistory(body?.history, 10);
    const attachments = safeChatAttachments(body?.attachments, 10);

    // مدیریت ریت (adminها محدودیت کمتری دارن)
    const limit = isAdmin ? 60 : 15;
    const limited = enforceRateLimit(req, isAdmin ? `admin-assistant:${user?.id}` : "public-assistant", limit, 60_000);
    if (limited) return limited;

    if (!message) {
      return NextResponse.json({ ok: false, error: "متن پیام نمی‌تواند خالی باشد." }, { status: 400 });
    }

    // استفاده از روتر جدید
    const result = await routeRequest({
      message,
      userId: user?.id,
      isAdmin,
      adminRole: isAdmin ? user?.role : undefined,
      sessionId: /^[a-zA-Z0-9_-]{16,100}$/.test(req.headers.get("x-session-id") || "") ? req.headers.get("x-session-id")! : `request-${crypto.randomUUID()}`,
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
      totalLatencyMs: result.totalLatencyMs,
      source: result.source,
      attachments: result.attachments,
    });
  } catch (error) {
    console.error("[ASSISTANT_ROUTER]", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور" }, { status: 500 });
  }
}
