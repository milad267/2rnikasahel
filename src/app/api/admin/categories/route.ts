import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const body = await req.json();
  const title = String(body?.title || "").trim();
  if (!title) return NextResponse.json({ ok: false, error: "عنوان الزامی است" }, { status: 400 });
  const slug = body.slug || title.replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase();
  const [created] = await db.insert(categories).values({
    title, slug,
    image: body.image || null,
    description: body.description || null,
    parentId: body.parentId != null && body.parentId > 0 ? body.parentId : null,
    sortOrder: body.sortOrder || 0,
    isActive: body.isActive !== false,
  }).returning();
  return NextResponse.json({ ok: true, category: created });
}
