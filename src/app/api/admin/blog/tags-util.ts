import { db } from "@/db";
import { tags, blogPostTags } from "@/db/schema";
import { eq } from "drizzle-orm";

/** ساخت slug امن از نام تگ (فارسی/انگلیسی) */
function tagSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^آ-یa-z0-9-]/gi, "")
    .slice(0, 100) || `tag-${Date.now()}`;
}

/**
 * تگ‌های یک پست بلاگ را همگام می‌کند:
 * - تگ‌های جدید را در جدول tags می‌سازد (در صورت نبودن)
 * - رابطه‌ی پست را در blog_post_tags بازسازی می‌کند
 */
export async function syncBlogTags(postId: number, tagNames: string[]) {
  const names = Array.from(
    new Set(tagNames.map((t) => (t || "").trim()).filter(Boolean))
  );

  // پاک‌سازی روابط قبلی
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
  if (names.length === 0) return;

  const tagIds: number[] = [];
  for (const name of names) {
    const slug = tagSlug(name);
    // آیا تگ از قبل هست؟
    const [existing] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    if (existing) {
      tagIds.push(existing.id);
    } else {
      const [created] = await db.insert(tags).values({ name, slug }).returning();
      tagIds.push(created.id);
    }
  }

  // ساخت روابط جدید
  await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ postId, tagId })));
}
