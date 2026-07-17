import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SETUP_STORAGE } from "@/lib/storage-paths";
import { requireSuperAdmin } from "@/lib/admin-security";
import { auditLog } from "@/lib/admin-security";

export const dynamic = "force-dynamic";

/**
 * Mask sensitive configuration values recursively
 */
function maskSensitiveConfig(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveConfig(item));
  }

  const masked: Record<string, any> = {};
  const sensitiveKeys = [
    "password", "pass", "token", "secret", "apiKey", "api_key",
    "privateKey", "private_key", "certificateKey", "sslKey",
    "smtpPassword", "databaseUrl", "database_url", "DATABASE_URL",
    "BACKUP_ENCRYPTION_KEY", "paymentKey", "smsKey", "aiKey",
    "adminPassword", "adminPasswordConfirm", "setupToken",
    "AUTH_SECRET", "SETUP_TOKEN", "TELEGRAM_WEBHOOK_SECRET",
    "OPENAI_API_KEY", "PGPASSWORD",
  ];

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk =>
      keyLower === sk.toLowerCase() ||
      keyLower.includes("password") ||
      keyLower.includes("secret") ||
      keyLower.includes("token") ||
      keyLower.includes("apikey") ||
      keyLower.includes("api_key") ||
      keyLower.includes("privatekey") ||
      keyLower.includes("private_key")
    );

    if (isSensitive && typeof value === "string" && value.length > 0) {
      masked[key] = "***CONFIGURED***";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitiveConfig(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * GET /api/admin/setup-config
 * فقط Superadmin می‌تواند Config را بخواند
 * Secretها Mask می‌شوند
 */
export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  try {
    const configPath = path.join(SETUP_STORAGE, "setup-config.json");
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw);

    // Mask sensitive values
    const maskedConfig = maskSensitiveConfig(config);

    await auditLog({
      action: "setup_config:read",
      actor: auth.user!.name || "unknown",
      result: "success",
    });

    return NextResponse.json({
      ok: true,
      config: maskedConfig,
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({
        ok: true,
        config: null,
        message: "هنوز Configی ذخیره نشده است.",
      });
    }

    await auditLog({
      action: "setup_config:read",
      actor: auth.user!.name || "unknown",
      result: "failure",
      details: error.message,
    });

    return NextResponse.json({
      ok: false,
      error: "خطا در خواندن Config.",
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/setup-config
 * فقط Superadmin می‌تواند Config را ویرایش کند
 * Secret خالی مقدار قبلی را حذف نمی‌کند
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const updates = body.updates;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({
        ok: false,
        error: "updates باید یک object باشد.",
      }, { status: 400 });
    }

    const configPath = path.join(SETUP_STORAGE, "setup-config.json");
    let config: Record<string, any> = {};

    try {
      const raw = await readFile(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }

    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      // If value is "***CONFIGURED***", skip (don't overwrite existing secret)
      if (value === "***CONFIGURED***") {
        continue;
      }

      // If value is empty string and key is sensitive, skip
      const keyLower = key.toLowerCase();
      const isSensitive = keyLower.includes("password") ||
                         keyLower.includes("secret") ||
                         keyLower.includes("token") ||
                         keyLower.includes("apikey") ||
                         keyLower.includes("api_key") ||
                         keyLower.includes("privatekey") ||
                         keyLower.includes("private_key");

      if (isSensitive && value === "") {
        continue;
      }

      config[key] = value;
    }

    // Write back (atomic)
    const { writeFile, rename } = await import("node:fs/promises");
    const tmpPath = configPath + ".tmp";
    await writeFile(tmpPath, JSON.stringify(config, null, 2), "utf-8");
    await rename(tmpPath, configPath);

    await auditLog({
      action: "setup_config:update",
      actor: auth.user!.name || "unknown",
      result: "success",
      details: `Updated keys: ${Object.keys(updates).join(", ")}`,
    });

    // Return masked config
    const maskedConfig = maskSensitiveConfig(config);

    return NextResponse.json({
      ok: true,
      config: maskedConfig,
      message: "Config با موفقیت بروزرسانی شد.",
    });
  } catch (error: any) {
    await auditLog({
      action: "setup_config:update",
      actor: auth.user!.name || "unknown",
      result: "failure",
      details: error.message,
    });

    return NextResponse.json({
      ok: false,
      error: "خطا در بروزرسانی Config.",
    }, { status: 500 });
  }
}
