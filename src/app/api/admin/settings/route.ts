import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(siteSettings).orderBy(asc(siteSettings.key));
  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const key = String(body.key || "").trim();
    const value = body.value;
    const group = String(body.group || "site").trim();
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    await db.insert(siteSettings).values({ key, value, group, locale: "fa" })
      .onConflictDoUpdate({ target: [siteSettings.key, siteSettings.locale], set: { value, group } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
