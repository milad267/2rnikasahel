import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Simple store: use site_settings to store reviews as JSON
const STORAGE_KEY = "product_reviews";

async function getReviews(productId: number) {
  try {
    const { siteSettings } = await import("@/db/schema");
    const [row] = await db.select({ value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.key, `${STORAGE_KEY}_${productId}`), eq(siteSettings.locale, "fa")))
      .limit(1);
    return (row?.value as any[]) || [];
  } catch { return []; }
}

async function saveReviews(productId: number, reviews: any[]) {
  const { siteSettings } = await import("@/db/schema");
  await db.insert(siteSettings).values({
    key: `${STORAGE_KEY}_${productId}`,
    value: JSON.stringify(reviews),
    locale: "fa",
    group: "reviews",
  }).onConflictDoUpdate({
    target: [siteSettings.key, siteSettings.locale],
    set: { value: JSON.stringify(reviews), updatedAt: new Date() },
  });
}

export async function GET(req: NextRequest) {
  const productId = Number(req.nextUrl.searchParams.get("id"));
  if (!productId) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const reviews = await getReviews(productId);
  // Only return approved reviews for non-admin
  const approved = reviews.filter((r: any) => r.isApproved !== false);
  return NextResponse.json({ ok: true, reviews: approved });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً ابتدا وارد شوید" }, { status: 401 });

  const body = await req.json();
  const { productId, rating, title, comment } = body;
  if (!productId || !rating || !comment?.trim()) {
    return NextResponse.json({ ok: false, error: "rating و comment الزامی است" }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "امتیاز باید بین ۱ تا ۵ باشد" }, { status: 400 });
  }

  const reviews = await getReviews(productId);
  const newReview = {
    id: Date.now(),
    productId,
    userId: user.id,
    userName: user.name,
    rating,
    title: title?.trim() || "",
    comment: comment.trim(),
    isApproved: false,
    createdAt: new Date().toISOString(),
  };

  reviews.unshift(newReview);
  await saveReviews(productId, reviews);

  return NextResponse.json({ ok: true, review: newReview });
}
