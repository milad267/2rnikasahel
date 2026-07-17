import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/instagram/vpn-test
 * تست اتصال به سرور V2Ray با پینگ TCP
 * Body: { link: "vless://...", host?: "example.com", port?: 443 }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    let { link, host, port } = body;

    // اگر لینک داده شده، هاست و پورت را از آن استخراج کن
    if (link && !host) {
      const parsed = parseV2RayLink(link);
      if (parsed) {
        host = parsed.host;
        port = parsed.port;
      }
    }

    if (!host) {
      return NextResponse.json(
        { ok: false, error: "لینک V2Ray معتبر وارد کنید یا هاست را دستی وارد کنید" },
        { status: 400 },
      );
    }

    const targetPort = port || 443;
    const startTime = Date.now();

    // تلاش برای اتصال TCP به سرور
    const isReachable = await tcpPing(host, targetPort, 5000);

    const latency = Date.now() - startTime;

    if (isReachable) {
      return NextResponse.json({
        ok: true,
        reachable: true,
        host,
        port: targetPort,
        latency,
        message: `✅ سرور ${host}:${targetPort} قابل دسترسی است (${latency}ms)`,
      });
    } else {
      return NextResponse.json({
        ok: true,
        reachable: false,
        host,
        port: targetPort,
        latency,
        message: `❌ سرور ${host}:${targetPort} قابل دسترسی نیست`,
      });
    }
  } catch (error) {
    return safeErrorResponse(error, "instagram-vpn-test");
  }
}

/**
 * استخراج هاست و پورت از لینک V2Ray
 */
function parseV2RayLink(link: string): { host: string; port: number } | null {
  try {
    // پشتیبانی از فرمت‌های مختلف: vless://, vmess://, trojan://, ss://
    let url: URL | null = null;

    if (link.startsWith("vless://") || link.startsWith("trojan://") || link.startsWith("ss://")) {
      // فرمت: vless://uuid@host:port?params
      const match = link.match(/@([^:]+):(\d+)/);
      if (match) {
        return { host: match[1], port: parseInt(match[2], 10) };
      }
    }

    if (link.startsWith("vmess://")) {
      // فرمت vmess:// معمولاً base64 شده
      try {
        const b64 = link.replace("vmess://", "");
        const decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
        return { host: decoded.add || decoded.host, port: decoded.port || 443 };
      } catch {
        // فرمت‌های دیگر vmess
        const match = link.match(/@([^:]+):(\d+)/);
        if (match) {
          return { host: match[1], port: parseInt(match[2], 10) };
        }
      }
    }

    // تلاش با URL.parse
    try {
      url = new URL(link);
      if (url.hostname) {
        return { host: url.hostname, port: parseInt(url.port, 10) || 443 };
      }
    } catch {
      // ignore
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * TCP Ping - تلاش برای اتصال TCP به هاست و پورت مشخص
 */
async function tcpPing(host: string, port: number, timeout: number): Promise<boolean> {
  const net = await import("net");
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
