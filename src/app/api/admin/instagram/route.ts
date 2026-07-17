import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  instagramAccounts,
  instagramPosts,
  instagramDmRules,
  instagramConversations,
  siteSettings,
} from "@/db/schema";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/** دریافت آمار کلی داشبورد اینستاگرام */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const [accountsCount] = await db
      .select({ value: count() })
      .from(instagramAccounts);

    const [activeAccounts] = await db
      .select({ value: count() })
      .from(instagramAccounts)
      .where(eq(instagramAccounts.isActive, true));

    const [connectedAccounts] = await db
      .select({ value: count() })
      .from(instagramAccounts)
      .where(eq(instagramAccounts.loginStatus, "connected"));

    const [draftsCount] = await db
      .select({ value: count() })
      .from(instagramPosts)
      .where(eq(instagramPosts.status, "draft"));

    const [scheduledCount] = await db
      .select({ value: count() })
      .from(instagramPosts)
      .where(eq(instagramPosts.status, "scheduled"));

    const [publishedCount] = await db
      .select({ value: count() })
      .from(instagramPosts)
      .where(eq(instagramPosts.status, "published"));

    const [failedCount] = await db
      .select({ value: count() })
      .from(instagramPosts)
      .where(eq(instagramPosts.status, "failed"));

    const [dmRulesCount] = await db
      .select({ value: count() })
      .from(instagramDmRules)
      .where(eq(instagramDmRules.isActive, true));

    // آخرین پست‌های منتشر شده
    const recentPosts = await db
      .select()
      .from(instagramPosts)
      .where(eq(instagramPosts.status, "published"))
      .orderBy(desc(instagramPosts.publishedAt))
      .limit(5);

    // پست‌های آماده ارسال (scheduled)
    const upcomingPosts = await db
      .select()
      .from(instagramPosts)
      .where(eq(instagramPosts.status, "scheduled"))
      .orderBy(desc(instagramPosts.scheduledAt))
      .limit(5);

    const accounts = await db.select().from(instagramAccounts).orderBy(desc(instagramAccounts.createdAt));

    return NextResponse.json({
      ok: true,
      stats: {
        totalAccounts: Number(accountsCount.value),
        activeAccounts: Number(activeAccounts.value),
        connectedAccounts: Number(connectedAccounts.value),
        draftPosts: Number(draftsCount.value),
        scheduledPosts: Number(scheduledCount.value),
        publishedPosts: Number(publishedCount.value),
        failedPosts: Number(failedCount.value),
        activeDmRules: Number(dmRulesCount.value),
      },
      accounts,
      recentPosts,
      upcomingPosts,
    });
  } catch (error) {
    return safeErrorResponse(error, "instagram-overview");
  }
}
