import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return NextResponse.json({ ok: false, error: "product not found" }, { status: 404 });

  const variants = await db.select({
    id: productVariants.id, name: productVariants.name, price: productVariants.price,
    stock: productVariants.stock, sku: productVariants.sku,
  }).from(productVariants)
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder));

  return NextResponse.json({ ok: true, variants });
}
