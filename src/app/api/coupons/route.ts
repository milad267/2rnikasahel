import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const COUPONS_KEY = "site.coupons";

export const dynamic = "force-dynamic";

async function getCoupons() {
  try {
    const [row] = await db.select({ value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.key, COUPONS_KEY), eq(siteSettings.locale, "fa"))).limit(1);
    if (Array.isArray(row?.value)) return row.value as any[];
    if (typeof row?.value === "string") {
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch { return []; }
}

async function saveCoupons(coupons: any[]) {
  await db.insert(siteSettings).values({ key: COUPONS_KEY, value: coupons, locale: "fa", group: "coupons" })
    .onConflictDoUpdate({ target: [siteSettings.key, siteSettings.locale], set: { value: coupons, updatedAt: new Date() } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const coupons = await getCoupons();
  const now = Date.now();
  const active = coupons.filter((c: any) => c.active !== false && (!c.expiresAt || new Date(c.expiresAt).getTime() > now));
  return NextResponse.json({ ok: true, coupons: active });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin"))
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  const body = await req.json();
  const { code, type, value, minAmount, maxUses, expiresAt } = body;
  const normalizedCode = String(code || "").trim().toUpperCase();
  const numericValue = Number(value);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedCode) || !["percent", "fixed"].includes(type) || !Number.isFinite(numericValue) || numericValue <= 0 || (type === "percent" && numericValue > 100)) {
    return NextResponse.json({ ok: false, error: "اطلاعات کد تخفیف معتبر نیست" }, { status: 400 });
  }

  const coupons = await getCoupons();
  if (coupons.find((c: any) => c.code === normalizedCode))
    return NextResponse.json({ ok: false, error: "این کد تخفیف قبلاً ثبت شده" }, { status: 409 });

  const newCoupon = {
    id: Date.now().toString(),
    code: normalizedCode,
    type: type === "percent" ? "percent" : "fixed",
    value: numericValue,
    minAmount: Number(minAmount) || 0,
    maxUses: Number(maxUses) || 0,
    usedCount: 0,
    active: true,
    expiresAt: expiresAt || null,
    createdAt: new Date().toISOString(),
    createdBy: user.name,
  };
  coupons.unshift(newCoupon);
  await saveCoupons(coupons);
  return NextResponse.json({ ok: true, coupon: newCoupon });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin")
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const coupons = await getCoupons();
  await saveCoupons(coupons.filter((c: any) => c.id !== id));
  return NextResponse.json({ ok: true });
}
