import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { slides } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const data = await db.select().from(slides).orderBy(asc(slides.sortOrder));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const body = await req.json();
  const [created] = await db.insert(slides).values({
    title: body.title, subtitle: body.subtitle, description: body.description,
    mediaType: body.mediaType || "image", desktopImage: body.desktopImage, mobileImage: body.mobileImage,
    buttonText: body.buttonText, buttonLink: body.buttonLink, buttonColor: body.buttonColor,
    sortOrder: body.sortOrder || 0, isActive: body.isActive !== false, openInNewTab: body.openInNewTab || false,
    startDate: body.startDate ? new Date(body.startDate) : null, endDate: body.endDate ? new Date(body.endDate) : null,
  }).returning();
  return NextResponse.json({ ok: true, slide: created });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const body = await req.json();
  const [updated] = await db.update(slides).set({
    ...(body.title !== undefined && { title: body.title }), ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
    ...(body.desktopImage !== undefined && { desktopImage: body.desktopImage }),
    ...(body.mobileImage !== undefined && { mobileImage: body.mobileImage }),
    ...(body.buttonText !== undefined && { buttonText: body.buttonText }),
    ...(body.buttonLink !== undefined && { buttonLink: body.buttonLink }),
    ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  }).where(eq(slides.id, Number(body.id))).returning();
  return NextResponse.json({ ok: true, slide: updated });
}
