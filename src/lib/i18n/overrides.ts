import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Dictionary } from "./dictionaries";

/**
 * متن‌های صفحه اصلی (لندینگ) که در پنل ادمین قابل ویرایش هستند از دیتابیس خوانده
 * و روی دیکشنری پایه اعمال می‌شوند. کلیدها به‌صورت `landing.<path>` در گروه
 * "landing" ذخیره می‌شوند (مثلاً `landing.hero.title`).
 */
export async function applyLandingOverrides(base: Dictionary): Promise<Dictionary> {
  try {
    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.group, "landing"));

    if (!rows.length) return base;

    const clone = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    for (const row of rows) {
      if (!row.key.startsWith("landing.")) continue;
      const path = row.key.replace(/^landing\./, "");
      const raw = row.value;
      const val = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
      if (!val) continue; // نادیده گرفتن مقادیر خالی — استفاده از مقدار پیش‌فرض دیکشنری
      setPath(clone, path, val);
    }
    return clone as unknown as Dictionary;
  } catch {
    return base;
  }
}

function setPath(obj: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}
