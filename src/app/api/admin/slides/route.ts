import { NextResponse } from "next/server";
import { db } from "@/db";
import { landingSlides } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(landingSlides).orderBy(asc(landingSlides.sortOrder));
  return NextResponse.json(data);
}
