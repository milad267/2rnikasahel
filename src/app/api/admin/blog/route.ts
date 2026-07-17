import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts, blogCategories } from "@/db/schema";
import { eq, and, or, like, asc, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { syncBlogTags } from "./tags-util";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const search = req.nextUrl.searchParams.get("search") || "";
  const category = req.nextUrl.searchParams.get("category") || "";
  const status = req.nextUrl.searchParams.get("status") || "";
  const page = Number(req.nextUrl.searchParams.get("page")) || 1;
  const limit = 20;

  const clauses = [];
  if (search) clauses.push(or(like(blogPosts.title, `%${search}%`), like(blogPosts.content || sql`''`, `%${search}%`)));
  if (category) clauses.push(eq(blogPosts.categoryId, Number(category)));
  if (status) clauses.push(eq(blogPosts.status, status));

  const data = await db.select({
    id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, status: blogPosts.status,
    featuredImage: blogPosts.featuredImage, views: blogPosts.views, publishedAt: blogPosts.publishedAt,
    createdAt: blogPosts.createdAt, categoryName: blogCategories.name,
  }).from(blogPosts).leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(clauses.length > 0 ? and(...clauses) : undefined)
    .orderBy(desc(blogPosts.createdAt)).limit(limit).offset((page - 1) * limit);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(blogPosts).where(clauses.length > 0 ? and(...clauses) : undefined);
  return NextResponse.json({ ok: true, data, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.title) return NextResponse.json({ ok: false, error: "عنوان الزامی است" }, { status: 400 });
  const isVideo = !!body.videoUrl;
  // اگر featuredImage رشته خالی باشه، null ذخیره کن
  const featImg = isVideo ? body.videoUrl : (body.featuredImage?.trim() || null);
  const isPublishing = body.status === "published";
  const [created] = await db.insert(blogPosts).values({
    title: body.title, slug: body.slug || body.title.replace(/\s+/g, "-").toLowerCase(),
    excerpt: body.excerpt, content: body.content,
    featuredImage: featImg,
    mediaType: isVideo ? "video" : (featImg ? "image" : "none"),
    categoryId: body.categoryId || null, authorId: user.id,
    status: body.status || "draft",
    publishedAt: isPublishing ? new Date() : null,
    metaTitle: body.metaTitle, metaDesc: body.metaDesc,
    allowComments: body.allowComments !== false,
  }).returning();

  if (Array.isArray(body.tags) && body.tags.length > 0) await syncBlogTags(created.id, body.tags);

  return NextResponse.json({ ok: true, post: created });
}
