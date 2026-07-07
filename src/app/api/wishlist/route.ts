import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, toggleWishlist, getWishlistPageData } from "@/lib/commerce";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getSessionToken(req: NextRequest) {
  return req.cookies.get(SESSION_COOKIE)?.value ?? createSessionToken();
}

export async function GET(req: NextRequest) {
  const isPopup = req.nextUrl.searchParams.has("popup");
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const items = await getWishlistPageData(sessionToken);

  if (isPopup) {
    return NextResponse.json(
      items.map((i) => ({
        productId: i.productId,
        slug: i.slug,
        title: i.title,
        categoryTitle: i.categoryTitle,
        minPrice: i.minPrice,
        variantCount: i.variantCount,
      })),
    );
  }
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const productId = Number(body?.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
    }

    const sessionToken = getSessionToken(req);
    const result = await toggleWishlist(sessionToken, productId);
    const res = NextResponse.json({ ok: true, ...result });
    res.cookies.set(SESSION_COOKIE, sessionToken, { path: "/", maxAge: COOKIE_MAX_AGE });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
