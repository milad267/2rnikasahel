import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db.update(contactMessages).set({
    status: body.status || "read",
    ...(body.status === "replied" && { repliedAt: new Date() }),
  }).where(eq(contactMessages.id, Number(id))).returning();
  return NextResponse.json({ ok: true, message: updated });
}
