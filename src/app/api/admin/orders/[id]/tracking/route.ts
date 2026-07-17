import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orderTracking } from "@/db/schema";
import { orders } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { safeErrorResponse } from "@/lib/safe-error";

/**
 * GET /api/admin/orders/:id/tracking — دریافت رویدادهای رهگیری یک سفارش
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "شناسه سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    const rows = await db
      .select()
      .from(orderTracking)
      .where(eq(orderTracking.orderId, orderId))
      .orderBy(desc(orderTracking.createdAt));

    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    return safeErrorResponse(error, "admin-order-tracking-list");
  }
}

/**
 * POST /api/admin/orders/:id/tracking — افزودن رویداد رهگیری جدید
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "شناسه سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    // بررسی وجود سفارش
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "سفارش یافت نشد." },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.status || !body.title) {
      return NextResponse.json(
        { ok: false, error: "وضعیت و عنوان رویداد الزامی است." },
        { status: 400 },
      );
    }

    const validStatuses = [
      "picked_up", "in_transit", "out_for_delivery", "delivered",
      "failed_attempt", "returned", "customs", "warehouse", "processing",
    ];

    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: "وضعیت نامعتبر است. مقادیر مجاز: " + validStatuses.join(", ") },
        { status: 400 },
      );
    }

    const [event] = await db
      .insert(orderTracking)
      .values({
        orderId,
        status: body.status,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        trackingCode: body.trackingCode?.trim() || null,
        estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : null,
        location: body.location?.trim() || null,
      })
      .returning();

    // اگر وضعیت delivered ثبت شد، سفارش را هم به delivered تغییر بده
    if (body.status === "delivered") {
      await db
        .update(orders)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }

    // اگر وضعیت picked_up یا in_transit ثبت شد و وضعیت فعلی پرداخت شده/آماده‌سازی است، به shipped تغییر بده
    if (["picked_up", "in_transit", "out_for_delivery"].includes(body.status)) {
      if (["paid", "processing"].includes(order.status)) {
        await db
          .update(orders)
          .set({ status: "shipped", updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      }
    }

    return NextResponse.json({ ok: true, data: event });
  } catch (error) {
    return safeErrorResponse(error, "admin-order-tracking-create");
  }
}

/**
 * DELETE /api/admin/orders/:id/tracking?eventId=X — حذف رویداد رهگیری
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const { searchParams } = new URL(req.url);
    const eventId = Number(searchParams.get("eventId"));

    if (!orderId || !eventId) {
      return NextResponse.json(
        { ok: false, error: "شناسه سفارش و رویداد الزامی است." },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(orderTracking)
      .where(
        and(
          eq(orderTracking.id, eventId),
          eq(orderTracking.orderId, orderId),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "رویداد رهگیری یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: deleted });
  } catch (error) {
    return safeErrorResponse(error, "admin-order-tracking-delete");
  }
}
