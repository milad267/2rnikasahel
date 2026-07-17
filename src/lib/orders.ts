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
import { eq, and, desc, gte, sql, inArray } from "drizzle-orm";
import type { PaymentGateway } from "@/lib/gateways";

/** شیء تنظیمات درگاه پرداخت — در فاز ۵ از ادمین خوانده می‌شود */
export type { PaymentGateway } from "@/lib/gateways";

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
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase(); // 4 بایت = 8 کاراکتر hex
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
  /** هزینه حمل و نقل (از سمت سرور محاسبه می‌شود) */
  shippingCost?: number;
  /** شناسه روش ارسال انتخاب‌شده */
  shippingMethodId?: number;
};

/** ثبت سفارش جدید (پس از تکمیل فرم تسویه) */
export async function createOrder(input: CheckoutInput) {
  const totals = await calculateCartTotals(input.sessionToken);
  if (totals.items.length === 0) {
    throw new Error("سبد خرید شما خالی است.");
  }

  const orderNumber = generateOrderNumber();
  return db.transaction(async tx => {
    const skuByVariant = new Map<number, string>();
    for (const item of totals.items) {
      const locked = await tx.execute(sql`SELECT id, stock, sku FROM product_variants WHERE id = ${item.variantId} FOR UPDATE`);
      const variant = locked.rows[0] as { id: number; stock: number; sku: string } | undefined;
      if (!variant) throw new Error("تنوع کالا یافت نشد.");
      if (Number(variant.stock) < item.quantity) throw new Error(`موجودی کافی برای "${item.variantTitleSnapshot}" نیست.`);
      skuByVariant.set(item.variantId, variant.sku);
    }

    const shippingFee = input.shippingCost ?? 0;
    const [order] = await tx.insert(orders).values({
      orderNumber, userId: input.userId, status: "pending_payment",
      totalAmount: String(totals.subtotal + shippingFee),
      shippingCost: String(shippingFee),
      shippingAddress: input.shippingAddress,
      province: input.province, city: input.city,
      postalCode: input.postalCode ?? null,
      receiverName: input.receiverName ?? null,
      receiverPhone: input.receiverPhone ?? null,
      paymentMethod: input.paymentMethod, notes: input.notes ?? null,
      shippingMethodId: input.shippingMethodId ?? null,
    }).returning();

    await tx.insert(orderItems).values(totals.items.map(item => ({
      orderId: order.id, variantId: item.variantId, sku: skuByVariant.get(item.variantId) || "",
      productTitle: item.productTitleSnapshot, variantTitle: item.variantTitleSnapshot,
      quantity: item.quantity, unitPrice: item.priceSnapshot,
      lineTotal: String(Number(item.priceSnapshot) * item.quantity),
    })));

    if (input.saveAddress) await tx.insert(userAddresses).values({
      userId: input.userId, title: "آدرس ثبت‌شده در تسویه", province: input.province,
      city: input.city, postalAddress: input.shippingAddress, postalCode: input.postalCode ?? null,
      receiverName: input.receiverName ?? null, receiverPhone: input.receiverPhone ?? null, isDefault: false,
    });

    // پاک کردن آیتم‌های سبد خرید بعد از ثبت سفارش
    if (input.sessionToken) {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.sessionToken, input.sessionToken))
        .limit(1);
      if (cart) {
        await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      }
    }

    return { order, subtotal: totals.subtotal, count: totals.count };
  });
}

/** تایید پرداخت و تکمیل سفارش — کسر موجودی و خالی کردن سبد */
export async function confirmOrderPayment(orderId: number, userId: number, sessionToken: string | null) {
  return db.transaction(async tx => {
    const locked = await tx.execute(sql`SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${userId} FOR UPDATE`);
    const order = locked.rows[0] as typeof orders.$inferSelect | undefined;
    if (!order) throw new Error("سفارش یافت نشد.");
    if (order.status === "paid") return order;
    if (order.status !== "pending_payment") throw new Error("وضعیت سفارش اجازه تأیید پرداخت نمی‌دهد.");

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    // ابتدا موجودی همه اقلام را بررسی کن قبل از کسر
    for (const item of items) {
      if (!item.variantId) continue;
      const variantResult = await tx.execute(sql`SELECT id, stock FROM product_variants WHERE id = ${item.variantId} FOR UPDATE`);
      const variantRow = variantResult.rows[0] as { stock: number } | undefined;
      const stock = Number(variantRow?.stock ?? 0);
      if (stock < item.quantity) {
        // موجودی کافی نیست — سفارش را برای پیگیری ادمین علامت‌گذاری کن
        console.error(`[ORDER ${orderId}] کمبود موجودی برای "${item.productTitle}" (موجودی: ${stock}, نیاز: ${item.quantity})`);
        await tx.update(orders)
          .set({
            status: "cancelled",
            notes: sql`CASE WHEN ${orders.notes} IS NULL OR ${orders.notes} = '' THEN 'کمبود موجودی پس از پرداخت - نیاز به پیگیری' ELSE ${orders.notes} || ' | کمبود موجودی پس از پرداخت' END`,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));
        throw new Error(`موجودی کافی برای "${item.productTitle}" نیست. سفارش لغو و برای پیگیری به ادمین ارجاع داده شد.`);
      }
    }

    // کسر موجودی
    for (const item of items) {
      if (!item.variantId) continue;
      await tx.update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
        .where(and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)));
    }

    // سبد خرید در createOrder خالی شده، اینجا نیازی به خالی کردن دوباره نیست
    // (ممکن است کاربر دوباره آیتم اضافه کرده باشد — آن‌ها مربوط به سفارش جدید هستند)

    const [updatedOrder] = await tx.update(orders)
      .set({ status: "paid", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
      .returning();
    return updatedOrder || order;
  });
}

export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";

/** دریافت سفارش‌های کاربر به همراه اقلام */
export async function getUserOrdersWithItems(userId: number) {
  const all = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (all.length === 0) return [];

  const orderIds = all.map((o) => o.id);
  const allItems = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const it of allItems) {
    const arr = itemsByOrder.get(it.orderId) ?? [];
    arr.push(it);
    itemsByOrder.set(it.orderId, arr);
  }
  return all.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
}
