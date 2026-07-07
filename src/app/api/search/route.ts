import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, productVariants } from "@/db/schema";
import { eq, and, or, sql, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const cat = req.nextUrl.searchParams.get("cat")?.trim() ?? "";

  if (!cat && q.length < 2) {
    return NextResponse.json([]);
  }

  const clauses = [eq(products.isActive, true)];

  if (cat) {
    clauses.push(sql`${categories.slug} = ${cat}`);
  }

  if (q.length >= 2) {
    clauses.push(
      or(
        sql`lower(${products.title}) like lower(${`%${q}%`})`,
        sql`lower(${products.subtitle}) like lower(${`%${q}%`})`,
      )!,
    );
  }

  const data = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      categoryTitle: categories.title,
      minPrice: sql<string>`coalesce(min(${productVariants.price}), '0')`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(...clauses))
    .groupBy(products.id, categories.title)
    .orderBy(asc(products.sortOrder))
    .limit(10);

  return NextResponse.json(data);
}
