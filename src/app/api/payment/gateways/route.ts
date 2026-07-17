import { NextResponse } from "next/server";
import { getAvailablePaymentGateways } from "@/lib/payment-availability";
import { getSetting } from "@/lib/settings";
import { db } from "@/db";
import { shippingMethods } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const gateways = await getAvailablePaymentGateways();

  // خواندن روش‌های ارسال از دیتابیس
  const methods = await db
    .select()
    .from(shippingMethods)
    .orderBy(asc(shippingMethods.sortOrder));

  const shippingMethodsList = methods.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    cost: m.cost,
    freeThreshold: m.freeThreshold,
    deliveryDays: m.deliveryDays,
    isFree: m.isFree,
  }));

  // همچنین تنظیمات قدیمی را برای سازگاری برمی‌گردانیم
  const shippingFee = Number(await getSetting<number>("store.shipping.fee", "general")) || 25000;
  const freeShippingThreshold = Number(await getSetting<number>("store.shipping.free_threshold", "general")) || 5000000;

  return NextResponse.json({
    ok: true,
    gateways,
    shipping: {
      fee: shippingFee,
      freeThreshold: freeShippingThreshold,
    },
    shippingMethods: shippingMethodsList,
  });
}
