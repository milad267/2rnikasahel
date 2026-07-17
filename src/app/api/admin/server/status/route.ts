import { NextResponse, NextRequest } from "next/server";
import {
  requireAdmin,
  requireSuperAdmin,
  checkRateLimit,
  getServiceStatus,
  getNginxVersion,
  getGitVersion,
  getNodeVersion,
  getHostname,
  type ServiceStatus,
  auditLog,
} from "@/lib/admin-security";
import os from "node:os";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVICE_NAMES = ["postgresql", "nginx", "sendmail", "postfix"] as const;

/** اطلاعات امن برای admin عادی — بدون جزئیات حساس */
function buildSafeSystemInfo() {
  return {
    nodeVersion: getNodeVersion(),
    platform: process.platform,
    arch: process.arch,
    uptime: Math.round(process.uptime()),
  };
}

/** اطلاعات کامل سیستم — فقط superadmin */
function buildDetailedSystemInfo(hostname: string) {
  const mem = process.memoryUsage();
  return {
    hostname: hostname || os.hostname(),
    nodeVersion: getNodeVersion(),
    platform: process.platform,
    arch: process.arch,
    uptime: Math.round(process.uptime()),
    memoryUsageMB: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    cpuCount: os.cpus().length,
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
  };
}

export async function GET(req: NextRequest) {
  // Rate limiting: 10 requests per 30 seconds per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`status:${ip}`, 10, 30_000)) {
    return NextResponse.json({ ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است." }, { status: 429 });
  }

  // Basic auth required
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const isSuperAdmin = auth.role === "superadmin";

  try {
    // جمع‌آوری وضعیت سرویس‌ها — همگی read-only
    const services: ServiceStatus[] = [];
    for (const svc of SERVICE_NAMES) {
      services.push(await getServiceStatus(svc));
    }

    // نسخه‌ها — همگی read-only و safe
    const [nginxVer, gitVer, hostname] = await Promise.all([
      getNginxVersion(),
      getGitVersion(),
      getHostname(),
    ]);

    const systemInfo = isSuperAdmin
      ? buildDetailedSystemInfo(hostname)
      : buildSafeSystemInfo();

    // Audit log for superadmin detailed view
    if (isSuperAdmin) {
      auditLog({ action: "server:status-detail", actor: auth.user!.name!, result: "success", ip }).catch(() => {});
    }

    return NextResponse.json(
      {
        ok: true,
        services,
        system: systemInfo,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "خطا در دریافت وضعیت سرور" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, private" },
      },
    );
  }
}
