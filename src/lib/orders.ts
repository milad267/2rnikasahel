import crypto from "node:crypto";
import { db } from "@/db";
import {
  orders,
  orderItems,
  carts,
  cartItems,
  productVariants,
  userAddresses,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/** شیء تنظیمات درگاه پرداخت — در فاز ۵ از ادمین خوانده می‌شود */
export type PaymentGateway = "zarinpal" | "zibal" | "sep" | "sandbox";

/** آیتم‌های سبد برای محاسبه سفارش */
type CartItemRow = {
  id: number;
  quantity: number;
  priceSnapshot: string;
  productTitleSnapshot: string;
  variantTitleSnapshot: string;
  unitLabelSnapshot: string | null;
  variantId: number;
};

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `DS-${ts}-${rand}`;
}

/** محاسبه جمع کل از سبد کاربر (مهمان یا لاگین) */
export async function calculateCartTotals(sessionToken: string | null) {
  if (!sessionToken) return { items: [] as CartItemRow[], subtotal: 0, count: 0 };

  const [cart] = await db.select().from(carts).where(eq(carts.sessionToken, sessionToken)).limit(1);
  if (!cart) return { items: [] as CartItemRow[], subtotal: 0, count: 0 };

  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      priceSnapshot: cartItems.priceSnapshot,
      productTitleSnapshot: cartItems.productTitleSnapshot,
      variantTitleSnapshot: cartItems.variantTitleSnapshot,
      unitLabelSnapshot: cartItems.unitLabelSnapshot,
      variantId: cartItems.variantId,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));

  const subtotal = items.reduce((s, i) => s + Number(i.priceSnapshot) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, subtotal, count };
}

export type CheckoutInput = {
  userId: number;
  sessionToken: string | null;
  shippingAddress: string;
  province: string;
  city: string;
  postalCode?: string;
  receiverName?: string;
  receiverPhone?: string;
  paymentMethod: PaymentGateway;
  notes?: string;
  /** اگر true، آدرس به‌عنوان پیش‌فرض ذخیره شود */
  saveAddress?: boolean;
};

/** ثبت سفارش جدید (پس از تکمیل فرم تسویه) */
export async function createOrder(input: CheckoutInput) {
  const totals = await calculateCartTotals(input.sessionToken);
  if (totals.items.length === 0) {
    throw new Error("سبد خرید شما خالی است.");
  }

  // بررسی موجودی برای هر آیتم
  for (const it of totals.items) {
    const [v] = await db
      .select({ id: productVariants.id, stock: productVariants.stock, sku: productVariants.sku })
      .from(productVariants)
      .where(eq(productVariants.id, it.variantId))
      .limit(1);
    if (!v) throw new Error(`تنوع کالا یافت نشد.`);
    if (v.stock < it.quantity) {
      throw new Error(`موجودی کافی برای "${it.variantTitleSnapshot}" نیست.`);
    }
  }

  const orderNumber = generateOrderNumber();

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: input.userId,
      status: "pending_payment",
      totalAmount: String(totals.subtotal),
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
    })
    .returning();

  // درج اقلام سفارش
  await db.insert(orderItems).values(
    totals.items.map((it) => ({
      orderId: order.id,
      variantId: it.variantId,
      sku: "",
      productTitle: it.productTitleSnapshot,
      variantTitle: it.variantTitleSnapshot,
      quantity: it.quantity,
      unitPrice: it.priceSnapshot,
      lineTotal: String(Number(it.priceSnapshot) * it.quantity),
    })),
  );

  // ذخیره SKU در اقلام
  for (const it of totals.items) {
    const [v] = await db
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .where(eq(productVariants.id, it.variantId))
      .limit(1);
    if (v?.sku) {
      await db.execute(
        sql`UPDATE order_items SET sku = ${v.sku} WHERE order_id = ${order.id} AND variant_id = ${it.variantId}`,
      );
    }
  }

  // ذخیره آدرس (در صورت نیاز)
  if (input.saveAddress) {
    await db.insert(userAddresses).values({
      userId: input.userId,
      title: "آدرس ثبت‌شده در تسویه",
      province: input.province,
      city: input.city,
      postalAddress: input.shippingAddress,
      postalCode: input.postalCode ?? null,
      receiverName: input.receiverName ?? null,
      receiverPhone: input.receiverPhone ?? null,
      isDefault: false,
    });
  }

  return { order, subtotal: totals.subtotal, count: totals.count };
}

/** تایید پرداخت و تکمیل سفارش — کسر موجودی و خالی کردن سبد */
export async function confirmOrderPayment(orderId: number, userId: number, sessionToken: string | null) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) throw new Error("سفارش یافت نشد.");
  if (order.status === "paid") return order;

  // کسر موجودی و بستن اقلام
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  for (const it of items) {
    if (!it.variantId) continue;
    await db
      .update(productVariants)
      .set({ stock: sql`GREATEST(${productVariants.stock} - ${it.quantity}, 0)` })
      .where(eq(productVariants.id, it.variantId));
  }

  // خالی کردن سبد کاربر
  if (sessionToken) {
    const [cart] = await db.select().from(carts).where(eq(carts.sessionToken, sessionToken)).limit(1);
    if (cart) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }
  }

  // به‌روزرسانی وضعیت سفارش
  const [updated] = await db
    .update(orders)
    .set({ status: "paid", paymentRef: crypto.randomBytes(8).toString("hex"), updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
}

export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";

/** دریافت سفارش‌های کاربر به همراه اقلام */
export async function getUserOrdersWithItems(userId: number) {
  const all = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  const allItems = await db.select().from(orderItems);
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const it of allItems) {
    const arr = itemsByOrder.get(it.orderId) ?? [];
    arr.push(it);
    itemsByOrder.set(it.orderId, arr);
  }
  return all.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
}
