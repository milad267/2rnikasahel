import { NextResponse } from "next/server";
import { db } from "@/db";
import { units } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(units).orderBy(asc(units.sortOrder));
  return NextResponse.json(data);
}
