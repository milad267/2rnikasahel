import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { db } from "@/db";
import { landingFeatures } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin(); if (auth.response) return auth.response;
  const data = await db.select().from(landingFeatures).orderBy(asc(landingFeatures.sortOrder));
  return NextResponse.json(data);
}
