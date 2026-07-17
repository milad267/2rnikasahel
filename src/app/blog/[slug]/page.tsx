import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { blogPosts, blogCategories, blogPostTags, tags, users } from "@/db/schema";
import { eq, and, desc, asc, sql, ne, or, lt, gt } from "drizzle-orm";
import { ChevronLeft, Eye, Calendar, Clock, User, ArrowRight, ArrowLeft, Tag, BookOpen, ChevronUp } from "lucide-react";
import { SITE_NAME, absoluteUrl, truncate, stripHtml } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";
import { BlogProgressBar } from "@/components/blog/BlogProgressBar";
import { BlogShareButtons } from "@/components/blog/BlogShareButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const [post] = await db.select({
    title: blogPosts.title,
    slug: blogPosts.slug,
    excerpt: blogPosts.excerpt,
    content: blogPosts.content,
    featuredImage: blogPosts.featuredImage,
    metaTitle: blogPosts.metaTitle,
    publishedAt: blogPosts.publishedAt,
  }).from(blogPosts)
    .where(and(eq(blogPosts.slug, decodedSlug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) {
    return { title: "مطلب یافت نشد" };
  }

  const title = post.metaTitle || post.title;
  const description = truncate(post.excerpt || stripHtml(post.content) || `${post.title} — وبلاگ ${SITE_NAME}`, 160);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.featuredImage ? absoluteUrl(post.featuredImage) : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fa_IR",
      ...(post.publishedAt ? { publishedTime: new Date(post.publishedAt).toISOString() } : {}),
      ...(image ? { images: [{ url: image, alt: post.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// استخراج هدینگ‌ها از HTML برای فهرست مطالب
function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /<h([23])(?:\s+[^>]*)?>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = stripHtml(match[2])?.trim() || "";
    if (text) {
      const id = text.replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF\s-]/g, "").toLowerCase();
      headings.push({ id, text, level: Number(match[1]) });
    }
  }
  return headings;
}

// افزودن id به هدینگ‌های HTML برای anchor
function addHeadingIds(html: string): string {
  return html.replace(/<h([23])(\s[^>]*)?>(.*?)<\/h\1>/gi, (_, level, attrs, content) => {
    const text = stripHtml(content)?.trim() || "";
    const id = text.replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF\s-]/g, "").toLowerCase();
    return `<h${level}${attrs || ""} id="${id}">${content}</h${level}>`;
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // دریافت پست
  const [post] = await db.select({
    id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
    excerpt: blogPosts.excerpt, content: blogPosts.content,
    featuredImage: blogPosts.featuredImage,
    publishedAt: blogPosts.publishedAt, views: blogPosts.views,
    categoryId: blogPosts.categoryId, authorId: blogPosts.authorId,
    createdAt: blogPosts.createdAt,
  }).from(blogPosts)
    .where(and(eq(blogPosts.slug, decodedSlug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) notFound();

  // افزایش بازدید
  await db.update(blogPosts).set({ views: sql`${blogPosts.views} + 1` }).where(eq(blogPosts.id, post.id));

  // دریافت دسته‌بندی
  let categoryName: string | null = null;
  let categorySlug: string | null = null;
  try {
    const [cat] = await db.select({ name: blogCategories.name, slug: blogCategories.slug }).from(blogCategories)
      .where(eq(blogCategories.id, post.categoryId ?? -1))
      .limit(1);
    categoryName = cat?.name ?? null;
    categorySlug = cat?.slug ?? null;
  } catch { /* ignore */ }

  // دریافت نویسنده
  let authorName: string | null = null;
  try {
    if (post.authorId) {
      const [author] = await db.select({ name: users.name }).from(users)
        .where(eq(users.id, post.authorId))
        .limit(1);
      authorName = author?.name ?? null;
    }
  } catch { /* ignore */ }

  // دریافت تگ‌ها
  let postTags: { id: number; name: string; slug: string }[] = [];
  try {
    const tagRows = await db.select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(blogPostTags)
      .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
      .where(eq(blogPostTags.postId, post.id));
    postTags = tagRows;
  } catch { /* ignore */ }

  // پست‌های مرتبط (هم‌دسته)
  let relatedPosts: { id: number; title: string; slug: string; featuredImage: string | null; publishedAt: Date | null; views: number; excerpt: string | null }[] = [];
  try {
    relatedPosts = await db.select({
      id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
      featuredImage: blogPosts.featuredImage, publishedAt: blogPosts.publishedAt,
      views: blogPosts.views, excerpt: blogPosts.excerpt,
    }).from(blogPosts)
      .where(and(
        eq(blogPosts.categoryId, post.categoryId ?? -1),
        ne(blogPosts.id, post.id),
        eq(blogPosts.status, "published"),
      ))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(3);
  } catch { /* ignore */ }

  // پست قبلی و بعدی
  let prevPost: { slug: string; title: string } | null = null;
  let nextPost: { slug: string; title: string } | null = null;
  try {
    const pubDate = post.publishedAt || post.createdAt || new Date();
    const [prev] = await db.select({ slug: blogPosts.slug, title: blogPosts.title }).from(blogPosts)
      .where(and(
        lt(blogPosts.publishedAt, pubDate),
        eq(blogPosts.status, "published"),
      ))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(1);
    prevPost = prev || null;

    const [next] = await db.select({ slug: blogPosts.slug, title: blogPosts.title }).from(blogPosts)
      .where(and(
        gt(blogPosts.publishedAt, pubDate),
        eq(blogPosts.status, "published"),
      ))
      .orderBy(asc(blogPosts.publishedAt))
      .limit(1);
    nextPost = next || null;
  } catch { /* ignore */ }

  // محاسبه زمان مطالعه
  const wordCount = stripHtml(post.content || "").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 250));

  // استخراج هدینگ‌ها برای فهرست مطالب
  const headings = extractHeadings(post.content || "");
  const hasToc = headings.length >= 2;

  // افزودن id به هدینگ‌های HTML
  const contentHtml = addHeadingIds(post.content || "");

  // اعتبارسنجی URL تصویر شاخص
  const safeFeaturedImage = post.featuredImage && (
    post.featuredImage.startsWith("/") ||
    post.featuredImage.startsWith("https://") ||
    post.featuredImage.startsWith("http://localhost")
  ) ? post.featuredImage : null;

  const pageUrl = absoluteUrl(`/blog/${post.slug}`);

  return (
    <>
      <BlogProgressBar />

      {/* ========== هیرو ========== */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-petrol-950 pt-24">
        {/* پس‌زمینه تصویر */}
        {safeFeaturedImage && (
          <div className="absolute inset-0">
            <img src={safeFeaturedImage} alt="" className="size-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-900/80 to-navy-950/95" />
          </div>
        )}
        {/* گرید تزئینی */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* گرادینت نرم */}
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-petrol-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-petrol-600/5 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-32 sm:px-6 lg:py-40">
          {/* مسیر ناوبری */}
          <nav className="flex items-center gap-2 text-xs text-pearl-300/70 mb-8">
            <Link href="/" className="transition-colors hover:text-pearl-100">خانه</Link>
            <ChevronLeft className="size-3" />
            <Link href="/blog" className="transition-colors hover:text-pearl-100">وبلاگ</Link>
            {categoryName && <><ChevronLeft className="size-3" /><span className="text-pearl-200">{categoryName}</span></>}
          </nav>

          {/* برچسب دسته‌بندی */}
          {categoryName && (
            <Link
              href={`/blog?cat=${categorySlug || ""}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-petrol-500/20 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-medium text-petrol-300 border border-petrol-400/20 mb-5 transition-colors hover:bg-petrol-500/30"
            >
              {categoryName}
            </Link>
          )}

          {/* عنوان */}
          <h1 className="text-3xl font-black text-pearl-50 sm:text-4xl lg:text-5xl leading-tight drop-shadow-lg">
            {post.title}
          </h1>

          {/* خلاصه */}
          {post.excerpt && (
            <p className="mt-5 text-base leading-7 text-pearl-200/80 max-w-2xl">
              {post.excerpt}
            </p>
          )}

          {/* نوار متادیتا */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-pearl-300/60">
            {authorName && (
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" strokeWidth={1.6} />
                {authorName}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" strokeWidth={1.6} />
                {new Date(post.publishedAt).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={1.6} />
              {readingTime} دقیقه مطالعه
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5" strokeWidth={1.6} />
              {post.views.toLocaleString("fa-IR")} بازدید
            </span>
          </div>
        </div>
      </section>

      {/* ========== محتوای اصلی ========== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          {/* ===== سایدبار دسکتاپ: فهرست مطالب ===== */}
          {hasToc && (
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-28">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-navy-900">
                  <BookOpen className="size-4 text-petrol-600" strokeWidth={1.7} />
                  فهرست مطالب
                </div>
                <nav className="space-y-1 border-r-2 border-petrol-100 pr-3">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block text-xs leading-relaxed text-charcoal-500 transition-colors hover:text-petrol-700 ${
                        h.level === 2 ? "font-medium" : "pr-3 text-[11px]"
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* ===== ستون اصلی ===== */}
          <article className="flex-1 min-w-0 max-w-4xl">
            {/* محتوای بلاگ */}
            <div
              className="blog-content prose prose-lg max-w-none rtl leading-8 text-charcoal-700"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }}
            />

            {/* تگ‌ها */}
            {postTags.length > 0 && (
              <div className="mt-10 pt-8 border-t border-navy-900/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="size-4 text-charcoal-400" strokeWidth={1.6} />
                  {postTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-navy-900/5 px-3 py-1 text-[11px] text-charcoal-600 hover:bg-petrol-50 hover:text-petrol-700 transition-colors"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* اشتراک‌گذاری */}
            <div className="mt-6 pt-6 border-t border-navy-900/10">
              <BlogShareButtons title={post.title} url={pageUrl} />
            </div>

            {/* ناوبری پست قبلی/بعدی */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-navy-900/10 bg-white p-4 transition-all hover:border-petrol-300 hover:shadow-md"
                >
                  <ArrowRight className="size-5 shrink-0 text-petrol-600 transition-transform group-hover:-translate-x-1" strokeWidth={1.6} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-charcoal-400">مطلب بعدی</p>
                    <p className="text-xs font-medium text-navy-900 truncate">{nextPost.title}</p>
                  </div>
                </Link>
              ) : <div />}
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-navy-900/10 bg-white p-4 transition-all hover:border-petrol-300 hover:shadow-md sm:text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-charcoal-400">مطلب قبلی</p>
                    <p className="text-xs font-medium text-navy-900 truncate">{prevPost.title}</p>
                  </div>
                  <ArrowLeft className="size-5 shrink-0 text-petrol-600 transition-transform group-hover:translate-x-1" strokeWidth={1.6} />
                </Link>
              ) : <div />}
            </div>
          </article>
        </div>
      </div>

      {/* ========== پست‌های مرتبط ========== */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-navy-900/10 bg-navy-900/[0.02]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 rounded-2xl bg-petrol-600/10 flex items-center justify-center">
                <BookOpen className="size-5 text-petrol-600" strokeWidth={1.6} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy-900">مطالب مرتبط</h2>
                <p className="text-xs text-charcoal-500">ممکن است از این مطالب خوشتان بیاید</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.slug}`}
                  className="group card overflow-hidden rounded-[1.75rem] border border-navy-900/10 bg-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="aspect-video bg-gradient-to-br from-navy-900/5 to-petrol-100 overflow-hidden">
                    {rp.featuredImage ? (
                      <img src={rp.featuredImage} alt={rp.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-navy-700/20 text-3xl font-bold">📄</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-bold leading-6 text-navy-900 group-hover:text-petrol-700 line-clamp-2 transition-colors">
                      {rp.title}
                    </h3>
                    {rp.excerpt && (
                      <p className="mt-1 text-xs text-charcoal-500 line-clamp-2">{rp.excerpt}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-[10px] text-charcoal-400">
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" strokeWidth={1.5} />
                        {rp.views.toLocaleString("fa-IR")}
                      </span>
                      {rp.publishedAt && (
                        <span>{new Date(rp.publishedAt).toLocaleDateString("fa-IR")}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== دکمه بازگشت به بالا ========== */}
      <div className="fixed bottom-8 left-8 z-40">
        <a
          href="#top"
          className="flex items-center justify-center size-11 rounded-2xl bg-petrol-600 text-pearl-50 shadow-lg transition-all hover:bg-petrol-700 hover:shadow-xl hover:-translate-y-1"
        >
          <ChevronUp className="size-5" strokeWidth={2} />
        </a>
      </div>
    </>
  );
}
