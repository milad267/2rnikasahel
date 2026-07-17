/**
 * سیستم سطح دسترسی ادمین — تعریف ماژول‌ها
 *
 * این فایل فقط شامل ثابت‌ها و تایپ‌هاست و سمت کلاینت هم قابل استفاده است.
 * توابع دیتابیسی در فایل مجزای admin-permissions-server.ts قرار دارند.
 */

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
  { key: "ai", label: "هوش مصنوعی", icon: "Sparkles" },
  { key: "blog", label: "بلاگ و محتوا", icon: "FileText" },
  { key: "ai-price", label: "هوش مصنوعی قیمت", icon: "Cpu" },
  { key: "uploads", label: "آپلود فایل", icon: "Upload" },
  { key: "sms", label: "ارسال‌دهندگان SMS", icon: "MessageSquare" },
  { key: "admins", label: "مدیریت ادمین‌ها", icon: "ShieldCheck" },
  { key: "instagram", label: "مدیریت اینستاگرام", icon: "Instagram" },
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number]["key"];
