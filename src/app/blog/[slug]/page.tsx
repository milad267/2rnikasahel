import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { blogPosts, blogCategories } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ChevronLeft, Eye, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post] = await db.select({
    id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
    excerpt: blogPosts.excerpt, content: blogPosts.content,
    featuredImage: blogPosts.featuredImage,
    publishedAt: blogPosts.publishedAt, views: blogPosts.views,
    categoryName: blogCategories.name,
  }).from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) notFound();

  // افزایش بازدید
  await db.update(blogPosts).set({ views: sql`${blogPosts.views} + 1` }).where(eq(blogPosts.id, post.id));

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:pt-44">
      <article className="mx-auto max-w-4xl">
        {/* مسیر */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 mb-6">
          <Link href="/">خانه</Link>
          <ChevronLeft className="size-3" />
          <Link href="/blog">وبلاگ</Link>
          {post.categoryName && <><ChevronLeft className="size-3" /><span>{post.categoryName}</span></>}
        </div>

        {/* تصویر شاخص */}
        {post.featuredImage && (
          <div className="mb-8 overflow-hidden rounded-[2rem]">
            <img src={post.featuredImage} alt={post.title} className="w-full aspect-video object-cover" />
          </div>
        )}

        {/* عنوان */}
        <h1 className="text-3xl font-black text-navy-900 sm:text-4xl leading-tight">{post.title}</h1>

        {/* متادیتا */}
        <div className="mt-4 flex items-center gap-4 text-xs text-charcoal-500">
          {post.publishedAt && <span className="flex items-center gap-1"><Calendar className="size-3.5" />{new Date(post.publishedAt).toLocaleDateString("fa-IR")}</span>}
          <span className="flex items-center gap-1"><Eye className="size-3.5" />{post.views} بازدید</span>
        </div>

        {/* خلاصه */}
        {post.excerpt && <p className="mt-6 text-base leading-7 text-charcoal-600 border-r-4 border-petrol-500 pr-4 py-2 bg-petrol-50/50 rounded-xl">{post.excerpt}</p>}

        {/* محتوا */}
        <div className="mt-8 prose prose-lg max-w-none rtl" dir="rtl" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
      </article>
    </div>
  );
}
