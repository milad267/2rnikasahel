import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { landingSlides } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/** GET: دریافت همه اسلایدهای لندینگ */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const data = await db.select().from(landingSlides).orderBy(asc(landingSlides.sortOrder));
  return NextResponse.json({ ok: true, data });
}

/** POST: ایجاد اسلاید لندینگ جدید */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const [created] = await db.insert(landingSlides).values({
      badge: body.badge || null,
      title: body.title || "بدون عنوان",
      subtitle: body.subtitle || null,
      ctaText: body.ctaText || null,
      ctaHref: body.ctaHref || null,
      cta2Text: body.cta2Text || null,
      cta2Href: body.cta2Href || null,
      accentColor: body.accentColor || null,
      image: body.image || null,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder || 0,
    }).returning();
    return NextResponse.json({ ok: true, slide: created });
  } catch (error) {
    return safeErrorResponse(error, "landing-slides-create");
  }
}

/** PUT: ویرایش اسلاید لندینگ */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ ok: false, error: "شناسه اسلاید الزامی است" }, { status: 400 });
    }
    const [updated] = await db.update(landingSlides).set({
      ...(body.badge !== undefined && { badge: body.badge }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
      ...(body.ctaText !== undefined && { ctaText: body.ctaText }),
      ...(body.ctaHref !== undefined && { ctaHref: body.ctaHref }),
      ...(body.cta2Text !== undefined && { cta2Text: body.cta2Text }),
      ...(body.cta2Href !== undefined && { cta2Href: body.cta2Href }),
      ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
      ...(body.image !== undefined && { image: body.image }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    }).where(eq(landingSlides.id, Number(body.id))).returning();
    return NextResponse.json({ ok: true, slide: updated });
  } catch (error) {
    return safeErrorResponse(error, "landing-slides-update");
  }
}

/** DELETE: حذف اسلاید لندینگ */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "شناسه اسلاید الزامی است" }, { status: 400 });
    }
    await db.delete(landingSlides).where(eq(landingSlides.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "landing-slides-delete");
  }
}
