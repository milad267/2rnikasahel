import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instagramDmRules } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/** دریافت لیست قوانین دایرکت */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const rules = await db
      .select()
      .from(instagramDmRules)
      .orderBy(desc(instagramDmRules.priority), desc(instagramDmRules.createdAt));

    return NextResponse.json({ ok: true, data: rules });
  } catch (error) {
    return safeErrorResponse(error, "instagram-dm-rules-list");
  }
}

/** ایجاد قانون جدید */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { accountId, triggerKeywords, responseType, responseText, aiPrompt, isActive, priority } = body;

    if (!accountId || !triggerKeywords || triggerKeywords.length === 0) {
      return NextResponse.json(
        { ok: false, error: "اکانت و کلمات کلیدی الزامی است" },
        { status: 400 },
      );
    }

    const [newRule] = await db
      .insert(instagramDmRules)
      .values({
        accountId,
        triggerKeywords,
        responseType: responseType || "text",
        responseText: responseText || "",
        aiPrompt: aiPrompt || "",
        isActive: isActive !== undefined ? isActive : true,
        priority: priority || 0,
      })
      .returning();

    return NextResponse.json({ ok: true, data: newRule }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "instagram-dm-rules-create");
  }
}

/** ویرایش قانون */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه قانون الزامی است" },
        { status: 400 },
      );
    }

    const updateData: Record<string, any> = {};

    if (fields.accountId !== undefined) updateData.accountId = fields.accountId;
    if (fields.triggerKeywords !== undefined) updateData.triggerKeywords = fields.triggerKeywords;
    if (fields.responseType !== undefined) updateData.responseType = fields.responseType;
    if (fields.responseText !== undefined) updateData.responseText = fields.responseText;
    if (fields.aiPrompt !== undefined) updateData.aiPrompt = fields.aiPrompt;
    if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
    if (fields.priority !== undefined) updateData.priority = fields.priority;

    const [updated] = await db
      .update(instagramDmRules)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(instagramDmRules.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "قانون یافت نشد" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return safeErrorResponse(error, "instagram-dm-rules-update");
  }
}

/** حذف قانون */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه قانون الزامی است" },
        { status: 400 },
      );
    }

    await db.delete(instagramDmRules).where(eq(instagramDmRules.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "instagram-dm-rules-delete");
  }
}
