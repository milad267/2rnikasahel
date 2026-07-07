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

  const cartRows = await db
    .select({ total: count(cartItems.id) })
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .where(eq(carts.sessionToken, sessionToken));

  const wishRows = await db
    .select({ total: count(wishlistItems.id) })
    .from(wishlistItems)
    .where(eq(wishlistItems.sessionToken, sessionToken));

  return {
    cartCount: Number(cartRows[0]?.total ?? 0),
    wishlistCount: Number(wishRows[0]?.total ?? 0),
  };
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
    .where(eq(carts.sessionToken, sessionToken))
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

export async function addToCart(sessionToken: string, variantId: number, quantity: number) {
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

  if (!variant) throw new Error("variant-not-found");

  const cart = await getOrCreateCart(sessionToken);
  const safeQuantity = Math.max(1, Math.min(quantity, variant.stock || quantity));

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({
        quantity: Math.min(existing.quantity + safeQuantity, Math.max(variant.stock, 1)),
        updatedAt: new Date(),
      })
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

export async function setSessionCookieIfNeeded(
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
