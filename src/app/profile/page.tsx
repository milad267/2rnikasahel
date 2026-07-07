import { redirect } from "next/navigation";
import { User, Building2, Phone, MapPin, ShieldCheck, Clock, Package, CheckCircle2, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, userAddresses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatRial } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { OrderTimeline } from "@/components/profile/OrderTimeline";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string; stage: number }> = {
  pending_payment: { label: "در انتظار پرداخت", color: "amber", stage: 0 },
  paid: { label: "پرداخت‌شده", color: "blue", stage: 1 },
  processing: { label: "در حال آماده‌سازی", color: "indigo", stage: 2 },
  shipped: { label: "ارسال‌شده", color: "petrol", stage: 3 },
  delivered: { label: "تحویل‌شده", color: "green", stage: 4 },
  cancelled: { label: "لغوشده", color: "red", stage: 0 },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [userOrders, addresses] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)),
    db.select().from(userAddresses).where(eq(userAddresses.userId, user.id)).orderBy(desc(userAddresses.isDefault)),
  ]);

  const isContractor = user.role === "contractor";

  // گرفتن اقلام برای همه سفارش‌ها
  const allItems = userOrders.length > 0
    ? await db.select().from(orderItems).where(
        eq(orderItems.orderId, userOrders[0].id),
      )
    : [];
  // نگاشت اقلام به هر سفارش
  const itemsByOrder: Record<number, typeof allItems> = {};
  for (const o of userOrders) {
    itemsByOrder[o.id] = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* هدر پروفایل */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-navy-900/10 bg-gradient-to-r from-navy-900/[0.04] via-pearl-100 to-petrol-600/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] sm:size-20">
              {isContractor ? <Building2 className="size-8 sm:size-10" strokeWidth={1.5} /> : <User className="size-8 sm:size-10" strokeWidth={1.5} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">{user.name}</h1>
                <span className="rounded-full bg-petrol-600/15 px-3 py-0.5 text-[10px] font-bold text-petrol-700">
                  {isContractor ? "پیمانکار / B2B" : "مشتری حقیقی"}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500 sm:text-sm" dir="ltr">
                <Phone className="size-3.5" />
                {user.phone}
              </p>
              {isContractor && user.companyName && (
                <p className="mt-1 text-xs font-semibold text-petrol-700">{user.companyName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-pearl-50 shadow-md transition-all hover:bg-petrol-500"
            >
              ثبت سفارش جدید
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* ستون اصلی: تاریخچه سفارش‌ها */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
                <Package className="size-5 text-petrol-600" strokeWidth={1.8} />
                تاریخچه سفارش‌ها ({userOrders.length})
              </h2>
            </div>

            {userOrders.length === 0 ? (
              <div className="card flex flex-col items-center justify-center rounded-[2rem] p-12 text-center">
                <Clock className="size-12 text-charcoal-400" strokeWidth={1.4} />
                <p className="mt-4 text-sm font-medium text-navy-900">هنوز سفارشی ثبت نکرده‌اید</p>
                <p className="mt-1 text-xs text-charcoal-500">برای مشاهده محصولات و ثبت سفارش به فروشگاه مراجعه کنید.</p>
                <Link
                  href="/shop"
                  className="mt-6 rounded-full bg-petrol-600 px-6 py-2.5 text-xs font-semibold text-pearl-50 shadow-md"
                >
                  مشاهده فروشگاه
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((order) => {
                  const items = itemsByOrder[order.id] || [];
                  const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending_payment;
                  return (
                    <div key={order.id} className="card rounded-[1.75rem] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-900/10 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy-900">سفارش #{order.orderNumber}</span>
                          <span className="rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[10px] font-medium text-charcoal-500">
                            {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                            status.color === "amber"
                              ? "bg-amber-100 text-amber-700"
                              : status.color === "green"
                              ? "bg-green-100 text-green-700"
                              : status.color === "red"
                              ? "bg-red-100 text-red-600"
                              : status.color === "petrol"
                              ? "bg-petrol-100 text-petrol-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Timeline بصری */}
                      {order.status !== "cancelled" && (
                        <div className="mt-5">
                          <OrderTimeline currentStage={status.stage} />
                        </div>
                      )}

                      {/* اقلام سفارش */}
                      <div className="mt-5 space-y-2">
                        {items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between rounded-xl bg-navy-900/[0.02] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-xs font-bold text-navy-900">{it.productTitle}</p>
                              <p className="text-[10px] text-charcoal-500">
                                {it.variantTitle} × {it.quantity}
                                {it.sku ? ` · کد: ${it.sku}` : ""}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-navy-900">
                              {formatRial(it.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-navy-900/10 pt-3 text-sm">
                        <span className="text-charcoal-500">مبلغ کل سفارش:</span>
                        <span className="font-black text-navy-900">{formatRial(order.totalAmount, { withUnit: true })}</span>
                      </div>
                      {order.paymentRef && (
                        <p className="mt-1 text-[10px] text-charcoal-500">
                          کد رهگیری پرداخت: <span className="font-mono">{order.paymentRef}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ستون کناری */}
          <div className="space-y-6">
            <div className="card rounded-[2rem] p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <MapPin className="size-5 text-petrol-600" strokeWidth={1.8} />
                آدرس‌های ثبت‌شده ({addresses.length})
              </h2>
              {addresses.length === 0 ? (
                <p className="mt-4 text-xs leading-6 text-charcoal-500">
                  هنوز آدرسی ثبت نکرده‌اید. هنگام ثبت اولین سفارش، آدرس شما به‌صورت خودکار در اینجا ذخیره می‌شود.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-navy-900">{addr.title}</span>
                        {addr.isDefault && (
                          <span className="rounded-full bg-petrol-600/10 px-2 py-0.5 text-[10px] text-petrol-700">
                            پیش‌فرض
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-charcoal-500">
                        {addr.province}، {addr.city}، {addr.postalAddress}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card rounded-[2rem] p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <ShieldCheck className="size-5 text-petrol-600" strokeWidth={1.8} />
                وضعیت امنیت حساب
              </h2>
              <div className="mt-4 space-y-3 text-xs text-charcoal-500">
                <div className="flex items-center justify-between py-1">
                  <span>احراز هویت شماره موبایل</span>
                  <span className="font-semibold text-green-600">تأییدشده</span>
                </div>
                <div className="flex items-center justify-between py-1 border-t border-navy-900/5">
                  <span>سطح دسترسی</span>
                  <span className="font-semibold text-navy-900">{isContractor ? "حساب B2B صنعتی" : "کاربر عادی"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
