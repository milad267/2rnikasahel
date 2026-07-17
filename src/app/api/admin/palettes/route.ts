import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PALETTES } from "@/lib/palettes";
import { getCurrentUser } from "@/lib/auth";
import { clearSettingsCache } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const current = await db.select({ value: siteSettings.value })
    .from(siteSettings)
    .where(and(eq(siteSettings.key, "site.color_palette"), eq(siteSettings.group, "general")))
    .limit(1);

  const activeSlug = (current[0]?.value as string) || "navy-petrol";
  return NextResponse.json({ ok: true, palettes: PALETTES, active: activeSlug });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { slug } = await req.json();
  const exists = PALETTES.find(p => p.slug === slug);
  if (!exists) {
    return NextResponse.json({ ok: false, error: "پالت یافت نشد" }, { status: 404 });
  }

  await db.insert(siteSettings).values({
    key: "site.color_palette", group: "general", value: slug, locale: "fa",
  }).onConflictDoUpdate({
    target: [siteSettings.key, siteSettings.locale],
    set: { value: slug, updatedAt: new Date() },
  });

  // پاک‌سازی کش
  clearSettingsCache("site.color_palette", "general");

  return NextResponse.json({ ok: true, palette: exists });
}
