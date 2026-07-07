import { NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(siteSettings).orderBy(asc(siteSettings.key));
  return NextResponse.json(data);
}
