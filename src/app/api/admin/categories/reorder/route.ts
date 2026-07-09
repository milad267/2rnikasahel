import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const body = await req.json();
  const items = body.items || [];
  for (const item of items) {
    await db.update(categories).set({ sortOrder: item.sortOrder }).where(eq(categories.id, item.id));
  }
  return NextResponse.json({ ok: true });
}
