import type { MetadataRoute } from "next";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getShopProducts, getAllCategories } from "@/lib/shop";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // صفحات ثابت
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // محصولات
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const result = await getShopProducts({ limit: 1000 });
    productRoutes = result.data.map((p) => ({
      url: `${SITE_URL}/shop/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch { /* بی‌خیال */ }

  // دسته‌بندی‌ها (به صورت فیلتر فروشگاه)
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const cats = await getAllCategories();
    categoryRoutes = cats.map((c) => ({
      url: `${SITE_URL}/shop?category=${encodeURIComponent(c.slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch { /* بی‌خیال */ }

  // پست‌های بلاگ منتشرشده
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"));
    blogRoutes = posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch { /* بی‌خیال */ }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...blogRoutes];
}
