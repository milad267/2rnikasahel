import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPaymentGateway } from "@/lib/payment";
import { getPublicOrigin } from "@/lib/public-url";
import type { PaymentGateway } from "@/lib/gateways";

/**
 * POST /api/orders/pay
 *
 * سفارش را به درگاه پرداخت هدایت می‌کند.
 * - sandbox: ریدایرکت مستقیم به callback
 * - زرین‌پال: ریدایرکت به StartPay
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "لطفاً وارد حساب شوید." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    const orderId = Number(body?.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { ok: false, error: "سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "سفارش یافت نشد." },
        { status: 404 },
      );
    }

    if (order.status === "paid") {
      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        alreadyPaid: true,
        status: order.status,
        paymentRef: order.paymentRef,
      });
    }

    if (order.status !== "pending_payment") {
      return NextResponse.json(
        { ok: false, error: "وضعیت سفارش اجازه پرداخت نمی‌دهد." },
        { status: 400 },
      );
    }

    // ساخت آدرس callback
    const origin = getPublicOrigin(req);
    const callbackUrl = `${origin}/api/payment/callback`;

    const gateway = await getPaymentGateway(callbackUrl, (order.paymentMethod || "zarinpal") as PaymentGateway);
    const amount = Number(order.totalAmount);

    const result = await gateway.requestPayment({
      amount,
      description: `سفارش ${order.orderNumber}`,
      mobile: user.phone || undefined,
      email: user.email || undefined,
      orderNumber: order.orderNumber,
    });

    if (!result.success || !result.redirectUrl) {
      return NextResponse.json(
        { ok: false, error: result.error || "خطا در اتصال به درگاه پرداخت" },
        { status: 502 },
      );
    }

    // ذخیره authority برای callback
    if (result.authority) {
      await db
        .update(orders)
        .set({ paymentRef: result.authority })
        .where(eq(orders.id, orderId));
    }

    return NextResponse.json({
      ok: true,
      redirectUrl: result.redirectUrl,
      authority: result.authority,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("[pay]", error);
    return NextResponse.json(
      { ok: false, error: "خطای داخلی سرور" },
      { status: 500 },
    );
  }
}
