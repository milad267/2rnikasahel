import { NextResponse } from "next/server";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** دریافت لیست همه برندها (عمومی) */
export async function GET() {
  try {
    const data = await db.select().from(brands).orderBy(asc(brands.name));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "خطا در دریافت برندها" },
      { status: 500 },
    );
  }
}
