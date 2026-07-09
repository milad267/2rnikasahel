/**
 * سیستم سطح دسترسی ادمین
 *
 * سوپر ادمین: دسترسی کامل به همه ماژول‌ها
 * ادمین معمولی: فقط ماژول‌هایی که سوپر ادمین بهش دسترسی داده
 *
 * ذخیره‌سازی دسترسی‌ها در site_settings با کلید admin.permissions.{userId}
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/** ماژول‌های قابل دسترسی در پنل ادمین */
export const ADMIN_MODULES = [
  { key: "dashboard", label: "داشبورد", icon: "LayoutDashboard" },
  { key: "products", label: "مدیریت محصولات", icon: "Package" },
  { key: "categories", label: "دسته‌بندی‌ها", icon: "Folders" },
  { key: "orders", label: "سفارشات", icon: "ShoppingBag" },
  { key: "users", label: "کاربران", icon: "Users" },
  { key: "slides", label: "اسلایدها", icon: "Image" },
  { key: "features", label: "ویژگی‌ها", icon: "Star" },
  { key: "settings", label: "تنظیمات سایت", icon: "Settings" },
  { key: "ai-price", label: "هوش مصنوعی قیمت", icon: "Cpu" },
  { key: "uploads", label: "آپلود فایل", icon: "Upload" },
  { key: "sms", label: "ارسال‌دهندگان SMS", icon: "MessageSquare" },
  { key: "admins", label: "مدیریت ادمین‌ها", icon: "ShieldCheck" },
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number]["key"];

/** گرفتن لیست ماژول‌های مجاز برای یک کاربر */
export async function getAllowedModules(userId: number, role: string): Promise<AdminModule[]> {
  // سوپر ادمین به همه ماژول‌ها دسترسی دارد
  if (role === "superadmin") {
    return ADMIN_MODULES.map((m) => m.key);
  }

  // ادمین معمولی: دسترسی‌ها از site_settings خونده میشه
  if (role === "admin") {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(
        and(
          eq(siteSettings.key, `admin.permissions.${userId}`),
          eq(siteSettings.group, "admin"),
        ),
      )
      .limit(1);

    if (row?.value) {
      return (row.value as AdminModule[]) || [];
    }
  }

  return [];
}

/** ذخیره دسترسی‌های یک ادمین معمولی */
export async function setAdminPermissions(
  userId: number,
  modules: AdminModule[],
): Promise<void> {
  await db
    .insert(siteSettings)
    .values({
      key: `admin.permissions.${userId}`,
      group: "admin",
      locale: "fa",
      value: JSON.stringify(modules),
    })
    .onConflictDoUpdate({
      target: [siteSettings.key, siteSettings.locale],
      set: { value: JSON.stringify(modules) },
    });
}

/** بررسی دسترسی به یک ماژول خاص */
export async function hasModuleAccess(
  userId: number,
  role: string,
  module: AdminModule,
): Promise<boolean> {
  if (role === "superadmin") return true;
  if (role !== "admin") return false;

  const allowed = await getAllowedModules(userId, role);
  return allowed.includes(module);
}
