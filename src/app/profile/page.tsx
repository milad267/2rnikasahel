import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentAdminUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, userAddresses } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ProfileClient } from "./ProfileClient";


export default async function ProfilePage() {
  // ابتدا بررسی می‌کنیم آیا ادمین است
  const adminUser = await getCurrentAdminUser();
  
  // اگر ادمین نیست، کاربر عادی را بررسی می‌کنیم
  const user = adminUser || await getCurrentUser();
  
  if (!user) redirect("/login");

  // گرفتن همه سفارش‌ها
  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  // گرفتن اقلام فقط برای سفارش‌های همین کاربر
  const orderIds = userOrders.map((o) => o.id);
  const allItems = orderIds.length > 0
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
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
        phone: user.phone || "",
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        avatar: (user as any).avatar || null,
        birthDate: (user as any).birthDate || null,
      }}
      orders={userOrders}
      itemsByOrder={itemsByOrder}
      addresses={addresses}
    />
  );
}
