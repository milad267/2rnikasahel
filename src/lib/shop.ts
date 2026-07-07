import { db } from "@/db";
import { products, productVariants, categories, units } from "@/db/schema";
import { eq, and, ilike, or, asc, count, sql } from "drizzle-orm";

export type ShopProduct = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  categoryTitle: string | null;
  categorySlug: string | null;
  minPrice: string;
  variantCount: number;
};

export type ShopFilters = {
  categorySlug?: string;
  search?: string;
};

export async function getShopProducts(filters?: ShopFilters): Promise<ShopProduct[]> {
  const whereClauses = [eq(products.isActive, true)];

  if (filters?.categorySlug) {
    whereClauses.push(sql`${categories.slug} = ${filters.categorySlug}`);
  }

  if (filters?.search) {
    whereClauses.push(
      or(
        sql`lower(${products.title}) like lower(${`%${filters.search}%`})`,
        sql`lower(${products.subtitle}) like lower(${`%${filters.search}%`})`,
      )!,
    );
  }

  const data = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      subtitle: products.subtitle,
      coverImage: products.coverImage,
      categoryTitle: categories.title,
      categorySlug: categories.slug,
      minPrice: sql<string>`min(${productVariants.price})::text`,
      variantCount: count(productVariants.id),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(...whereClauses))
    .groupBy(products.id, categories.title, categories.slug)
    .orderBy(asc(products.sortOrder));

  return data;
}

export async function getProductBySlug(slug: string) {
  const [product] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      subtitle: products.subtitle,
      description: products.description,
      coverImage: products.coverImage,
      images: products.images,
      categoryTitle: categories.title,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  if (!product) return null;

  const variants = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      name: productVariants.name,
      nameEn: productVariants.nameEn,
      price: productVariants.price,
      unitValue: productVariants.unitValue,
      stock: productVariants.stock,
      specSheet: productVariants.specSheet,
      unitName: units.name,
      unitSymbol: units.symbol,
    })
    .from(productVariants)
    .leftJoin(units, eq(productVariants.unitId, units.id))
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder));

  return { ...product, variants };
}

export async function getAllCategories() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      title: categories.title,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
}
