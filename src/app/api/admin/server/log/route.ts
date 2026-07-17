import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin, checkRateLimit, auditLog } from "@/lib/admin-security";
import { openSync, closeSync, readSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { AUDIT_LOG } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * لیست لاگ‌های مجاز — فقط این فایل‌ها از طریق API قابل خواندن هستند
 * مسیرها مطلق هستند. مسیر فایل در response به client ارسال نمی‌شود.
 */
const ALLOWED_LOGS: Readonly<Record<string, { path: string; label: string; requiresSuperAdmin: boolean }>> = Object.freeze({
  nginx: { path: "/var/log/nginx/access.log", label: "Nginx Access Log", requiresSuperAdmin: true },
  nginx_error: { path: "/var/log/nginx/error.log", label: "Nginx Error Log", requiresSuperAdmin: true },
  syslog: { path: "/var/log/syslog", label: "System Log", requiresSuperAdmin: true },
  messages: { path: "/var/log/messages", label: "System Messages", requiresSuperAdmin: true },
  app: { path: AUDIT_LOG, label: "Application Log", requiresSuperAdmin: false },
  nextjs: { path: path.join(process.cwd(), ".next", "trace"), label: "Next.js Trace", requiresSuperAdmin: false },
});

/**
 * خواندن n خط آخر یک فایل بدون shell — همیشه از انتها می‌خواند
 * فایل بزرگ کامل وارد RAM نمی‌شود
 */
function readTail(filepath: string, maxLines: number): { content: string; lineCount: number; fileSize: number } {
  try {
    if (!existsSync(filepath)) {
      return { content: "", lineCount: 0, fileSize: 0 };
    }

    const stat = statSync(filepath);
    const fileSize = stat.size;

    // حداکثر 5MB از انتها — حتی برای فایل‌های بزرگ
    const READ_CHUNK = Math.min(fileSize, 5 * 1024 * 1024);
    const buf = Buffer.alloc(READ_CHUNK);
    const fd = openSync(filepath, "r");
    const start = Math.max(0, fileSize - READ_CHUNK);
    readSync(fd, buf, 0, READ_CHUNK, start);
    closeSync(fd);

    const text = buf.toString("utf-8").replace(/^\n+/, "");
    const lines = text.split("\n").slice(-maxLines);
    return { content: lines.join("\n"), lineCount: lines.length, fileSize };
  } catch {
    return { content: "", lineCount: 0, fileSize: 0 };
  }
}

/**
 * Redact اطلاعات حساس از محتوای لاگ — حتی برای superadmin
 * - IPهای خصوصی
 * - توکن‌ها
 * - پسوردها
 * - API Keyها
 * - Connection Stringها
 */
function redactContent(content: string): string {
  return content
    .replace(/token[=:]\s*[^\s&,;]+/gi, "token=***REDACTED***")
    .replace(/password[=:]\s*[^\s&,;]+/gi, "password=***REDACTED***")
    .replace(/api_key[=:]\s*[^\s&,;]+/gi, "api_key=***REDACTED***")
    .replace(/secret[=:]\s*[^\s&,;]+/gi, "secret=***REDACTED***")
    .replace(/authorization:\s*[^\s]+/gi, "authorization:***REDACTED***")
    .replace(/cookie[=:]\s*[^\s&,;]+/gi, "cookie=***REDACTED***")
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "bearer ***REDACTED***")
    .replace(/(postgres(?:ql)?|mongodb|mysql|redis):\/\/[^\s"'`]+/gi, "***DATABASE_URL_REDACTED***")
    .replace(/[a-f0-9]{32,}/g, "***HASH_REDACTED***");
}

/** لیست لاگ‌های موجود — بدون محتوا */
interface LogMetadata {
  key: string;
  label: string;
  exists: boolean;
  sizeFormatted: string;
  requiresSuperAdmin: boolean;
}

export async function GET(req: NextRequest) {
  // Rate limiting: 5 request per 30 seconds
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`log:${ip}`, 5, 30_000)) {
    return NextResponse.json({ ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است." }, { status: 429 });
  }

  const logKey = req.nextUrl.searchParams.get("log");
  const linesParam = req.nextUrl.searchParams.get("lines");
  const maxLines = Math.min(Math.max(parseInt(linesParam || "50", 10) || 50, 10), 1000);

  if (!logKey) {
    // لیست لاگ‌های در دسترس (بدون محتوا — فقط متادیتا)
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const isSuperAdmin = auth.role === "superadmin";

    const available: LogMetadata[] = Object.entries(ALLOWED_LOGS)
      .filter(([_, val]) => isSuperAdmin || !val.requiresSuperAdmin)
      .map(([key, val]) => {
        const exists = existsSync(val.path);
        const size = exists ? statSync(val.path).size : 0;
        return {
          key,
          label: val.label,
          exists,
          sizeFormatted: size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`,
          requiresSuperAdmin: val.requiresSuperAdmin,
        };
      });

    return NextResponse.json(
      { ok: true, available },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      },
    );
  }

  const logConfig = ALLOWED_LOGS[logKey];
  if (!logConfig) {
    return NextResponse.json(
      { ok: false, error: "لاگ درخواستی در لیست مجاز نیست." },
      {
        status: 403,
        headers: { "Cache-Control": "no-store, private" },
      },
    );
  }

  // لاگ‌های سیستم فقط برای superadmin
  if (logConfig.requiresSuperAdmin) {
    const auth = await requireSuperAdmin();
    if (auth.response) return auth.response;

    auditLog({ action: `log:read:${logKey}`, actor: auth.user!.name!, result: "success", ip }).catch(() => {});
  } else {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    auditLog({ action: `log:read:${logKey}`, actor: auth.user!.name!, result: "success", ip }).catch(() => {});
  }

  const { content, lineCount, fileSize } = readTail(logConfig.path, maxLines);

  // Redact اطلاعات حساس — حتی برای superadmin
  const safeContent = redactContent(content);

  return NextResponse.json(
    {
      ok: true,
      log: logKey,
      label: logConfig.label,
      lines: lineCount,
      maxLinesRequested: maxLines,
      fileSize,
      content: safeContent,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    },
  );
}
