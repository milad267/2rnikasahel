import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

/**
 * مقادیر پیش‌فرض (فارسی) متن‌های صفحه اصلی را به‌صورت مسطح (flat) برمی‌گرداند
 * تا ادمین متن فعلی هر فیلد را ببیند.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const dict = getDictionary("fa");
  const flat: Record<string, string> = {};
  flatten(dict as unknown as Record<string, unknown>, "", flat);
  return NextResponse.json({ ok: true, data: flat });
}

function flatten(obj: Record<string, unknown>, prefix: string, out: Record<string, string>) {
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object") {
      flatten(val as Record<string, unknown>, path, out);
    } else if (typeof val === "string") {
      out[path] = val;
    }
  }
}
