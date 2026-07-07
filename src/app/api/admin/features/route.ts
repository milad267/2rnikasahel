import { NextResponse } from "next/server";
import { db } from "@/db";
import { landingFeatures } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(landingFeatures).orderBy(asc(landingFeatures.sortOrder));
  return NextResponse.json(data);
}
