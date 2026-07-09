import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE } from "@/lib/commerce";
import { getPaymentGateway } from "@/lib/payment";
import { confirmOrderPayment } from "@/lib/orders";

/**
 * GET /api/payment/callback
 *
 * کاربر پس از پرداخت در درگاه به این آدرس برمی‌گردد.
 * زرین‌پال: ?Authority=xxx&Status=OK (یا NOK)
 * Sandbox:  ?Authority=sandbox-xxx&Status=OK
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");

    if (!authority) {
      return NextResponse.redirect(
        new URL("/checkout?error=پارامترهای+پرداخت+نامعتبر", req.url),
      );
    }

    if (status !== "OK") {
      return NextResponse.redirect(
        new URL("/checkout?error=پرداخت+ناموفق+بود.+(انصراف+یا+خطا)", req.url),
      );
    }

    // پیدا کردن سفارش با این authority
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paymentRef, authority))
      .limit(1);

    if (!order) {
      // شاید authority در paymentRef ذخیره نشده — sandbox مستقیم callback شده
      // redirect به checkout با پیام
      return NextResponse.redirect(
        new URL("/checkout?error=سفارش+مربوط+به+این+پرداخت+یافت+نشد", req.url),
      );
    }

    if (order.status === "paid") {
      // قبلاً پرداخت شده — مستقیم به صفحه موفقیت
      return NextResponse.redirect(
        new URL(
          `/checkout?success=1&orderNumber=${order.orderNumber}&refId=${order.paymentRef || ""}`,
          req.url,
        ),
      );
    }

    // ساخت callback URL برای verify
    const origin = req.headers.get("origin") ||
      req.headers.get("host") || "";
    const callbackUrl = `${origin}/api/payment/callback`;
    const gateway = await getPaymentGateway(callbackUrl);

    // تأیید پرداخت
    const verifyResult = await gateway.verifyPayment(
      authority,
      Number(order.totalAmount),
    );

    if (!verifyResult.success) {
      console.error("[payment/callback] تأیید ناموفق:", verifyResult.error);
      return NextResponse.redirect(
        new URL("/checkout?error=تأیید+پرداخت+ناموفق", req.url),
      );
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
    return NextResponse.redirect(
      new URL(
        `/checkout?success=1&orderNumber=${order.orderNumber}&refId=${verifyResult.refId || ""}`,
        req.url,
      ),
    );
  } catch (error) {
    console.error("[payment/callback]", error);
    return NextResponse.redirect(
      new URL("/checkout?error=خطای+داخلی+سرور", req.url),
    );
  }
}
