import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants, orders, orderItems, users, categories } from "@/db/schema";
import { eq, sql, and, gte, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "overview";
    const days = Number(req.nextUrl.searchParams.get("days")) || 7;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 5;
    let data: unknown;

    switch (type) {
      case "sales-trend": {
        const start = new Date();
        start.setDate(start.getDate() - days);
        data = await db.select({
          date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
          total: sql<string>`coalesce(sum(${orders.totalAmount}::bigint), 0)::text`,
          count: sql<number>`count(*)::int`,
        }).from(orders).where(and(gte(orders.createdAt, start), sql`${orders.status} NOT IN ('pending_payment', 'cancelled')`))
          .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD') asc`);
        break;
      }
      case "orders-status":
        data = await db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status);
        break;
      case "monthly-sales":
        data = await db.select({
          month: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`,
          total: sql<string>`coalesce(sum(${orders.totalAmount}::bigint), 0)::text`,
        }).from(orders).where(sql`${orders.status} NOT IN ('pending_payment', 'cancelled')`)
          .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`).orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM') asc`);
        break;
      case "top-categories":
        data = await db.select({
          categoryTitle: categories.title,
          totalSales: sql<string>`coalesce(sum(${orderItems.lineTotal}::bigint), 0)::text`,
          count: sql<number>`count(*)::int`,
        }).from(orderItems).leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
          .leftJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .groupBy(categories.title).orderBy(desc(sql`sum(${orderItems.lineTotal}::bigint)`)).limit(8);
        break;
      case "top-selling":
        data = await db.select({
          id: products.id, title: products.title, slug: products.slug,
          totalSold: sql<number>`sum(${orderItems.quantity})::int`,
          totalRevenue: sql<string>`coalesce(sum(${orderItems.lineTotal}::bigint), 0)::text`,
        }).from(orderItems).leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
          .leftJoin(products, eq(productVariants.productId, products.id))
          .groupBy(products.id, products.title, products.slug)
          .orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(limit);
        break;
      case "recent-orders":
        data = await db.select({
          id: orders.id, orderNumber: orders.orderNumber, status: orders.status,
          totalAmount: orders.totalAmount, createdAt: orders.createdAt,
          userName: users.name,
        }).from(orders).leftJoin(users, eq(orders.userId, users.id))
          .orderBy(desc(orders.createdAt)).limit(limit);
        break;
      case "new-users": {
        const start = new Date();
        start.setDate(start.getDate() - days);
        data = await db.select({
          date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        }).from(users).where(gte(users.createdAt, start))
          .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD') asc`);
        break;
      }
      case "conversion-rate": {
        const [totalUsers] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
        const [deliveredOrders] = await db.select({ c: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "delivered"));
        const rate = totalUsers?.c ? Math.round((deliveredOrders?.c ?? 0) / totalUsers.c * 100) : 0;
        data = { totalUsers: totalUsers?.c ?? 0, deliveredOrders: deliveredOrders?.c ?? 0, rate };
        break;
      }
      case "traffic-sources":
        data = [
          { source: "مستقیم", value: 40, color: "#3b82f6" },
          { source: "گوگل", value: 30, color: "#10b981" },
          { source: "اینستاگرام", value: 20, color: "#8b5cf6" },
          { source: "تلگرام", value: 10, color: "#f59e0b" },
        ];
        break;
      case "weekly-comparison": {
        const weekDays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
        const now = new Date();
        const startToday = new Date(now.setHours(0, 0, 0, 0));
        const dayOfWeek = startToday.getDay();
        const thisWeekStart = new Date(startToday);
        thisWeekStart.setDate(thisWeekStart.getDate() - dayOfWeek + 6);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const ordersData = await db.select({
          date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
          total: sql<string>`coalesce(sum(${orders.totalAmount}::bigint), 0)::text`,
        }).from(orders).where(and(gte(orders.createdAt, lastWeekStart), sql`${orders.status} NOT IN ('pending_payment', 'cancelled')`))
          .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);
        data = weekDays.map((day, i) => {
          const d = new Date(thisWeekStart);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().slice(0, 10);
          const thisVal = ordersData.find((o) => o.date === dateStr);
          const lastDate = new Date(lastWeekStart);
          lastDate.setDate(lastDate.getDate() + i);
          const lastVal = ordersData.find((o) => o.date === lastDate.toISOString().slice(0, 10));
          return { day, thisWeek: Number(thisVal?.total ?? "0"), lastWeek: Number(lastVal?.total ?? "0") };
        });
        break;
      }
      case "hourly-traffic": {
        const dailyData = await db.select({
          hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})::int`,
          count: sql<number>`count(*)::int`,
        }).from(orders).where(sql`${orders.createdAt} >= CURRENT_DATE`)
          .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`).orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt}) asc`);
        data = Array.from({ length: 24 }, (_, i) => {
          const found = dailyData.find((d) => d.hour === i);
          return { hour: `${i}:00`, count: found?.count ?? 0 };
        });
        break;
      }
      default: {
        const [prod, vr, ord, usr, pend, lowS, avg] = await Promise.all([
          db.select({ c: sql<number>`count(*)::int` }).from(products).then(r => r[0]?.c ?? 0),
          db.select({ c: sql<number>`count(*)::int` }).from(productVariants).then(r => r[0]?.c ?? 0),
          db.select({ c: sql<number>`count(*)::int` }).from(orders).then(r => r[0]?.c ?? 0),
          db.select({ c: sql<number>`count(*)::int` }).from(users).then(r => r[0]?.c ?? 0),
          db.select({ c: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending_payment")).then(r => r[0]?.c ?? 0),
          db.select({ c: sql<number>`count(*)::int` }).from(productVariants).where(sql`${productVariants.stock} < 10`).then(r => r[0]?.c ?? 0),
          db.select({ avg: sql<string>`coalesce(avg(${orders.totalAmount}::bigint), 0)::text` }).from(orders).then(r => r[0]?.avg ?? "0"),
        ]);
        const [totalRev] = await db.select({ sum: sql<string>`coalesce(sum(${orders.totalAmount}::bigint), 0)::text` }).from(orders).where(sql`${orders.status} NOT IN ('pending_payment', 'cancelled')`);
        const [todayRev] = await db.select({ sum: sql<string>`coalesce(sum(${orders.totalAmount}::bigint), 0)::text` }).from(orders).where(and(sql`${orders.status} NOT IN ('pending_payment', 'cancelled')`, gte(orders.createdAt, new Date(new Date().setHours(0, 0, 0, 0)))));
        data = {
          products: prod, variants: vr, orders: ord, users: usr,
          pendingOrders: pend, lowStockItems: lowS,
          avgOrderValue: avg, totalRevenue: totalRev?.sum ?? "0",
          todayRevenue: todayRev?.sum ?? "0",
        };
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
