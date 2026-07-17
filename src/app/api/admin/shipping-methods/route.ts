import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shippingMethods } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { safeErrorResponse } from "@/lib/safe-error";

/**
 * GET /api/admin/shipping-methods — لیست همه روش‌های ارسال
 */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(shippingMethods)
      .orderBy(asc(shippingMethods.sortOrder));
    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    return safeErrorResponse(error, "admin-shipping-methods-list");
  }
}

/**
 * POST /api/admin/shipping-methods — ایجاد روش ارسال جدید
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.title?.trim()) {
      return NextResponse.json(
        { ok: false, error: "عنوان روش ارسال الزامی است." },
        { status: 400 },
      );
    }

    const [method] = await db
      .insert(shippingMethods)
      .values({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        cost: String(Number(body.cost) || 0),
        freeThreshold: String(Number(body.freeThreshold) || 0),
        deliveryDays: body.deliveryDays?.trim() || null,
        isFree: Boolean(body.isFree),
        logo: body.logo?.trim() || null,
        trackingBaseUrl: body.trackingBaseUrl?.trim() || null,
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive !== false,
      })
      .returning();

    return NextResponse.json({ ok: true, data: method });
  } catch (error) {
    return safeErrorResponse(error, "admin-shipping-methods-create");
  }
}

/**
 * PUT /api/admin/shipping-methods — ویرایش روش ارسال
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json(
        { ok: false, error: "شناسه روش ارسال الزامی است." },
        { status: 400 },
      );
    }

    const [method] = await db
      .update(shippingMethods)
      .set({
        title: body.title?.trim(),
        description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
        cost: body.cost !== undefined ? String(Number(body.cost) || 0) : undefined,
        freeThreshold: body.freeThreshold !== undefined ? String(Number(body.freeThreshold) || 0) : undefined,
        deliveryDays: body.deliveryDays !== undefined ? (body.deliveryDays?.trim() || null) : undefined,
        isFree: body.isFree !== undefined ? Boolean(body.isFree) : undefined,
        logo: body.logo !== undefined ? (body.logo?.trim() || null) : undefined,
        trackingBaseUrl: body.trackingBaseUrl !== undefined ? (body.trackingBaseUrl?.trim() || null) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(shippingMethods.id, body.id))
      .returning();

    if (!method) {
      return NextResponse.json(
        { ok: false, error: "روش ارسال یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: method });
  } catch (error) {
    return safeErrorResponse(error, "admin-shipping-methods-update");
  }
}

/**
 * DELETE /api/admin/shipping-methods?id=X — حذف روش ارسال
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه روش ارسال الزامی است." },
        { status: 400 },
      );
    }

    const [method] = await db
      .delete(shippingMethods)
      .where(eq(shippingMethods.id, id))
      .returning();

    if (!method) {
      return NextResponse.json(
        { ok: false, error: "روش ارسال یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: method });
  } catch (error) {
    return safeErrorResponse(error, "admin-shipping-methods-delete");
  }
}
