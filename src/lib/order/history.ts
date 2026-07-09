import { db } from "@/db";
import { orderHistory, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const ACTION_LABELS: Record<string, string> = {
  order_created: "سفارش ایجاد شد",
  status_changed: "وضعیت تغییر کرد",
  tracking_added: "کد رهگیری ثبت شد",
  tracking_updated: "کد رهگیری تغییر کرد",
  payment_confirmed: "پرداخت تأیید شد",
  payment_failed: "پرداخت ناموفق",
  note_added: "یادداشت اضافه شد",
  sms_sent: "پیامک ارسال شد",
  refunded: "مبلغ برگردانده شد",
  cancelled: "سفارش لغو شد",
};

export async function logOrderHistory({
  orderId, userId, action, oldValue, newValue, note,
}: {
  orderId: number;
  userId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}) {
  await db.insert(orderHistory).values({ orderId, userId, action, oldValue: oldValue || null, newValue: newValue || null, note: note || null });
}

export async function getOrderHistory(orderId: number) {
  return db.select({
    id: orderHistory.id,
    action: orderHistory.action,
    oldValue: orderHistory.oldValue,
    newValue: orderHistory.newValue,
    note: orderHistory.note,
    createdAt: orderHistory.createdAt,
    userName: users.name,
  }).from(orderHistory)
    .leftJoin(users, eq(orderHistory.userId, users.id))
    .where(eq(orderHistory.orderId, orderId))
    .orderBy(desc(orderHistory.createdAt));
}
