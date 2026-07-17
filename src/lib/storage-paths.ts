import path from "node:path";

function applicationDataRoot() {
  if (process.env.APP_DATA_DIR?.trim()) return path.resolve(/* turbopackIgnore: true */ process.env.APP_DATA_DIR.trim());
  const cwd = process.cwd();
  const standaloneSuffix = `${path.sep}.next${path.sep}standalone`;
  return cwd.endsWith(standaloneSuffix)
    ? path.resolve(/* turbopackIgnore: true */ cwd, "..", "..", "storage")
    : path.join(/* turbopackIgnore: true */ cwd, "storage");
}

/** ─── مسیرهای پایدار — همه زیر APP_DATA_DIR ─── */
export const CHAT_STORAGE = path.join(applicationDataRoot(), "chat");
export const SETUP_STORAGE = path.join(applicationDataRoot(), "setup");
export const AUDIT_LOG = path.join(applicationDataRoot(), "audit.log");

/** فایل‌های عمومی (تصاویر محصول، بلاگ، اسلایدر) — قابل سرو از route امن */
export const UPLOAD_PUBLIC_DIR = path.join(applicationDataRoot(), "uploads", "public");

/** فایل‌های خصوصی (پیوست چت، فایل ادمین، مدارک) — فقط با permission */
export const UPLOAD_PRIVATE_DIR = path.join(applicationDataRoot(), "uploads", "private");

/** مسیر بکاپ‌ها — خارج از public و .next */
export const BACKUP_DIR = path.join(applicationDataRoot(), "backups");

/** دسته‌های مجاز آپلود ادمین */
export const ALLOWED_UPLOAD_CATEGORIES = [
  "product",
  "blog",
  "slide",
  "brand",
  "category",
  "general",
  "banner",
  "private",
  "document",
  "avatar",
] as const;

export type AllowedUploadCategory = (typeof ALLOWED_UPLOAD_CATEGORIES)[number];

export { applicationDataRoot };
