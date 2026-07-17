import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, calculateCartTotals, type PaymentGateway } from "@/lib/orders";
import { ALL_GATEWAYS } from "@/lib/gateways";
import { isPaymentGatewayAvailable } from "@/lib/payment-availability";
import { getSetting } from "@/lib/settings";
import { db } from "@/db";
import { shippingMethods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeErrorResponse } from "@/lib/safe-error";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
// Only gateways that have actual implementations in payment.ts
const IMPLEMENTED_GATEWAYS: PaymentGateway[] = ["zarinpal", "zibal", "idpay", "payir", "sep", "saman", "sandbox"];
const ALLOWED_METHODS: PaymentGateway[] = process.env.NODE_ENV === "production"
  ? IMPLEMENTED_GATEWAYS.filter(g => g !== "sandbox")
  : IMPLEMENTED_GATEWAYS;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const province = String(body?.province || "").trim();
    const city = String(body?.city || "").trim();
    const shippingAddress = String(body?.shippingAddress || "").trim();
    const paymentMethod = String(body?.paymentMethod || "zarinpal") as PaymentGateway;
    const postalCode = body?.postalCode ? String(body.postalCode) : undefined;
    const receiverName = body?.receiverName ? String(body.receiverName) : undefined;
    const receiverPhone = body?.receiverPhone ? String(body.receiverPhone) : undefined;
    const notes = body?.notes ? String(body.notes) : undefined;
    const saveAddress = Boolean(body?.saveAddress);
    const shippingMethodId = body?.shippingMethodId ? Number(body.shippingMethodId) : undefined;

    if (!province || !city || shippingAddress.length < 10) {
      return NextResponse.json(
        { ok: false, error: "لطفاً استان، شهر و آدرس کامل (حداقل ۱۰ کاراکتر) را وارد کنید." },
        { status: 400 },
      );
    }

    // اعتبارسنجی کد پستی
    if (postalCode && !/^\d{10}$/.test(postalCode)) {
      return NextResponse.json(
        { ok: false, error: "کد پستی باید ۱۰ رقم باشد." },
        { status: 400 },
      );
    }

    // اعتبارسنجی شماره تلفن گیرنده
    if (receiverPhone && !/^0?9\d{9}$/.test(receiverPhone.replace(/[\s-]/g, ""))) {
      return NextResponse.json(
        { ok: false, error: "شماره تلفن گیرنده معتبر نیست." },
        { status: 400 },
      );
    }

    if (!ALLOWED_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ ok: false, error: "روش پرداخت انتخاب‌شده معتبر نیست." }, { status: 400 });
    }
    if (paymentMethod === "sandbox" && process.env.NODE_ENV === "production") {
      return NextResponse.json({ ok: false, error: "پرداخت آزمایشی روی فروشگاه واقعی غیرفعال است." }, { status: 400 });
    }
    if (!(await isPaymentGatewayAvailable(paymentMethod))) {
      return NextResponse.json({ ok: false, error: "این درگاه فعال نیست یا تنظیماتش کامل نشده است." }, { status: 400 });
    }

    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? createSessionToken();

    // محاسبه هزینه حمل — اولویت با روش ارسال انتخاب‌شده
    let shippingCost = 0;
    if (shippingMethodId) {
      const [method] = await db
        .select()
        .from(shippingMethods)
        .where(eq(shippingMethods.id, shippingMethodId))
        .limit(1);
      if (method) {
        if (!method.isFree) {
          const threshold = Number(method.freeThreshold);
          const totalsForCalc = await calculateCartTotals(sessionToken);
          if (threshold <= 0 || totalsForCalc.subtotal < threshold) {
            shippingCost = Number(method.cost) || 0;
          }
        }
      }
    }
    // fallback به تنظیمات قدیمی
    if (!shippingMethodId || shippingMethodId === 0) {
      const shippingFee = Number(await getSetting<number>("store.shipping.fee", "general")) || 25000;
      const freeShippingThreshold = Number(await getSetting<number>("store.shipping.free_threshold", "general")) || 5000000;
      const totals = await calculateCartTotals(sessionToken);
      shippingCost = totals.subtotal >= freeShippingThreshold ? 0 : shippingFee;
    }

    const { order, subtotal, count } = await createOrder({
      userId: user.id,
      sessionToken,
      province,
      city,
      shippingAddress,
      paymentMethod,
      postalCode,
      receiverName,
      receiverPhone,
      notes,
      saveAddress,
      shippingCost,
      shippingMethodId,
    });

    const res = NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      subtotal: String(subtotal),
      count,
    });
    const useSecure = process.env.NODE_ENV === "production" && String(process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://");
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: useSecure,
    });
    return res;
  } catch (error) {
    return safeErrorResponse(error, "orders-create", 400);
  }
}
