import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instagramPosts, products } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/** دریافت لیست پست‌ها با فیلتر وضعیت */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const accountId = searchParams.get("accountId");

    let conditions = [];

    if (status) conditions.push(eq(instagramPosts.status, status));
    if (accountId) conditions.push(eq(instagramPosts.accountId, Number(accountId)));

    const query = db
      .select({
        post: instagramPosts,
        product: {
          id: products.id,
          title: products.title,
          slug: products.slug,
          coverImage: products.coverImage,
        },
      })
      .from(instagramPosts)
      .leftJoin(products, eq(instagramPosts.productId, products.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(instagramPosts.createdAt));

    const results = await query;

    const data = results.map((r) => ({
      ...r.post,
      product: r.product,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return safeErrorResponse(error, "instagram-posts-list");
  }
}

/** ایجاد پست جدید */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { accountId, productId, mediaType, caption, hashtags, mediaPaths, status, scheduledAt } = body;

    if (!accountId) {
      return NextResponse.json(
        { ok: false, error: "لطفاً اکانت اینستاگرام را انتخاب کنید" },
        { status: 400 },
      );
    }

    const [newPost] = await db
      .insert(instagramPosts)
      .values({
        accountId,
        productId: productId || null,
        mediaType: mediaType || "image",
        caption: caption || "",
        hashtags: hashtags || "",
        mediaPaths: mediaPaths || [],
        status: status || "draft",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      })
      .returning();

    return NextResponse.json({ ok: true, data: newPost }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "instagram-posts-create");
  }
}

/** ویرایش پست */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه پست الزامی است" },
        { status: 400 },
      );
    }

    const updateData: Record<string, any> = {};

    if (fields.accountId !== undefined) updateData.accountId = fields.accountId;
    if (fields.productId !== undefined) updateData.productId = fields.productId;
    if (fields.mediaType !== undefined) updateData.mediaType = fields.mediaType;
    if (fields.caption !== undefined) updateData.caption = fields.caption;
    if (fields.hashtags !== undefined) updateData.hashtags = fields.hashtags;
    if (fields.mediaPaths !== undefined) updateData.mediaPaths = fields.mediaPaths;
    if (fields.status !== undefined) updateData.status = fields.status;
    if (fields.scheduledAt !== undefined) updateData.scheduledAt = fields.scheduledAt ? new Date(fields.scheduledAt) : null;
    if (fields.instagramPostId !== undefined) updateData.instagramPostId = fields.instagramPostId;
    if (fields.instagramPermalink !== undefined) updateData.instagramPermalink = fields.instagramPermalink;
    if (fields.errorMessage !== undefined) updateData.errorMessage = fields.errorMessage;

    const [updated] = await db
      .update(instagramPosts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(instagramPosts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "پست یافت نشد" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return safeErrorResponse(error, "instagram-posts-update");
  }
}

/** حذف پست */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه پست الزامی است" },
        { status: 400 },
      );
    }

    await db.delete(instagramPosts).where(eq(instagramPosts.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "instagram-posts-delete");
  }
}
