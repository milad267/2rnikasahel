import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const KEY = "site.stock_alerts";

export const dynamic = "force-dynamic";

async function getAlerts() {
  try {
    const [row] = await db.select({ value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.key, KEY), eq(siteSettings.locale, "fa"))).limit(1);
    return (row?.value as any[]) || [];
  } catch { return []; }
}

async function saveAlerts(alerts: any[]) {
  await db.insert(siteSettings).values({ key: KEY, value: JSON.stringify(alerts), locale: "fa", group: "alerts" })
    .onConflictDoUpdate({ target: [siteSettings.key, siteSettings.locale], set: { value: JSON.stringify(alerts), updatedAt: new Date() } });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید" }, { status: 401 });

  const { variantId, productSlug, productTitle, variantName } = await req.json();
  if (!variantId) return NextResponse.json({ ok: false, error: "variantId required" }, { status: 400 });

  const alerts = await getAlerts();
  const existing = alerts.find((a: any) => a.userId === user.id && a.variantId === variantId);
  if (existing) return NextResponse.json({ ok: false, error: "قبلاً ثبت نام کرده‌اید" }, { status: 409 });

  alerts.push({
    id: Date.now().toString(),
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    variantId, productSlug, productTitle, variantName,
    notified: false,
    createdAt: new Date().toISOString(),
  });
  await saveAlerts(alerts);

  return NextResponse.json({ ok: true, message: "وقتی محصول موجود شد، به شما اطلاع می‌دهیم" });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const alerts = await getAlerts();
  return NextResponse.json({ ok: true, alerts: alerts.filter((a: any) => a.userId === user.id) });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const alerts = await getAlerts();
  await saveAlerts(alerts.filter((a: any) => !(a.id === id && a.userId === user.id)));
  return NextResponse.json({ ok: true });
}
