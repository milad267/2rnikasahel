import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instagramAccounts, instagramPosts, instagramDmRules } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/** دریافت لیست اکانت‌ها */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const accounts = await db
      .select()
      .from(instagramAccounts)
      .orderBy(desc(instagramAccounts.createdAt));

    return NextResponse.json({ ok: true, data: accounts });
  } catch (error) {
    return safeErrorResponse(error, "instagram-accounts-list");
  }
}

/** ایجاد اکانت جدید */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { username, password, v2rayLink } = body;

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 },
      );
    }

    const [newAccount] = await db
      .insert(instagramAccounts)
      .values({
        username,
        password,
        v2rayLink: v2rayLink || null,
        isActive: false,
        loginStatus: "not_connected",
        proxyType: "v2ray",
        useProxy: true,
        vpnStatus: "unknown",
        vpnAlertEnabled: true,
        twoFactorEnabled: false,
        proxyConfig: {},
      })
      .returning();

    return NextResponse.json({ ok: true, data: newAccount }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "instagram-accounts-create");
  }
}

/** ویرایش اکانت */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه اکانت الزامی است" },
        { status: 400 },
      );
    }

    const updateData: Record<string, any> = {};

    if (fields.username !== undefined) updateData.username = fields.username;
    if (fields.password !== undefined) updateData.password = fields.password;
    if (fields.v2rayLink !== undefined) updateData.v2rayLink = fields.v2rayLink;
    if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
    if (fields.loginStatus !== undefined) updateData.loginStatus = fields.loginStatus;
    if (fields.cookieData !== undefined) updateData.cookieData = fields.cookieData;
    if (fields.errorMessage !== undefined) updateData.errorMessage = fields.errorMessage;
    if (fields.followerCount !== undefined) updateData.followerCount = fields.followerCount;
    if (fields.followingCount !== undefined) updateData.followingCount = fields.followingCount;
    if (fields.mediaCount !== undefined) updateData.mediaCount = fields.mediaCount;
    if (fields.proxyType !== undefined) updateData.proxyType = fields.proxyType;
    if (fields.proxyConfig !== undefined) updateData.proxyConfig = fields.proxyConfig;
    if (fields.useProxy !== undefined) updateData.useProxy = fields.useProxy;
    if (fields.vpnStatus !== undefined) updateData.vpnStatus = fields.vpnStatus;
    if (fields.vpnAlertEnabled !== undefined) updateData.vpnAlertEnabled = fields.vpnAlertEnabled;
    if (fields.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = fields.twoFactorEnabled;
    if (fields.twoFactorMethod !== undefined) updateData.twoFactorMethod = fields.twoFactorMethod;
    if (fields.twoFactorSecret !== undefined) updateData.twoFactorSecret = fields.twoFactorSecret;

    const [updated] = await db
      .update(instagramAccounts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(instagramAccounts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "اکانت یافت نشد" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return safeErrorResponse(error, "instagram-accounts-update");
  }
}

/** حذف اکانت */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه اکانت الزامی است" },
        { status: 400 },
      );
    }

    await db.delete(instagramAccounts).where(eq(instagramAccounts.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "instagram-accounts-delete");
  }
}
