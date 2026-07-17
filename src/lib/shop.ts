import { db } from "@/db";
import { products, productVariants, categories, units, brands, productTags, tags } from "@/db/schema";
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
  variantId: number | null;
};


export type ShopFilters = {
  categorySlug?: string;
  search?: string;
  excludeFeatured?: boolean;
};

export type PaginationResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getShopProducts(filters?: ShopFilters & { page?: number; limit?: number }): Promise<PaginationResult<ShopProduct>> {
  try {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const offset = (page - 1) * limit;
    const whereClauses = [eq(products.isActive, true)];
    if (filters?.categorySlug) { whereClauses.push(sql`${categories.slug} = ${filters.categorySlug}`); }
    if (filters?.search) { whereClauses.push(or(sql`lower(${products.title}) like lower(${`%${filters.search}%`})`, sql`lower(${products.subtitle}) like lower(${`%${filters.search}%`})`)!); }
    if (filters?.excludeFeatured) { whereClauses.push(sql`${products.isFeatured} = false`); }

    // گرفتن تعداد کل
    const [countResult] = await db.select({ value: count() }).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...whereClauses));
    const total = Number(countResult?.value || 0);
    const totalPages = Math.ceil(total / limit);

    const data = await db
      .select({
        id: products.id, slug: products.slug, title: products.title, subtitle: products.subtitle,
        coverImage: products.coverImage, categoryTitle: categories.title, categorySlug: categories.slug,
        minPrice: sql<string>`min(${productVariants.price})::text`,
        variantCount: count(productVariants.id), variantId: sql<number | null>`min(${productVariants.id})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(...whereClauses))
      .groupBy(products.id, categories.title, categories.slug)
      .orderBy(asc(products.sortOrder))
      .limit(limit)
      .offset(offset);

    return { data, total, page, limit, totalPages };
  } catch { return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }; }
}

export async function getProductBySlug(slug: string) {
  try {
    const [product] = await db.select({ 
      id: products.id, 
      slug: products.slug, 
      title: products.title, 
      subtitle: products.subtitle, 
      description: products.description, 
      coverImage: products.coverImage, 
      images: products.images,
      brandId: products.brandId,
      categoryTitle: categories.title, 
      categorySlug: categories.slug 
    }).from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
    
    if (!product) return null;
    
    // گرفتن برند
    let brandName: string | null = null;
    if (product.brandId) {
      const [brand] = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, product.brandId)).limit(1);
      brandName = brand?.name || null;
    }
    
    // گرفتن تگ‌ها
    const productTagsList = await db.select({ tagId: productTags.tagId }).from(productTags).where(eq(productTags.productId, product.id));
    const tagIds = productTagsList.map(pt => pt.tagId);
    let tagNames: string[] = [];
    if (tagIds.length > 0) {
      const tagsList = await db.select({ name: tags.name }).from(tags).where(sql`${tags.id} IN (${tagIds})`);
      tagNames = tagsList.map(t => t.name);
    }
    
    const variants = await db.select({ 
      id: productVariants.id, 
      sku: productVariants.sku, 
      name: productVariants.name, 
      nameEn: productVariants.nameEn, 
      price: productVariants.price, 
      unitValue: productVariants.unitValue, 
      stock: productVariants.stock, 
      specSheet: productVariants.specSheet, 
      unitName: units.name, 
      unitSymbol: units.symbol 
    }).from(productVariants)
    .leftJoin(units, eq(productVariants.unitId, units.id))
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder));
    
    return { 
      ...product, 
      brandName,
      tagNames,
      variants 
    };
  } catch { return null; }
}

export async function getFeaturedProducts(limit = 8) {
  try {
    return await db
      .select({
        id: products.id, slug: products.slug, title: products.title, subtitle: products.subtitle,
        coverImage: products.coverImage, categoryTitle: categories.title, categorySlug: categories.slug,
        minPrice: sql<string>`min(${productVariants.price})::text`,
        variantCount: count(productVariants.id), variantId: sql<number | null>`min(${productVariants.id})`,
        hasDiscount: sql<boolean>`bool_or(${productVariants.hasDiscount})`,
        discountType: sql<string | null>`min(${productVariants.discountType})`,
        discountValue: sql<string>`coalesce(min(${productVariants.discountValue})::text,'0')`,
        discountPrice: sql<string>`coalesce(min(${productVariants.discountPrice})::text,'0')`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
      .groupBy(products.id, categories.title, categories.slug)
      .orderBy(asc(products.sortOrder))
      .limit(limit);
  } catch { return []; }
}

export async function getAllCategories() {
  try {
    return await db.select({ id: categories.id, parentId: categories.parentId, slug: categories.slug, title: categories.title, description: categories.description, productCount: count(products.id) }).from(categories).leftJoin(products, eq(products.categoryId, categories.id)).where(eq(categories.isActive, true)).groupBy(categories.id, categories.parentId).orderBy(asc(categories.sortOrder));
  } catch { return []; }
}
