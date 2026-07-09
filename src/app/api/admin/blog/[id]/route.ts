import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts, blogPostTags, tags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { syncBlogTags } from "../tags-util";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, Number(id)));
  if (!post) return NextResponse.json({ ok: false, error: "پست یافت نشد" }, { status: 404 });

  // بارگذاری تگ‌های مرتبط
  const rel = await db.select({ name: tags.name }).from(blogPostTags)
    .leftJoin(tags, eq(blogPostTags.tagId, tags.id))
    .where(eq(blogPostTags.postId, Number(id)));
  const tagNames = rel.map(r => r.name).filter(Boolean);

  return NextResponse.json({ ok: true, data: { ...post, tags: tagNames } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db.update(blogPosts).set({
    ...(body.title && { title: body.title }), ...(body.slug && { slug: body.slug }),
    ...(body.excerpt !== undefined && { excerpt: body.excerpt }), ...(body.content !== undefined && { content: body.content }),
    ...(body.featuredImage !== undefined && { featuredImage: body.featuredImage }),
    ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
    ...(body.status && { status: body.status }), ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
    ...(body.metaDesc !== undefined && { metaDesc: body.metaDesc }),
    ...(body.allowComments !== undefined && { allowComments: body.allowComments }),
    updatedAt: new Date(),
  }).where(eq(blogPosts.id, Number(id))).returning();

  if (Array.isArray(body.tags)) await syncBlogTags(Number(id), body.tags);

  return NextResponse.json({ ok: true, post: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  await db.delete(blogPosts).where(eq(blogPosts.id, Number(id)));
  return NextResponse.json({ ok: true });
}
