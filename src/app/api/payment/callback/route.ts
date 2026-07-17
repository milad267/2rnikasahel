import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { SESSION_COOKIE } from "@/lib/commerce";
import { getPaymentGateway } from "@/lib/payment";
import { confirmOrderPayment } from "@/lib/orders";
import { getPublicOrigin } from "@/lib/public-url";
import type { PaymentGateway } from "@/lib/gateways";

/**
 * GET /api/payment/callback
 *
 * کاربر پس از پرداخت در درگاه به این آدرس برمی‌گردد.
 * زرین‌پال: ?Authority=xxx&Status=OK (یا NOK)
 * Sandbox:  ?Authority=sandbox-xxx&Status=OK
 */
async function callbackValues(req: NextRequest) {
  const values = new Map<string, string>();
  for (const [key, value] of req.nextUrl.searchParams.entries()) values.set(key, value);
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      for (const [key, value] of Object.entries(body)) values.set(key, String(value ?? ""));
    } else {
      const body = await req.formData().catch(() => null);
      body?.forEach((value, key) => values.set(key, String(value)));
    }
  }
  const pick = (...keys: string[]) => keys.map((key) => values.get(key)).find(Boolean) || "";
  return {
    authority: pick("Authority", "authority", "trackId", "track_id", "id", "token", "Token", "RefNum", "refNum"),
    orderNumber: pick("order_id", "orderId", "OrderId", "ResNum", "resNum", "factorNumber"),
  };
}

function checkoutRedirect(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/checkout", req.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

async function handleCallback(req: NextRequest) {
  try {
    const callback = await callbackValues(req);

    if (!callback.authority && !callback.orderNumber) {
      return checkoutRedirect(req, { error: "پارامترهای پرداخت نامعتبر است." });
    }

    const conditions = [];
    if (callback.authority) conditions.push(eq(orders.paymentRef, callback.authority));
    if (callback.orderNumber) conditions.push(eq(orders.orderNumber, callback.orderNumber));
    const [order] = await db
      .select()
      .from(orders)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .limit(1);

    if (!order) {
      return checkoutRedirect(req, { error: "سفارش مربوط به این پرداخت یافت نشد." });
    }

    if (order.status === "paid") {
      // قبلاً پرداخت شده — مستقیم به صفحه موفقیت
      return checkoutRedirect(req, { success: "1", orderNumber: order.orderNumber, refId: order.paymentRef || "" });
    }

    // ساخت callback URL برای verify
    const origin = getPublicOrigin(req);
    const callbackUrl = `${origin}/api/payment/callback`;
    const gateway = await getPaymentGateway(callbackUrl, (order.paymentMethod || "zarinpal") as PaymentGateway);
    const authority = order.paymentRef || callback.authority || "";
    if (!authority) return checkoutRedirect(req, { error: "شناسه پرداخت یافت نشد." });

    // تأیید پرداخت
    const verifyResult = await gateway.verifyPayment(
      authority,
      Number(order.totalAmount),
      order.orderNumber,
    );

    if (!verifyResult.success) {
      console.error("[payment/callback] تأیید ناموفق:", verifyResult.error);
      return checkoutRedirect(req, { error: "پرداخت تأیید نشد؛ در صورت کسر وجه با پشتیبانی تماس بگیرید." });
    }

    // تکمیل سفارش
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? null;
    await confirmOrderPayment(order.id, order.userId, sessionToken);

    // به‌روزرسانی payment ref واقعی
    if (verifyResult.refId) {
      await db
        .update(orders)
        .set({ paymentRef: verifyResult.refId })
        .where(eq(orders.id, order.id));
    }

    // ریدایرکت به صفحه موفقیت
    return checkoutRedirect(req, { success: "1", orderNumber: order.orderNumber, refId: verifyResult.refId || "" });
  } catch (error) {
    console.error("[payment/callback]", error);
    return checkoutRedirect(req, { error: "خطای داخلی سرور در تأیید پرداخت." });
  }
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}
