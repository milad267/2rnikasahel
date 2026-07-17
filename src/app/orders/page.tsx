import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, orderTracking, shippingMethods } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { formatRial } from "@/lib/utils";
import { Package, ArrowLeft, Clock, CheckCircle2, XCircle, Truck, MapPin } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت شده",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending_payment: Clock,
  paid: CheckCircle2,
  processing: Clock,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "text-amber-600 bg-amber-50",
  paid: "text-emerald-600 bg-emerald-50",
  processing: "text-blue-600 bg-blue-50",
  shipped: "text-purple-600 bg-purple-50",
  delivered: "text-green-600 bg-green-50",
  cancelled: "text-red-600 bg-red-50",
};

const TRACKING_STATUS_LABELS: Record<string, string> = {
  picked_up: "تحویل پیک شد",
  in_transit: "در مسیر ارسال",
  out_for_delivery: "خارج از مرکز توزیع",
  delivered: "تحویل داده شد",
};

const TRACKING_ICONS: Record<string, string> = {
  picked_up: "📮",
  in_transit: "🚚",
  out_for_delivery: "🚛",
  delivered: "✅",
  failed_attempt: "❌",
  returned: "↩️",
  customs: "🏛️",
  warehouse: "🏭",
};

type OrderWithTracking = typeof orders.$inferSelect & {
  latestTrackingStatus: string | null;
  trackingCode: string | null;
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  const orderIds = userOrders.map((o) => o.id);
  const allItems = orderIds.length > 0
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];

  const itemsByOrder: Record<number, typeof allItems> = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  // دریافت آخرین رویداد رهگیری برای سفارش‌های ارسال‌شده
  const shippedOrderIds = userOrders.filter(o => ["shipped", "delivered"].includes(o.status)).map(o => o.id);
  const trackingEvents = shippedOrderIds.length > 0
    ? await db
        .select()
        .from(orderTracking)
        .where(inArray(orderTracking.orderId, shippedOrderIds))
        .orderBy(desc(orderTracking.createdAt))
    : [];

  // نگاشت آخرین رویداد رهگیری به هر سفارش
  const latestTrackingByOrder: Record<number, typeof orderTracking.$inferSelect> = {};
  for (const event of trackingEvents) {
    if (!latestTrackingByOrder[event.orderId]) {
      latestTrackingByOrder[event.orderId] = event;
    }
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-gradient-navy text-3xl font-black sm:text-4xl">سفارشات من</h1>
            <p className="mt-1 text-sm text-charcoal-500">{userOrders.length} سفارش</p>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-petrol-600 px-4 py-2 text-xs font-semibold text-white hover:bg-petrol-500">
            <ArrowLeft className="size-3.5" strokeWidth={1.8} /> ادامه خرید
          </Link>
        </div>

        {userOrders.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center">
            <Package className="size-12 text-charcoal-400" strokeWidth={1.3} />
            <p className="text-charcoal-500">هنوز سفارشی ثبت نکرده‌اید</p>
            <Link href="/shop" className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-white">مشاهده محصولات</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {userOrders.map((order) => {
              const StatusIcon = STATUS_ICONS[order.status] || Clock;
              const items = itemsByOrder[order.id] || [];
              const latestTracking = latestTrackingByOrder[order.id];
              const trackingLabel = latestTracking
                ? (TRACKING_STATUS_LABELS[latestTracking.status] || latestTracking.title)
                : null;

              return (
                <div key={order.id} className="card rounded-[1.75rem] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-navy-900">{order.orderNumber}</span>
                      <span className="mr-3 text-[10px] text-charcoal-500">
                        {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_COLORS[order.status] || "text-slate-600 bg-slate-50"}`}>
                      <StatusIcon className="size-3" strokeWidth={1.7} />
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  {/* نمایش وضعیت رهگیری */}
                  {latestTracking && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-petrol-50 px-3 py-2 text-[10px]">
                      <span className="text-xs">
                        {TRACKING_ICONS[latestTracking.status] || "📦"}
                      </span>
                      <span className="font-medium text-petrol-800">
                        {trackingLabel}
                      </span>
                      {latestTracking.location && (
                        <span className="flex items-center gap-1 text-charcoal-500">
                          <MapPin className="size-2.5" />
                          {latestTracking.location}
                        </span>
                      )}
                      {latestTracking.trackingCode && (
                        <span className="mr-auto text-charcoal-400 font-mono">
                          🏷️ {latestTracking.trackingCode}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 border-t border-navy-900/5 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-charcoal-500">{items.length} کالا</span>
                      <span className="font-bold text-navy-900">{formatRial(order.totalAmount)}</span>
                    </div>
                  </div>
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-petrol-600 hover:text-petrol-500"
                  >
                    مشاهده جزئیات <ArrowLeft className="size-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
