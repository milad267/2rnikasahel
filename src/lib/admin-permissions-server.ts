/**
 * سیستم سطح دسترسی ادمین — فقط سمت سرور
 *
 * این فایل شامل توابعی است که به دیتابیس دسترسی دارند.
 * برای استفاده در API routes و ماژول‌های سرور.
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ADMIN_MODULES, type AdminModule } from "./admin-permissions";

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
      if (Array.isArray(row.value)) return row.value.filter((value): value is AdminModule => ADMIN_MODULES.some(module => module.key === value));
      if (typeof row.value === "string") {
        try {
          const parsed = JSON.parse(row.value);
          return Array.isArray(parsed) ? parsed.filter((value): value is AdminModule => ADMIN_MODULES.some(module => module.key === value)) : [];
        } catch { return []; }
      }
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
      value: modules,
    })
    .onConflictDoUpdate({
      target: [siteSettings.key, siteSettings.locale],
      set: { value: modules },
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
