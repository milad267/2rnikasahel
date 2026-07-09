import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, slug, isActive, categoryId, sortOrder, coverImage, images, subtitle, description } = body;

    const [updated] = await db.update(products).set({
      ...(title && { title }), ...(slug && { slug }),
      ...(isActive !== undefined && { isActive }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(coverImage !== undefined && { coverImage: coverImage || null }),
      ...(images !== undefined && { images }),
      ...(subtitle !== undefined && { subtitle }),
      ...(description !== undefined && { description }),
    }).where(eq(products.id, Number(id))).returning();

    return NextResponse.json({ ok: true, product: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "فقط سوپر ادمین می‌تواند حذف کند" }, { status: 403 });
  }
  try {
    const { id } = await params;
    await db.delete(products).where(eq(products.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
