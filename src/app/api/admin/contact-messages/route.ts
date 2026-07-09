import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const status = req.nextUrl.searchParams.get("status") || "";
  const search = req.nextUrl.searchParams.get("search") || "";
  const type = req.nextUrl.searchParams.get("type") || "";
  const clauses = [];
  if (status) clauses.push(eq(contactMessages.status, status));
  if (type) clauses.push(eq(contactMessages.type, type));
  if (search) clauses.push(or(like(contactMessages.name, `%${search}%`), like(contactMessages.message, `%${search}%`)));
  const data = await db.select().from(contactMessages)
    .where(clauses.length > 0 ? and(...clauses) : undefined)
    .orderBy(desc(contactMessages.createdAt));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.message) return NextResponse.json({ ok: false, error: "نام و پیام الزامی است" }, { status: 400 });
  const [created] = await db.insert(contactMessages).values({
    name: body.name, email: body.email, phone: body.phone, subject: body.subject,
    message: body.message, type: body.type || "contact",
  }).returning();
  return NextResponse.json({ ok: true, message: created });
}
