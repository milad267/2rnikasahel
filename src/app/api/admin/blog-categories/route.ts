import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogCategories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(blogCategories).orderBy(asc(blogCategories.name));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ ok: false, error: "نام الزامی است" }, { status: 400 });
  const [created] = await db.insert(blogCategories).values({ name: body.name, slug: body.slug || body.name.replace(/\s+/g, "-").toLowerCase() }).returning();
  return NextResponse.json({ ok: true, category: created });
}
