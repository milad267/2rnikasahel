import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      isActive: products.isActive,
      categoryId: products.categoryId,
      categoryTitle: categories.title,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.sortOrder));
  return NextResponse.json(data);
}
