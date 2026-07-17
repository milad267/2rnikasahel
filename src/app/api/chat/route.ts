import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { safeChatAttachments, safeExtractedProducts, enforceRateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat - دریافت تاریخچه چت کاربر جاری
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "ورود الزامی است" }, { status: 401 });
  const rateLimit = enforceRateLimit(req, `chat:${user.id}`, 20, 60_000);
  if (rateLimit) return rateLimit;

  const key = `chat_history_${user.id}`;
  const [row] = await db.select({ value: siteSettings.value }).from(siteSettings)
    .where(and(eq(siteSettings.key, key), eq(siteSettings.group, "chat")));

  let messages = row?.value || [];
  if (typeof messages === "string") {
    try { messages = JSON.parse(messages); } catch { messages = []; }
  }
  return NextResponse.json({
    ok: true,
    messages: Array.isArray(messages) ? messages : [],
  });
}

/**
 * POST /api/chat - ذخیره تاریخچه چت کاربر جاری
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "ورود الزامی است" }, { status: 401 });
  const rateLimit = enforceRateLimit(req, `chat-save:${user.id}`, 10, 60_000);
  if (rateLimit) return rateLimit;

  const body = await req.json().catch(() => null);
  const messages = body?.messages;

  if (!Array.isArray(messages)) {
    return NextResponse.json({ ok: false, error: "messages must be an array" }, { status: 400 });
  }

  const safeMessages = messages.slice(-50).flatMap((raw: unknown) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const content = String(item.content || "").slice(0, 8_000);
    if (!content) return [];
    return [{
      role: item.role === "user" ? "user" : "assistant",
      content,
      messageId: String(item.messageId || "").slice(0, 100) || undefined,
      attachments: safeChatAttachments(item.attachments, 10),
      products: safeExtractedProducts(item.products, 100),
    }];
  });
  const key = `chat_history_${user.id}`;
  await db.insert(siteSettings)
    .values({ key, value: safeMessages, group: "chat", locale: "fa" })
    .onConflictDoUpdate({ target: [siteSettings.key, siteSettings.locale], set: { value: safeMessages, updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
