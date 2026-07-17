import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, users } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[userId]/orders
 * دریافت سفارش‌های یک کاربر (فقط برای ادمین/سوپرمدیر)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // بررسی دسترسی ادمین
    const admin = await getCurrentUser();
    if (!admin || !["admin", "superadmin"].includes(admin.role)) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { userId } = await params;
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ ok: false, error: "شناسه کاربر نامعتبر" }, { status: 400 });
    }

    // گرفتن اطلاعات کاربر
    const [user] = await db
      .select({ id: users.id, name: users.name, phone: users.phone, email: users.email })
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!user) {
      return NextResponse.json({ ok: false, error: "کاربر یافت نشد" }, { status: 404 });
    }

    // گرفتن سفارش‌های کاربر
    const userOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        shippingAddress: orders.shippingAddress,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userIdNum))
      .orderBy(desc(orders.createdAt));

    // گرفتن اقلام هر سفارش
    const orderIds = userOrders.map((o) => o.id);
    const allItems = orderIds.length > 0
      ? await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            productTitle: orderItems.productTitle,
            variantTitle: orderItems.variantTitle,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            lineTotal: orderItems.lineTotal,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    // گروه‌بندی اقلام به ازای هر سفارش
    const itemsByOrder: Record<number, typeof allItems> = {};
    for (const item of allItems) {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    }

    return NextResponse.json({
      ok: true,
      user,
      orders: userOrders,
      itemsByOrder,
    });
  } catch (error) {
    console.error("[ADMIN USER ORDERS]", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی" }, { status: 500 });
  }
}
