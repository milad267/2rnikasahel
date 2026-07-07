import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, type PaymentGateway } from "@/lib/orders";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const ALLOWED_METHODS: PaymentGateway[] = ["zarinpal", "zibal", "sep", "sandbox"];

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
    const paymentMethod = String(body?.paymentMethod || "sandbox") as PaymentGateway;
    const postalCode = body?.postalCode ? String(body.postalCode) : undefined;
    const receiverName = body?.receiverName ? String(body.receiverName) : undefined;
    const receiverPhone = body?.receiverPhone ? String(body.receiverPhone) : undefined;
    const notes = body?.notes ? String(body.notes) : undefined;
    const saveAddress = Boolean(body?.saveAddress);

    if (!province || !city || shippingAddress.length < 10) {
      return NextResponse.json(
        { ok: false, error: "لطفاً استان، شهر و آدرس کامل (حداقل ۱۰ کاراکتر) را وارد کنید." },
        { status: 400 },
      );
    }

    if (!ALLOWED_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ ok: false, error: "روش پرداخت انتخاب‌شده معتبر نیست." }, { status: 400 });
    }

    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? createSessionToken();

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
    });

    const res = NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      subtotal: String(subtotal),
      count,
    });
    res.cookies.set(SESSION_COOKIE, sessionToken, { path: "/", maxAge: COOKIE_MAX_AGE });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
