import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, userAddresses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // گرفتن همه سفارش‌ها
  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  // گرفتن همه اقلام با یک query
  const orderIds = userOrders.map((o) => o.id);
  const allItems = orderIds.length > 0
    ? await db.select().from(orderItems)
    : [];

  const itemsByOrder: Record<number, typeof allItems> = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  // گرفتن آدرس‌ها
  const addresses = await db
    .select()
    .from(userAddresses)
    .where(eq(userAddresses.userId, user.id))
    .orderBy(desc(userAddresses.isDefault));

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      }}
      orders={userOrders}
      itemsByOrder={itemsByOrder}
      addresses={addresses}
    />
  );
}
