import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db
    .select({
      id: products.id, title: products.title, slug: products.slug, coverImage: products.coverImage,
      isActive: products.isActive, categoryId: products.categoryId,
      categoryTitle: categories.title,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.sortOrder));
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { title, slug, price, stock, categoryId, isActive, isFeatured, sortOrder, sku, coverImage, images } = body;
    if (!title) return NextResponse.json({ ok: false, error: "نام محصول الزامی است" }, { status: 400 });

    const [created] = await db.insert(products).values({
      title, slug: slug || title.replace(/\s+/g, "-").toLowerCase(),
      categoryId: categoryId || null, isActive: isActive !== false, sortOrder: sortOrder || 0,
      description: body.fullDesc || null, subtitle: body.shortDesc || null,
      coverImage: coverImage || null,
      images: images?.length ? images : [],
    }).returning();

    return NextResponse.json({ ok: true, product: created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
