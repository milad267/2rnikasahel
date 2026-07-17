import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { units } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const data = await db.select().from(units).orderBy(asc(units.sortOrder));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const symbol = body.symbol ? String(body.symbol).trim() : null;
    if (!name) return NextResponse.json({ ok: false, error: "نام واحد الزامی است" }, { status: 400 });

    // slug یکتا از روی نام (fallback به زمان)
    const baseSlug = name.replace(/\s+/g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase() || `unit-${Date.now()}`;

    // اگر واحدی با همین نام موجود بود، همان را برگردان
    const existing = await db.select().from(units).where(eq(units.name, name)).limit(1);
    if (existing.length) return NextResponse.json({ ok: true, unit: existing[0] });

    // بیشترین sortOrder فعلی
    const all = await db.select().from(units).orderBy(asc(units.sortOrder));
    const nextSort = (all[all.length - 1]?.sortOrder ?? 0) + 1;

    let slug = baseSlug;
    if (all.some(u => u.slug === slug)) slug = `${baseSlug}-${Date.now()}`;

    const [created] = await db.insert(units).values({
      slug, name, symbol, category: "general", isActive: true, sortOrder: nextSort,
    }).returning();

    return NextResponse.json({ ok: true, unit: created });
  } catch (error) {
    return safeErrorResponse(error, "units-create");
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "شناسه واحد الزامی است" }, { status: 400 });
  await db.delete(units).where(eq(units.id, id));
  return NextResponse.json({ ok: true, message: "واحد حذف شد" });
}