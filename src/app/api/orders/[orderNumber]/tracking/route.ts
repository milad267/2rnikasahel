import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orderTracking, orders, shippingMethods } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { safeErrorResponse } from "@/lib/safe-error";

/**
 * GET /api/orders/:orderNumber/tracking
 *
 * دریافت اطلاعات رهگیری یک سفارش برای مشتری
 * این API عمومی است و نیاز به احراز هویت ندارد (چون مشتری با شماره سفارش دسترسی دارد)
 * اما برای امنیت، فقط سفارش‌هایی که وضعیت shipped یا delivered دارند را نشان می‌دهد
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      return NextResponse.json(
        { ok: false, error: "شماره سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    // پیدا کردن سفارش
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "سفارش یافت نشد." },
        { status: 404 },
      );
    }

    // فقط سفارش‌های ارسال‌شده یا تحویل‌شده رهگیری دارند
    if (!["shipped", "delivered"].includes(order.status)) {
      return NextResponse.json({
        ok: true,
        data: [],
        trackingAvailable: false,
        message: "سفارش هنوز ارسال نشده است.",
        orderStatus: order.status,
      });
    }

    // دریافت رویدادهای رهگیری
    const events = await db
      .select()
      .from(orderTracking)
      .where(eq(orderTracking.orderId, order.id))
      .orderBy(desc(orderTracking.createdAt));

    // دریافت اطلاعات روش ارسال
    let shippingMethod: { title: string; logo: string | null; trackingBaseUrl: string | null } | null = null;
    if (order.shippingMethodId) {
      const [method] = await db
        .select({
          title: shippingMethods.title,
          logo: shippingMethods.logo,
          trackingBaseUrl: shippingMethods.trackingBaseUrl,
        })
        .from(shippingMethods)
        .where(eq(shippingMethods.id, order.shippingMethodId))
        .limit(1);
      shippingMethod = method || null;
    }

    // پیدا کردن آخرین کد رهگیری
    const lastTrackingCode = events.find(e => e.trackingCode)?.trackingCode || null;

    return NextResponse.json({
      ok: true,
      data: events,
      trackingAvailable: true,
      orderStatus: order.status,
      shippingMethod,
      trackingCode: lastTrackingCode,
      trackingUrl: shippingMethod?.trackingBaseUrl
        ? `${shippingMethod.trackingBaseUrl}${lastTrackingCode || ""}`
        : null,
    });
  } catch (error) {
    return safeErrorResponse(error, "order-tracking-get");
  }
}
