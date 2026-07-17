import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, addToCart, updateCartItem, removeCartItem, getCartPageData } from "@/lib/commerce";
import { safeErrorResponse } from "@/lib/safe-error";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getSessionToken(req: NextRequest) {
  return req.cookies.get(SESSION_COOKIE)?.value ?? createSessionToken();
}

export async function GET(req: NextRequest) {
  const isPopup = req.nextUrl.searchParams.has("popup");
  const sessionToken = getSessionToken(req);
  const cart = await getCartPageData(sessionToken);

  const res = isPopup
    ? NextResponse.json(
        cart.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          priceSnapshot: i.priceSnapshot,
          productTitleSnapshot: i.productTitleSnapshot,
          variantTitleSnapshot: i.variantTitleSnapshot,
          variantId: i.variantId,
          productSlug: i.productSlug,
          coverImage: (i as any).coverImage || null,
        })),
      )
    : NextResponse.json(cart);

  // Persist session token cookie on GET too
  res.cookies.set(SESSION_COOKIE, sessionToken, { path: "/", maxAge: COOKIE_MAX_AGE });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const variantId = Number(body?.variantId);
    const productId = Number(body?.productId) || undefined;
    const quantity = Number(body?.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
    }
    if (!Number.isInteger(variantId) || variantId <= 0) {
      // اگر variantId معتبر نیست، باید productId داشته باشیم
      if (!productId) {
        return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
      }
    }

    const sessionToken = getSessionToken(req);
    const result = await addToCart(sessionToken, variantId, quantity, productId);
    const res = NextResponse.json({ ok: true, ...result });
    res.cookies.set(SESSION_COOKIE, sessionToken, { path: "/", maxAge: COOKIE_MAX_AGE });
    return res;
  } catch (error) {
    return safeErrorResponse(error, "cart-items-post");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const variantId = Number(body?.variantId);
    const quantity = Number(body?.quantity);
    if (!Number.isInteger(variantId) || variantId <= 0 || !Number.isFinite(quantity)) {
      return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
    }

    const sessionToken = getSessionToken(req);
    await updateCartItem(sessionToken, variantId, quantity);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionToken, { path: "/", maxAge: COOKIE_MAX_AGE });
    return res;
  } catch (error) {
    return safeErrorResponse(error, "cart-items-patch");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const variantId = Number(body?.variantId);
    if (!Number.isInteger(variantId) || variantId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
    }

    const sessionToken = getSessionToken(req);
    await removeCartItem(sessionToken, variantId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionToken, { path: "/", maxAge: COOKIE_MAX_AGE });
    return res;
  } catch (error) {
    return safeErrorResponse(error, "cart-items-delete");
  }
}
