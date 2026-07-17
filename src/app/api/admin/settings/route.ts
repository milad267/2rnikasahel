import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { asc, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { clearSettingsCache } from "@/lib/settings";
import { requireAdmin } from "@/lib/admin-security";
import { getAllowedModules, hasModuleAccess } from "@/lib/admin-permissions-server";
import { safeErrorResponse } from "@/lib/safe-error";
import { decrypt, encrypt, isEncrypted } from "@/lib/encryption";
import { clearPaymentCache } from "@/lib/payment";


export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const data = await db.select().from(siteSettings).where(ne(siteSettings.group, "chat")).orderBy(asc(siteSettings.key));
  // رمزگشایی رمز SMTP در پاسخ
  const decrypted = data.map(row => {
    if (row.key === "email.smtp.pass" && typeof row.value === "string" && isEncrypted(row.value)) {
      try { return { ...row, value: decrypt(row.value) }; } catch { /* ignore */ }
    }
    return row;
  });
  if (auth.user!.role === "superadmin") return NextResponse.json({ ok: true, data: decrypted });
  const modules = await getAllowedModules(auth.user!.id, auth.user!.role);
  const filtered = decrypted.filter(row => {
    if (row.group === "ai") return modules.includes("ai") && !row.key.startsWith("ai.agent_permissions.");
    return modules.includes("settings");
  });
  return NextResponse.json({ ok: true, data: filtered });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const key = String(body.key || "").trim();
    const value = body.value;
    const group = String(body.group || "site").trim();
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    if (key.startsWith("ai.agent_permissions.") && user.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "فقط مدیر اصلی می‌تواند دسترسی ایجنت‌ها را تغییر دهد." }, { status: 403 });
    }
    const requiredModule = group === "ai" || key.startsWith("ai.") ? "ai" : "settings";
    if (!await hasModuleAccess(user.id, user.role, requiredModule)) {
      return NextResponse.json({ ok: false, error: "شما مجوز تغییر این تنظیمات را ندارید." }, { status: 403 });
    }
    // رمزنگاری خودکار رمز SMTP
    let finalValue = value;
    if (key === "email.smtp.pass" && typeof value === "string" && !isEncrypted(value)) {
      finalValue = encrypt(value);
    }
    await db.insert(siteSettings).values({ key, value: finalValue, group, locale: "fa" })
      .onConflictDoUpdate({ target: [siteSettings.key, siteSettings.locale], set: { value: finalValue, group } });
    // پاک‌سازی کش تا مقدار جدید بلافاصله در سایت اعمال شود
    clearSettingsCache(key, group);
    clearSettingsCache(key, "general");
    // پاک‌سازی کش درگاه پرداخت اگر تنظیمات مربوط به پرداخت تغییر کند
    if (group === "payment" || key.startsWith("payment.")) {
      clearPaymentCache();
    }
    return NextResponse.json({ ok: true });

  } catch (error) {
    return safeErrorResponse(error, "settings-update");
  }
}
