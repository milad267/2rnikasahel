import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import {
  carts,
  cartItems,
  wishlistItems,
  products,
  productVariants,
  categories,
  units,
} from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export const SESSION_COOKIE = "dornika_session";

export function createSessionToken() {
  return randomUUID();
}

export async function readSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

async function getOrCreateCart(sessionToken: string) {
  const [existing] = await db.select().from(carts).where(eq(carts.sessionToken, sessionToken)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(carts).values({ sessionToken }).returning();
  return created;
}

export async function getCommerceCounts(sessionToken: string | null) {
  if (!sessionToken) return { cartCount: 0, wishlistCount: 0 };
  try {
    const cartRows = await db.select({ total: count(cartItems.id) }).from(cartItems).innerJoin(carts, eq(cartItems.cartId, carts.id)).where(eq(carts.sessionToken, sessionToken));
    const wishRows = await db.select({ total: count(wishlistItems.id) }).from(wishlistItems).where(eq(wishlistItems.sessionToken, sessionToken));
    return { cartCount: Number(cartRows[0]?.total ?? 0), wishlistCount: Number(wishRows[0]?.total ?? 0) };
  } catch { return { cartCount: 0, wishlistCount: 0 }; }
}

export async function getCartPageData(sessionToken: string | null) {
  if (!sessionToken) {
    return { items: [], subtotal: 0, count: 0 };
  }

  const data = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      priceSnapshot: cartItems.priceSnapshot,
      productTitleSnapshot: cartItems.productTitleSnapshot,
      variantTitleSnapshot: cartItems.variantTitleSnapshot,
      unitLabelSnapshot: cartItems.unitLabelSnapshot,
      variantId: cartItems.variantId,
      productSlug: products.slug,
      productId: products.id,
      coverImage: products.coverImage,
      categoryTitle: categories.title,
      unitName: units.name,
      unitSymbol: units.symbol,
      currentPrice: productVariants.price,
      stock: productVariants.stock,
    })
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(units, eq(productVariants.unitId, units.id))
    .where(and(eq(carts.sessionToken, sessionToken), eq(productVariants.isActive, true)))
    .orderBy(desc(cartItems.createdAt));

  const subtotal = data.reduce((sum, item) => sum + Number(item.priceSnapshot) * item.quantity, 0);
  const countItems = data.reduce((sum, item) => sum + item.quantity, 0);

  return { items: data, subtotal, count: countItems };
}

export async function getWishlistPageData(sessionToken: string | null) {
  if (!sessionToken) return [];

  return db
    .select({
      id: wishlistItems.id,
      productId: products.id,
      slug: products.slug,
      title: products.title,
      subtitle: products.subtitle,
      coverImage: products.coverImage,
      categoryTitle: categories.title,
      minPrice: sql<string>`coalesce(min(${productVariants.price}), '0')`,
      variantCount: count(productVariants.id),
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(eq(wishlistItems.sessionToken, sessionToken))
    .groupBy(wishlistItems.id, products.id, categories.title)
    .orderBy(desc(wishlistItems.createdAt));
}

export async function getWishlistProductIds(sessionToken: string | null) {
  if (!sessionToken) return [] as number[];
  const rows = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.sessionToken, sessionToken));
  return rows.map((r) => r.productId);
}

export async function addToCart(sessionToken: string, variantId: number, quantity: number, productId?: number) {
  const [variant] = await db
    .select({
      id: productVariants.id,
      price: productVariants.price,
      stock: productVariants.stock,
      name: productVariants.name,
      unitValue: productVariants.unitValue,
      sku: productVariants.sku,
      productTitle: products.title,
      unitName: units.name,
      unitSymbol: units.symbol,
      productSlug: products.slug,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(units, eq(productVariants.unitId, units.id))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.isActive, true)))
    .limit(1);

  // اگر تنوع پیدا نشد (مثلاً product بدون تنوع)، یک تنوع پیش‌فرض بساز
  if (!variant) {
    const product = productId
      ? (await db.select().from(products).where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1))[0]
      : null;
    if (!product) throw new Error("تنوع کالا یافت نشد یا غیرفعال شده است.");

    // اول ببین تنوع فعال دیگری برای این محصول هست
    const [existingVariant] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
      .limit(1);

    if (existingVariant) {
      // از تنوع موجود استفاده کن
      return addToCart(sessionToken, existingVariant.id, quantity, productId);
    }

    // یک تنوع جدید با قیمت ۰ بساز (برای محصولات بدون تنوع)
    const [newVariant] = await db.insert(productVariants).values({
      productId: product.id,
      sku: `AUTO-${Date.now()}`,
      name: product.title,
      price: "0",
      stock: 999,
      isActive: true,
    }).returning();

    // دوباره خودمون رو با تنوع جدید صدا بزن
    return addToCart(sessionToken, newVariant.id, quantity, productId);
  }

  const cart = await getOrCreateCart(sessionToken);
  // Fix: properly handle zero stock — prevent adding out-of-stock items
  if (variant.stock <= 0) throw new Error("این کالا در انبار موجود نیست.");
  const safeQuantity = Math.max(1, Math.min(quantity, variant.stock));

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)))
    .limit(1);

  if (existing) {
    // Fix: SET the quantity instead of ADDING (prevents compounding)
    const newQty = Math.min(safeQuantity, Math.max(variant.stock, 1));
    await db
      .update(cartItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      variantId,
      quantity: safeQuantity,
      priceSnapshot: variant.price,
      productTitleSnapshot: variant.productTitle,
      variantTitleSnapshot: variant.name,
      unitLabelSnapshot: [variant.unitValue, variant.unitSymbol || variant.unitName].filter(Boolean).join(" "),
    });
  }

  return { productSlug: variant.productSlug };
}

export async function updateCartItem(sessionToken: string, variantId: number, quantity: number) {
  const [cart] = await db.select().from(carts).where(eq(carts.sessionToken, sessionToken)).limit(1);
  if (!cart) throw new Error("cart-not-found");

  const [item] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)))
    .limit(1);
  if (!item) throw new Error("cart-item-not-found");

  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
    return;
  }

  await db.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, item.id));
}

export async function removeCartItem(sessionToken: string, variantId: number) {
  const [cart] = await db.select().from(carts).where(eq(carts.sessionToken, sessionToken)).limit(1);
  if (!cart) return;
  await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)));
}

export async function toggleWishlist(sessionToken: string, productId: number) {
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.sessionToken, sessionToken), eq(wishlistItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
    return { wishlisted: false };
  }

  await db.insert(wishlistItems).values({ sessionToken, productId });
  return { wishlisted: true };
}

export function setSessionCookieIfNeeded(
  response: { cookies: { set: (name: string, value: string, options: { path: string; maxAge: number }) => void } },
  sessionToken?: string | null,
) {
  if (!sessionToken) {
    const token = createSessionToken();
    response.cookies.set(SESSION_COOKIE, token, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return token;
  }
  return sessionToken;
}

/**
 * ادغام سبد خرید مهمان به حساب کاربری بعد از ورود/ثبت‌نام
 * - سبد خرید مهمان (مبتنی بر sessionToken) به userId متصل می‌شود
 * - اگر کاربر قبلاً سبد خریدی داشته باشد (با userId)، آیتم‌ها ادغام می‌شوند
 */
export async function mergeGuestCart(userId: number, sessionToken: string) {
  try {
    // سبد خرید مهمان فعلی
    const [guestCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionToken, sessionToken))
      .limit(1);

    if (!guestCart) return;

    // بررسی وجود سبد خرید قبلی برای این کاربر (بدون شرط sessionToken چون بعد از ورود توکن تغییر می‌کند)
    const [userCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (userCart && userCart.id !== guestCart.id) {
      // کاربر قبلاً سبد خرید جداگانه‌ای داشته → آیتم‌ها را ادغام کن
      const guestItems = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, guestCart.id));

      for (const item of guestItems) {
        const [existing] = await db
          .select()
          .from(cartItems)
          .where(and(eq(cartItems.cartId, userCart.id), eq(cartItems.variantId, item.variantId)))
          .limit(1);

        if (existing) {
          // اگر آیتم تکراری است، مقدار را جمع کن
          await db
            .update(cartItems)
            .set({ quantity: existing.quantity + item.quantity, updatedAt: new Date() })
            .where(eq(cartItems.id, existing.id));
        } else {
          // انتقال آیتم به سبد کاربر
          await db
            .insert(cartItems)
            .values({
              cartId: userCart.id,
              variantId: item.variantId,
              quantity: item.quantity,
              priceSnapshot: item.priceSnapshot,
              productTitleSnapshot: item.productTitleSnapshot,
              variantTitleSnapshot: item.variantTitleSnapshot,
              unitLabelSnapshot: item.unitLabelSnapshot,
            });
        }
      }

      // حذف سبد خرید مهمان (آیتم‌هایش منتقل شدند)
      await db.delete(carts).where(eq(carts.id, guestCart.id));
    } else {
      // به‌روزرسانی سبد خرید مهمان با userId
      await db
        .update(carts)
        .set({ userId, updatedAt: new Date() })
        .where(eq(carts.id, guestCart.id));
    }
  } catch {
    // شکست در ادغام نباید مانع لاگین شود
  }
}
