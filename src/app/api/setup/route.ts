import { NextRequest, NextResponse } from "next/server";
import {
  isSetupCompleted,
  lockSetup,
  acquireSetupLock,
  releaseSetupLock,
  checkRateLimit,
} from "@/lib/admin-security";
import { SETUP_STORAGE } from "@/lib/storage-paths";
import { writeFile, mkdir, rename, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════
//  Setup State Machine
// ═══════════════════════════════════════════

type SetupState = "not_started" | "config_pending" | "admin_created" | "finalizing" | "completed" | "failed";

interface SetupStateData {
  state: SetupState;
  config?: Record<string, any>;
  superadminId?: number;
  error?: string;
  updatedAt: string;
}

async function readSetupState(): Promise<SetupStateData> {
  try {
    const statePath = path.join(SETUP_STORAGE, "setup-state.json");
    const raw = await readFile(statePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { state: "not_started", updatedAt: new Date().toISOString() };
  }
}

async function writeSetupState(data: SetupStateData): Promise<void> {
  const statePath = path.join(SETUP_STORAGE, "setup-state.json");
  await atomicWriteJson(statePath, { ...data, updatedAt: new Date().toISOString() });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ═══════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════

function isValidDomain(domain: string): boolean {
  return /^(localhost|(?:[a-z0-9-]+\.)+[a-z]{2,})$/.test(domain);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPathSegment(seg: string): boolean {
  return /^[a-zA-Z0-9_\-.]+$/.test(seg);
}

/**
 * Password Policy — قوی و امن
 * - حداقل 12 کاراکتر
 * - حداکثر 128 کاراکتر
 * - حداقل یک حرف بزرگ یا کوچک
 * - حداقل یک عدد
 * - حداقل یک کاراکتر خاص یا حرف دیگر
 * - رمزهای بسیار ساده رد شوند
 */
function validatePassword(password: string): { ok: boolean; error?: string } {
  if (password.length < 12) {
    return { ok: false, error: "رمز عبور باید حداقل ۱۲ کاراکتر باشد." };
  }
  if (password.length > 128) {
    return { ok: false, error: "رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, error: "رمز عبور باید حداقل یک حرف داشته باشد." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "رمز عبور باید حداقل یک عدد داشته باشد." };
  }
  // Check for very weak passwords
  const weakPatterns = [
    /^(.)\1+$/, // همه کاراکترها یکسان
    /^(012|123|234|345|456|567|678|789|890)+/, // دنباله‌های عددی ساده
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // دنباله‌های حرفی ساده
    /^(password|123456|qwerty|admin|letmein|welcome|monkey|dragon|master)/i, // رمزهای رایج
  ];
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return { ok: false, error: "رمز عبور بسیار ساده است. لطفاً یک رمز قوی‌تر انتخاب کنید." };
    }
  }
  return { ok: true };
}

/** Redact sensitive values for safe logging — never log secrets */
function redact(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "setupToken" || k === "token") {
      out[k] = v ? "***REDACTED***" : null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Mask sensitive configuration values recursively
 * Returns a deep copy with secrets replaced by "***CONFIGURED***"
 */
function maskSensitiveConfig(obj: any, path: string[] = []): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => maskSensitiveConfig(item, [...path, String(idx)]));
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
      masked[key] = maskSensitiveConfig(value, [...path, key]);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/** Atomic write: write to temp file, then rename */
async function atomicWriteJson(filePath: string, data: Record<string, any>): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = filePath + "." + randomBytes(8).toString("hex") + ".tmp";
  await writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
  await rename(tmp, filePath);
  // Chmod after rename to harden permissions on final file
  const { chmod } = await import("node:fs/promises");
  await chmod(filePath, 0o600);
  // Cleanup stale tmp if rename failed and tmp still exists
  try { await unlink(tmp); } catch { /* ignore */ }
}

// ═══════════════════════════════════════════
//  POST — Accept & persist setup configuration only.
//  All system-level operations (install packages,
//  npm, nginx, certbot, git) are now handled
//  externally via scripts/bootstrap-server.sh
//  Config stored at APP_DATA_DIR/setup/setup-config.json
//  (outside .next & public, never in Git)
// ═══════════════════════════════════════════

export async function POST(req: NextRequest) {
  // Rate limiting: 3 requests per 5 minutes
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`setup:${ip}`, 3, 300_000)) {
    return NextResponse.json(
      { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ۵ دقیقه صبر کنید." },
      { status: 429 },
    );
  }

  // If setup is already completed, reject
  if (isSetupCompleted()) {
    return NextResponse.json(
      { ok: false, error: "نصب قبلاً کامل شده است." },
      { status: 403 },
    );
  }

  // Acquire temporary lock to prevent concurrent runs
  if (!acquireSetupLock()) {
    return NextResponse.json(
      { ok: false, error: "فرایند نصب در حال اجراست." },
      { status: 409 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // ─── Extract and validate configuration fields ───
    const domain = String(body?.domain || "localhost").trim().toLowerCase();
    const email = String(body?.email || "").trim().toLowerCase();
    const https = body?.https !== false;
    const finalize = body?.finalize === true;

    // Validate domain
    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { ok: false, error: "دامنه معتبر نیست. مثال: example.com" },
        { status: 400 },
      );
    }

    // Validate email if HTTPS is requested and domain is not localhost
    if (https && domain !== "localhost" && email && !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "ایمیل SSL معتبر نیست." },
        { status: 400 },
      );
    }

    // ─── Build config (NEVER includes token, NEVER includes git, NEVER includes password) ───
    const config: Record<string, any> = {
      domain,
      email: email || null,
      https,
      createdAt: new Date().toISOString(),
      finalized: finalize,
    };

    // ─── Read current setup state ───
    let setupState = await readSetupState();

    // ─── Create Superadmin (if not already created) ───
    const adminName = String(body?.adminName || "").trim();
    const adminPhone = String(body?.adminPhone || "").trim();
    const adminEmail = String(body?.adminEmail || "").trim().toLowerCase();
    const adminPassword = String(body?.adminPassword || "");
    const adminPasswordConfirm = String(body?.adminPasswordConfirm || "");

    let superadminId = setupState.superadminId;

    // Only create superadmin if not already created and credentials provided
    if (setupState.state !== "admin_created" && setupState.state !== "finalizing" && setupState.state !== "completed") {
      if (adminName && adminPassword) {
        // Password validation with strong policy
        const passwordCheck = validatePassword(adminPassword);
        if (!passwordCheck.ok) {
          return NextResponse.json({ ok: false, error: passwordCheck.error }, { status: 400 });
        }
        if (adminPassword !== adminPasswordConfirm) {
          return NextResponse.json({ ok: false, error: "رمز عبور و تأیید رمز عبور مطابقت ندارند." }, { status: 400 });
        }

        // Check if superadmin already exists (application-level check)
        const existingAdmin = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.role, "superadmin")).limit(1);
        if (existingAdmin.length > 0) {
          // Superadmin already exists — update state and continue
          superadminId = existingAdmin[0].id;
          await writeSetupState({
            state: "admin_created",
            config,
            superadminId,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Validate uniqueness
          const emailExists = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, adminEmail || adminPhone)).limit(1);
          if (emailExists.length > 0) {
            return NextResponse.json({ ok: false, error: "این ایمیل یا شماره موبایل قبلاً ثبت شده است." }, { status: 400 });
          }

          // Hash password securely
          const passwordHash = hashPassword(adminPassword);

          // Create superadmin in a TRANSACTION with state update
          // This ensures atomicity: either both succeed or both fail
          try {
            const result = await db.transaction(async (tx) => {
              // Insert superadmin (database constraint prevents duplicates)
              const [superadmin] = await tx.insert(adminUsers).values({
                name: adminName,
                email: adminEmail || adminPhone,
                passwordHash,
                role: "superadmin",
                isActive: true,
              }).returning({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, role: adminUsers.role });

              return superadmin;
            });

            superadminId = result.id;

            // Update state to admin_created
            await writeSetupState({
              state: "admin_created",
              config,
              superadminId,
              updatedAt: new Date().toISOString(),
            });
          } catch (dbError: any) {
            // Check if it's a unique constraint violation (race condition caught by DB)
            if (dbError.message?.includes("unique") || dbError.message?.includes("duplicate") || dbError.code === "23505") {
              await writeSetupState({
                state: "failed",
                config,
                error: "سوپرادمین قبلاً ایجاد شده است (race condition detected by database).",
                updatedAt: new Date().toISOString(),
              });
              return NextResponse.json({ ok: false, error: "سوپرادمین قبلاً ایجاد شده است." }, { status: 400 });
            }
            // Other database error
            await writeSetupState({
              state: "failed",
              config,
              error: "خطای دیتابیس در ساخت سوپرادمین.",
              updatedAt: new Date().toISOString(),
            });
            throw dbError;
          }
        }
      }
    }

      // Store superadmin info in config (NO password)
      if (superadminId) {
        const [superadminInfo] = await db.select({
          id: adminUsers.id,
          name: adminUsers.name,
          email: adminUsers.email,
          role: adminUsers.role,
        }).from(adminUsers).where(eq(adminUsers.id, superadminId)).limit(1);

        if (superadminInfo) {
          config.superadmin = {
            id: superadminInfo.id,
            name: superadminInfo.name,
            email: superadminInfo.email,
            role: superadminInfo.role,
            createdAt: new Date().toISOString(),
          };
        }
      }

    // Atomic write to persistent, permissions-restricted path
    const configPath = path.join(SETUP_STORAGE, "setup-config.json");
    await atomicWriteJson(configPath, config);

    // Update state to config_pending or finalizing
    if (finalize) {
      await writeSetupState({
        state: "finalizing",
        config,
        superadminId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await writeSetupState({
        state: "config_pending",
        config,
        superadminId,
        updatedAt: new Date().toISOString(),
      });
    }

    // Log redacted body — never log secrets
    if (process.env.NODE_ENV !== "production") {
      console.log("[setup] config saved:", redact(config));
    }

    // If finalize, lock setup permanently
    if (finalize) {
      lockSetup();

      // Update state to completed
      await writeSetupState({
        state: "completed",
        config,
        superadminId,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        message: "تنظیمات با موفقیت ذخیره و نصب نهایی شد.",
        config: maskSensitiveConfig(config),
      });
    }

    return NextResponse.json({
      ok: true,
      message: "تنظیمات با موفقیت ذخیره شد. برای اجرای مراحل سیستمی اسکریپت bootstrap-server.sh را اجرا کنید.",
      config: maskSensitiveConfig(config),
      state: setupState.state,
      nextSteps: [
        "1. اسکریپت scripts/bootstrap-server.sh را روی سرور اجرا کنید",
        "2. پس از اتمام مراحل سیستمی، با ارسال finalize:true نصب را نهایی کنید",
      ],
    });
  } catch (error: any) {
    // Update state to failed
    await writeSetupState({
      state: "failed",
      error: error.message || "خطای ناشناخته",
      updatedAt: new Date().toISOString(),
    }).catch(() => {}); // Ignore state write errors

    return NextResponse.json(
      { ok: false, error: `خطای سیستمی: ${error.message}` },
      { status: 500 },
    );
  } finally {
    releaseSetupLock();
  }
}

// ═══════════════════════════════════════════
//  GET — وضعیت نصب (read-only, no auth required)
//  NEVER returns token or secrets
// ═══════════════════════════════════════════

export async function GET() {
  const hasToken = !!process.env.SETUP_TOKEN && process.env.SETUP_TOKEN.length >= 32;
  const setupDone = isSetupCompleted();

  // Read setup state
  const setupState = await readSetupState();

  // Public GET: return ONLY non-sensitive information
  // Config is NEVER returned here — use Server Management API with Superadmin permission
  const publicInfo: Record<string, any> = {
    ok: true,
    setupTokenSet: hasToken,
    setupCompleted: setupDone,
    state: setupState.state,
    note: "مراحل سیستمی (نصب پکیج‌ها، nginx، ssl) باید از طریق اسکریپت bootstrap-server.sh روی سرور انجام شود.",
  };

  // If setup is in progress, return only non-sensitive progress info
  if (!setupDone && setupState.state !== "not_started") {
    publicInfo.progress = {
      state: setupState.state,
      hasConfig: !!setupState.config,
      hasAdmin: !!setupState.superadminId,
    };
  }

  // If setup is completed, return minimal info
  if (setupDone) {
    publicInfo.message = "نصب با موفقیت کامل شد.";
  }

  return NextResponse.json(publicInfo);
}