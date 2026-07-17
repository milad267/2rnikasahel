import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, orderTracking, shippingMethods } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { formatRial } from "@/lib/utils";
import { PayNowButton } from "@/components/orders/PayNowButton";
import { ArrowRight, MapPin, Receipt, Package, Truck, Clock, ExternalLink } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "در انتظار پرداخت", color: "amber" },
  paid: { label: "پرداخت‌شده", color: "blue" },
  processing: { label: "در حال آماده‌سازی", color: "indigo" },
  shipped: { label: "ارسال‌شده", color: "petrol" },
  delivered: { label: "تحویل‌شده", color: "green" },
  cancelled: { label: "لغوشده", color: "red" },
};

const TRACKING_ICONS: Record<string, string> = {
  processing: "📦",
  picked_up: "📮",
  in_transit: "🚚",
  out_for_delivery: "🚛",
  delivered: "✅",
  failed_attempt: "❌",
  returned: "↩️",
  customs: "🏛️",
  warehouse: "🏭",
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${orderNumber}`);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, user.id)))
    .limit(1);

  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending_payment;
  const isPending = order.status === "pending_payment";

  // دریافت رویدادهای رهگیری
  const trackingEvents = order.status === "shipped" || order.status === "delivered"
    ? await db
        .select()
        .from(orderTracking)
        .where(eq(orderTracking.orderId, order.id))
        .orderBy(desc(orderTracking.createdAt))
    : [];

  // دریافت اطلاعات روش ارسال
  let shippingMethod: { title: string; logo: string | null; trackingBaseUrl: string | null } | null = null;
  if (order.shippingMethodId) {
    const [method] = await db
      .select({
        title: shippingMethods.title,
        logo: shippingMethods.logo,
        trackingBaseUrl: shippingMethods.trackingBaseUrl,
      })
      .from(shippingMethods)
      .where(eq(shippingMethods.id, order.shippingMethodId))
      .limit(1);
    shippingMethod = method || null;
  }

  const lastTrackingCode = trackingEvents.find(e => e.trackingCode)?.trackingCode || null;
  const trackingUrl = shippingMethod?.trackingBaseUrl && lastTrackingCode
    ? `${shippingMethod.trackingBaseUrl}${lastTrackingCode}`
    : null;

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6 lg:pt-44">
      <div className="mx-auto max-w-3xl">
        {/* هدر */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-gradient-navy text-2xl font-black sm:text-3xl">پیگیری سفارش</h1>
            <p className="mt-1 text-xs text-charcoal-500 sm:text-sm">
              شماره سفارش: <span className="font-bold text-navy-900">#{order.orderNumber}</span>
            </p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-1.5 rounded-full border border-navy-900/10 px-4 py-2 text-xs font-semibold text-navy-900 transition-all hover:bg-navy-900/[0.04]"
          >
            حساب کاربری
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>

        {/* وضعیت و تایم‌لاین */}
        <div className="card rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                  st.color === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : st.color === "green"
                      ? "bg-green-100 text-green-700"
                      : st.color === "red"
                        ? "bg-red-100 text-red-600"
                        : st.color === "petrol"
                          ? "bg-petrol-100 text-petrol-700"
                          : "bg-blue-100 text-blue-700"
                }`}
              >
                {st.label}
              </span>
              {shippingMethod && (
                <span className="rounded-full bg-navy-100 px-3 py-1 text-[10px] font-semibold text-navy-700">
                  {shippingMethod.logo || ""} {shippingMethod.title}
                </span>
              )}
            </div>
            <span className="text-[11px] text-charcoal-500">
              تاریخ ثبت: {new Date(order.createdAt).toLocaleDateString("fa-IR")}
            </span>
          </div>

          {/* تایم‌لاین رهگیری پویا */}
          {order.status !== "cancelled" && order.status !== "pending_payment" && (
            <div className="mt-8">
              {trackingEvents.length > 0 ? (
                <div className="relative pr-7">
                  {/* خط عمودی */}
                  <div className="absolute right-[9px] top-1 bottom-1 w-0.5 bg-petrol-200" />

                  {trackingEvents.map((event, index) => {
                    const icon = TRACKING_ICONS[event.status] || "📋";
                    const isLast = index === trackingEvents.length - 1;
                    return (
                      <div key={event.id} className={`relative flex gap-4 ${isLast ? "" : "pb-6"}`}>
                        {/* دایره روی خط */}
                        <div className="absolute -right-[15px] top-0 z-10 flex size-[18px] items-center justify-center rounded-full bg-petrol-50 border-2 border-petrol-200 text-xs">
                          {icon}
                        </div>
                        {/* محتوا */}
                        <div className="flex-1 mr-4 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-navy-900">{event.title}</p>
                              <p className="text-[11px] text-charcoal-500">{event.description}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-charcoal-400 whitespace-nowrap">
                              {new Date(event.createdAt).toLocaleDateString("fa-IR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {event.trackingCode && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-petrol-50 px-2.5 py-0.5 text-[10px] font-medium text-petrol-700">
                                🏷️ کد رهگیری: {event.trackingCode}
                              </span>
                            )}
                            {event.location && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-[10px] font-medium text-navy-700">
                                <MapPin className="size-3" /> {event.location}
                              </span>
                            )}
                            {event.estimatedDelivery && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
                                <Clock className="size-3" /> تحویل تخمینی: {new Date(event.estimatedDelivery).toLocaleDateString("fa-IR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : order.status === "shipped" || order.status === "delivered" ? (
                <div className="rounded-2xl border-2 border-dashed border-petrol-200 p-6 text-center">
                  <Truck className="mx-auto size-8 text-petrol-300 mb-2" />
                  <p className="text-sm font-bold text-navy-900">سفارش شما ارسال شده است</p>
                  <p className="mt-1 text-xs text-charcoal-500">
                    اطلاعات رهگیری به‌زودی اضافه خواهد شد
                  </p>
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-petrol-600 px-4 py-2 text-xs font-semibold text-white hover:bg-petrol-500"
                    >
                      <ExternalLink className="size-3.5" />
                      رهگیری در {shippingMethod?.title || "سایت پست"}
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-navy-200 p-6 text-center">
                  <Package className="mx-auto size-8 text-navy-300 mb-2" />
                  <p className="text-sm font-bold text-navy-900">سفارش در حال آماده‌سازی است</p>
                  <p className="mt-1 text-xs text-charcoal-500">
                    پس از ارسال سفارش، اطلاعات رهگیری در این بخش نمایش داده می‌شود
                  </p>
                </div>
              )}
            </div>
          )}

          {isPending && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800">
                این سفارش هنوز پرداخت نشده است. برای تکمیل خرید، پرداخت را انجام دهید.
              </p>
              <div className="mt-3">
                <PayNowButton orderId={order.id} />
              </div>
            </div>
          )}
        </div>

        {/* اقلام سفارش */}
        <div className="card mt-6 rounded-[2rem] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Package className="size-5 text-petrol-600" strokeWidth={1.8} />
            اقلام سفارش ({items.length})
          </h2>
          <div className="mt-4 space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl bg-navy-900/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-bold text-navy-900">{it.productTitle}</p>
                  <p className="mt-0.5 text-[10px] text-charcoal-500">
                    {it.variantTitle} × {it.quantity}
                    {it.sku ? ` · کد: ${it.sku}` : ""}
                  </p>
                </div>
                <span className="text-xs font-semibold text-navy-900">{formatRial(it.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-navy-900/10 pt-4">
            <span className="text-sm font-bold text-navy-900">مبلغ کل سفارش</span>
            <span className="text-lg font-black text-petrol-700">{formatRial(order.totalAmount)}</span>
          </div>
          {order.paymentRef && (
            <p className="mt-2 text-[11px] text-charcoal-500">
              کد پیگیری پرداخت: <span className="font-mono">{order.paymentRef}</span>
            </p>
          )}
        </div>

        {/* آدرس ارسال */}
        <div className="card mt-6 rounded-[2rem] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <MapPin className="size-5 text-petrol-600" strokeWidth={1.8} />
            آدرس ارسال
          </h2>
          <p className="mt-3 text-xs leading-6 text-charcoal-500">{order.shippingAddress}</p>
          {order.notes && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-charcoal-500">
              <Receipt className="mt-0.5 size-3.5" />
              یادداشت: {order.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
