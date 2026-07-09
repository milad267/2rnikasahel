import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, any> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.parentId !== undefined) updates.parentId = body.parentId || null;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.image !== undefined) updates.image = body.image || null;

  const [updated] = await db.update(categories).set(updates).where(eq(categories.id, Number(id))).returning();
  return NextResponse.json({ ok: true, category: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  // زیردسته‌ها رو به والد منتقل می‌کنه
  const [cat] = await db.select({ parentId: categories.parentId }).from(categories).where(eq(categories.id, Number(id))).limit(1);
  if (cat) {
    await db.update(categories).set({ parentId: cat.parentId }).where(eq(categories.parentId, Number(id)));
  }
  await db.delete(categories).where(eq(categories.id, Number(id)));
  return NextResponse.json({ ok: true });
}
