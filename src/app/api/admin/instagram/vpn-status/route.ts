import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/instagram/vpn-status
 * دریافت وضعیت VPN تمام اکانت‌ها
 * 
 * GET /api/admin/instagram/vpn-status?checkAll=true
 * بررسی وضعیت همه اکانت‌ها و به‌روزرسانی خودکار
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const checkAll = searchParams.get("checkAll") === "true";
    const accountId = searchParams.get("id") ? Number(searchParams.get("id")) : null;

    if (checkAll) {
      // بررسی همه اکانت‌های فعال دارای VPN
      const accounts = await db
        .select()
        .from(instagramAccounts)
        .where(
          and(
            eq(instagramAccounts.useProxy, true),
            isNotNull(instagramAccounts.v2rayLink),
          ),
        );

      const results = [];
      for (const acc of accounts) {
        const status = await checkVpnStatus(acc);
        results.push({
          id: acc.id,
          username: acc.username,
          status: status.status,
          latency: status.latency,
          lastPingAt: status.lastPingAt,
        });
      }

      return NextResponse.json({ ok: true, accounts: results });
    }

    if (accountId) {
      // بررسی یک اکانت مشخص
      const [account] = await db
        .select()
        .from(instagramAccounts)
        .where(eq(instagramAccounts.id, accountId));

      if (!account) {
        return NextResponse.json(
          { ok: false, error: "اکانت یافت نشد" },
          { status: 404 },
        );
      }

      const result = await checkVpnStatus(account);
      return NextResponse.json({ ok: true, ...result });
    }

    // فقط دریافت وضعیت فعلی همه اکانت‌ها
    const allAccounts = await db
      .select({
        id: instagramAccounts.id,
        username: instagramAccounts.username,
        vpnStatus: instagramAccounts.vpnStatus,
        lastPingAt: instagramAccounts.lastPingAt,
        useProxy: instagramAccounts.useProxy,
        vpnAlertEnabled: instagramAccounts.vpnAlertEnabled,
        v2rayLink: instagramAccounts.v2rayLink,
      })
      .from(instagramAccounts)
      .where(eq(instagramAccounts.useProxy, true));

    return NextResponse.json({ ok: true, accounts: allAccounts });
  } catch (error) {
    return safeErrorResponse(error, "instagram-vpn-status");
  }
}

/**
 * POST /api/admin/instagram/vpn-status
 * به‌روزرسانی وضعیت VPN یک اکانت خاص
 * Body: { id: number }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "شناسه اکانت الزامی است" },
        { status: 400 },
      );
    }

    const [account] = await db
      .select()
      .from(instagramAccounts)
      .where(eq(instagramAccounts.id, id));

    if (!account) {
      return NextResponse.json(
        { ok: false, error: "اکانت یافت نشد" },
        { status: 404 },
      );
    }

    const result = await checkVpnStatus(account);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeErrorResponse(error, "instagram-vpn-status-update");
  }
}

/**
 * بررسی وضعیت VPN یک اکانت و به‌روزرسانی دیتابیس
 */
async function checkVpnStatus(account: any) {
  const net = await import("net");
  const host = extractHost(account.v2rayLink);
  const port = extractPort(account.v2rayLink) || 443;

  let status = "disconnected";
  let latency: number | null = null;
  let lastPingAt = new Date();

  if (host) {
    try {
      const startTime = Date.now();
      const reachable = await tcpCheck(net, host, port, 3000);
      latency = Date.now() - startTime;
      status = reachable ? "connected" : "disconnected";
    } catch {
      status = "disconnected";
      latency = null;
    }
  }

  // به‌روزرسانی دیتابیس
  await db
    .update(instagramAccounts)
    .set({
      vpnStatus: status,
      lastPingAt,
    })
    .where(eq(instagramAccounts.id, account.id));

  const needsAlert =
    status === "disconnected" &&
    account.vpnAlertEnabled &&
    account.useProxy;

  if (needsAlert) {
    //TODO: Send notification/alert to admin (could be via socket, email, or in-app notification)
  }

  return { status, latency, host, port, lastPingAt, needsAlert };
}

/**
 * استخراج هاست از لینک V2Ray
 */
function extractHost(link: string | null): string | null {
  if (!link) return null;
  try {
    const match = link.match(/@([^:]+):/);
    if (match) return match[1];
    // vmess:// base64
    if (link.startsWith("vmess://")) {
      const b64 = link.replace("vmess://", "");
      const decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
      return decoded.add || decoded.host || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * استخراج پورت از لینک V2Ray
 */
function extractPort(link: string | null): number | null {
  if (!link) return null;
  try {
    const match = link.match(/:(\d+)(\?|$|#)/);
    if (match) return parseInt(match[1], 10);
    if (link.startsWith("vmess://")) {
      const b64 = link.replace("vmess://", "");
      const decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
      return decoded.port || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * بررسی اتصال TCP
 */
async function tcpCheck(net: any, host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}
