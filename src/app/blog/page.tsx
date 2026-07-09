import Link from "next/link";
import { db } from "@/db";
import { blogPosts, blogCategories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Eye, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await db.select({
    id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
    excerpt: blogPosts.excerpt, featuredImage: blogPosts.featuredImage,
    publishedAt: blogPosts.publishedAt, views: blogPosts.views,
    categoryName: blogCategories.name,
  }).from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        <h1 className="text-gradient-navy py-1 text-3xl font-black leading-[1.35] sm:text-5xl mb-8">وبلاگ درنیکا ساحل</h1>

        {posts.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center">
            <p className="text-charcoal-500">هنوز مقاله‌ای منتشر نشده است.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="card group overflow-hidden rounded-[1.75rem] transition-all hover:shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-navy-900/5 to-petrol-100">
                  {post.featuredImage ? <img src={post.featuredImage} alt={post.title} className="size-full object-cover" /> : <div className="flex h-full items-center justify-center text-navy-700/30 text-lg font-bold">📄</div>}
                </div>
                <div className="p-5">
                  {post.categoryName && <span className="rounded-full bg-petrol-600/10 px-2.5 py-0.5 text-[10px] font-medium text-petrol-700">{post.categoryName}</span>}
                  <h2 className="mt-2 text-sm font-bold leading-6 text-navy-900 group-hover:text-petrol-700 line-clamp-2">{post.title}</h2>
                  {post.excerpt && <p className="mt-1 text-xs text-charcoal-500 line-clamp-2">{post.excerpt}</p>}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-charcoal-500">
                    <span className="flex items-center gap-1"><Eye className="size-3" />{post.views}</span>
                    <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("fa-IR") : ""}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
