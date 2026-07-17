import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const data = await db.select().from(brands).orderBy(asc(brands.name));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "نام برند الزامی است" }, { status: 400 });
  const slug = name.replace(/\s+/g, "-").toLowerCase();
  const [created] = await db.insert(brands).values({ name, slug }).returning();
  return NextResponse.json({ ok: true, brand: created });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "شناسه برند الزامی است" }, { status: 400 });
  await db.delete(brands).where(eq(brands.id, id));
  return NextResponse.json({ ok: true, message: "برند حذف شد" });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const body = await req.json();
  const id = Number(body?.id);
  const name = String(body?.name || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "شناسه برند الزامی است" }, { status: 400 });
  if (!name) return NextResponse.json({ ok: false, error: "نام برند الزامی است" }, { status: 400 });
  const slug = name.replace(/\s+/g, "-").toLowerCase();
  const [updated] = await db.update(brands).set({ name, slug, updatedAt: new Date() }).where(eq(brands.id, id)).returning();
  return NextResponse.json({ ok: true, brand: updated });
}