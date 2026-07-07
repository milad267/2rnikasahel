import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { confirmOrderPayment } from "@/lib/orders";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * در محیط توسعه، درگاه «sandbox» به‌صورت شبیه‌سازی‌شده عمل می‌کند.
 * در محیط production، در فاز ۵ از تنظیمات ادمین (api key، merchant id) خوانده می‌شود
 * و درخواست واقعی به درگاه (zarinpal/zibal/sep) ارسال می‌شود.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "لطفاً وارد حساب شوید." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const orderId = Number(body?.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ ok: false, error: "سفارش نامعتبر است." }, { status: 400 });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .limit(1);
    if (!order) {
      return NextResponse.json({ ok: false, error: "سفارش یافت نشد." }, { status: 404 });
    }
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, orderNumber: order.orderNumber, alreadyPaid: true });
    }
    if (order.status !== "pending_payment") {
      return NextResponse.json({ ok: false, error: "وضعیت سفارش اجازه پرداخت نمی‌دهد." }, { status: 400 });
    }

    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? null;
    const updated = await confirmOrderPayment(orderId, user.id, sessionToken);

    return NextResponse.json({
      ok: true,
      orderNumber: updated.orderNumber,
      status: updated.status,
      paymentRef: updated.paymentRef,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
