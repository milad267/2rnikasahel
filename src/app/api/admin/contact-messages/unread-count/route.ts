import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin(); if (auth.response) return auth.response;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(eq(contactMessages.status, "unread"));
  return NextResponse.json({ count });
}
