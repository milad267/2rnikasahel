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
  return NextResponse.json(data);
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
