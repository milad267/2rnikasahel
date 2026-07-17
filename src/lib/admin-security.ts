// ═══════════════════════════════════════════
//  Admin Security — Strict Operational Functions
//  No general-purpose command execution.
// ═══════════════════════════════════════════

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, adminUsers, adminSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { execFile } from "node:child_process";
// existsSync در پایین فایل import شده است

// ═══════════════════════════════════════════
//  Allowed Service Restart — Strict Whitelist
//  ssh REMOVED — never restart from panel
// ═══════════════════════════════════════════

const ALLOWED_RESTART_SERVICES: Readonly<Record<string, string>> = Object.freeze({
  postgresql: "/usr/bin/systemctl",
  nginx: "/usr/bin/systemctl",
  sendmail: "/usr/bin/systemctl",
  postfix: "/usr/bin/systemctl",
});

export function isAllowedRestartService(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(ALLOWED_RESTART_SERVICES, name);
}

// ═══════════════════════════════════════════
//  Strict Argument Validator — no shell metacharacters
//  Also rejects control characters, null bytes, and CR/LF injection
// ═══════════════════════════════════════════

const SHELL_DANGEROUS = /[;&|`$(){}[\]!<>#\\'"*?~\x00-\x1f\x7f]/;

function validateArgs(args: string[]): void {
  for (const arg of args) {
    if (SHELL_DANGEROUS.test(arg)) {
      throw new Error(`آرگومان "${arg}" حاوی کاراکتر غیرمجاز است`);
    }
  }
}

// ═══════════════════════════════════════════
//  Allowed Binary Paths — Strict Whitelist
//  No arbitrary binary execution.
// ═══════════════════════════════════════════

const ALLOWED_BINARIES: ReadonlySet<string> = new Set([
  "/usr/bin/systemctl",
  "/usr/bin/pg_dump",
  "/usr/sbin/nginx",
  "/usr/bin/git",
  "/usr/bin/hostname",
  "/usr/bin/unzip",
]);

function validateBinary(binaryPath: string): void {
  // Must be an absolute path, no relative traversal
  if (!/^\/[a-zA-Z0-9_\-.]+(?:\/[a-zA-Z0-9_\-.]+)*$/.test(binaryPath)) {
    throw new Error(`مسیر باینری نامعتبر: ${binaryPath}`);
  }
  if (!ALLOWED_BINARIES.has(binaryPath)) {
    throw new Error(`باینری "${binaryPath}" در لیست مجاز نیست`);
  }
}

// ═══════════════════════════════════════════
//  Low-Level Safe Exec — internal only
//  shell:false MANDATORY, absolute binary path required
//  Arguments must be validated, no command strings.
// ═══════════════════════════════════════════

function safeExec(
  absoluteBinary: string,
  args: string[],
  options?: { timeout?: number; cwd?: string; env?: Record<string, string>; maxBuffer?: number },
): Promise<string> {
  validateBinary(absoluteBinary);
  validateArgs(args);

  return new Promise((resolve, reject) => {
    const child = execFile(
      absoluteBinary,
      args,
      {
        timeout: options?.timeout ?? 10_000,
        maxBuffer: options?.maxBuffer ?? 1024 * 1024 * 5, // 5MB
        cwd: options?.cwd,
        env: options?.env ? { ...process.env, ...options.env } : process.env,
        shell: false,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${stderr || error.message}`.trim()));
          return;
        }
        resolve(stdout.trim());
      },
    );

    child.on("error", (err) => reject(err));
  });
}

// ═══════════════════════════════════════════
//  OPERATIONAL FUNCTIONS — Only These Are Exposed
//  No general-purpose command execution from browser.
// ═══════════════════════════════════════════

/**
 * ایجاد بکاپ SQL با pg_dump
 * تمام پارامترها از env خوانده می‌شوند — filepath کنترل‌شده
 * نام فایل امن تولید می‌شود و فقط داخل BACKUP_DIR نوشته می‌شود
 */
export async function createDatabaseBackup(): Promise<string> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const u = new URL(url);
  const host = u.hostname;
  const port = u.port || "5432";
  const user = decodeURIComponent(u.username);
  const password = decodeURIComponent(u.password);
  const database = u.pathname.replace(/^\//, "");

  // Generate safe filename with timestamp
  const { BACKUP_DIR } = await import("@/lib/storage-paths");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-sql-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Ensure backup directory exists
  const { mkdir } = await import("node:fs/promises");
  await mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });

  // پیدا کردن مسیر pg_dump
  const pgDumpPath = await findPgDump();
  if (!pgDumpPath) {
    throw new Error("pg_dump یافت نشد. لطفاً PostgreSQL را نصب کنید یا از بکاپ JSON استفاده کنید.");
  }

  await safeExec(
    pgDumpPath,
    ["-h", host, "-p", port, "-U", user, "-d", database, "-f", filepath, "--no-owner", "--no-acl"],
    { timeout: 120_000, env: { PGPASSWORD: password } },
  );

  return filename;
}

/** جستجوی خودکار مسیر pg_dump در سیستم */
async function findPgDump(): Promise<string | null> {
  // اولویت با متغیر محیطی
  if (process.env.PG_DUMP_PATH) {
    if (existsSync(process.env.PG_DUMP_PATH)) return process.env.PG_DUMP_PATH;
  }

  const isWin = process.platform === "win32";

  // مسیرهای پیش‌فرض بر اساس سیستم عامل
  const candidates = isWin
    ? [
        "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
        "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
        "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
        "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
        "C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe",
        "pg_dump.exe",
      ]
    : [
        "/usr/bin/pg_dump",
        "/usr/pgsql-17/bin/pg_dump",
        "/usr/pgsql-16/bin/pg_dump",
        "/usr/pgsql-15/bin/pg_dump",
        "/usr/pgsql-14/bin/pg_dump",
        "pg_dump",
      ];

  for (const candidate of candidates) {
    try {
      if (isWin) {
        // در ویندوز از where استفاده می‌کنیم
        const { execSync } = await import("node:child_process");
        const result = execSync(`where ${candidate} 2>nul`, { encoding: "utf-8", timeout: 3000 });
        const found = result.trim().split("\n")[0]?.trim();
        if (found && existsSync(found)) return found;
      } else {
        if (existsSync(candidate)) return candidate;
        const { execSync } = await import("node:child_process");
        const result = execSync(`which ${candidate} 2>/dev/null`, { encoding: "utf-8", timeout: 3000 });
        const found = result.trim();
        if (found && existsSync(found)) return found;
      }
    } catch {
      // ignore and try next
    }
  }

  return null;
}

// ─── restoreDatabaseBackup REMOVED ───
// Reason: filepath could point to any SQL file on disk.
// Database restore must be done externally by operator.

// ─── Service Restart Functions REMOVED ───
// Reason: Security - Service restart from web API is disabled to maintain Root Boundary.
// Use SSH/Terminal for service management:
//   sudo systemctl restart dornika
//   sudo systemctl reload nginx
//   sudo systemctl restart postgresql

/**
 * بررسی پیکربندی Nginx (read-only)
 */
export async function testNginxConfig(): Promise<string> {
  return await safeExec("/usr/sbin/nginx", ["-t"], { timeout: 5000 });
}

// ═══════════════════════════════════════════
//  Read-Only Status — No dangerous commands
// ═══════════════════════════════════════════

export interface ServiceStatus {
  name: string;
  active: boolean;
  version: string;
}

export async function getServiceStatus(service: string): Promise<ServiceStatus> {
  if (!isAllowedRestartService(service)) {
    return { name: service, active: false, version: "unknown" };
  }
  try {
    const active = (await safeExec("/usr/bin/systemctl", ["is-active", service], { timeout: 3000 })) === "active";
    return { name: service, active, version: "" };
  } catch {
    return { name: service, active: false, version: "" };
  }
}

export async function getNginxVersion(): Promise<string> {
  try {
    // nginx -v writes to stderr
    return await safeExec("/usr/sbin/nginx", ["-v"], { timeout: 3000 });
  } catch (e: any) {
    return e.message || "";
  }
}

export async function getNodeVersion(): Promise<string> {
  return process.version;
}

export async function getGitVersion(): Promise<string> {
  try {
    return await safeExec("/usr/bin/git", ["--version"], { timeout: 3000 });
  } catch {
    return "";
  }
}

export async function getHostname(): Promise<string> {
  try {
    return await safeExec("/usr/bin/hostname", [], { timeout: 3000 });
  } catch {
    return "localhost";
  }
}

// ═══════════════════════════════════════════
//  Update / Deploy Operations
// ═══════════════════════════════════════════

/**
 * Git pull from a remote URL in the project directory.
 * Returns log lines for display in the admin panel.
 */
export async function gitPull(repoUrl: string, projectDir: string): Promise<string[]> {
  const log: string[] = [];

  try {
    log.push(`🧪 بررسی git در ${projectDir} ...`);
    const version = await safeExec("/usr/bin/git", ["--version"], { timeout: 5000 });
    log.push(`✅ ${version}`);

    // Check if already a git repo
    const isRepo = await safeExec("/usr/bin/git", ["rev-parse", "--git-dir"], {
      timeout: 5000,
      cwd: projectDir,
    }).catch(() => false);

    if (!isRepo) {
      log.push("📦 پروژه مخزن git نیست — clone می‌شود ...");
      const parentDir = projectDir.split("/").slice(0, -1).join("/");
      const projectName = projectDir.split("/").pop() || "project";
      const backupDir = `${projectDir}.bak-${Date.now()}`;

      // Backup current directory
      await safeExec("/usr/bin/mv", [projectDir, backupDir], { timeout: 10_000 });
      log.push(`📦 پوشه فعلی به ${backupDir} انتقال یافت`);

      // Fresh clone
      await safeExec("/usr/bin/git", ["clone", repoUrl, projectName], {
        timeout: 120_000,
        cwd: parentDir,
      });
      log.push(`✅ کد از مخزن clone شد`);
    } else {
      log.push("📦 به‌روزرسانی از مخزن ...");
      // Set correct remote URL
      await safeExec("/usr/bin/git", ["remote", "set-url", "origin", repoUrl], {
        timeout: 10_000,
        cwd: projectDir,
      });
      log.push(`✅ remote origin تنظیم شد`);

      // Fetch
      await safeExec("/usr/bin/git", ["fetch", "origin"], {
        timeout: 60_000,
        cwd: projectDir,
      });
      log.push(`✅ fetch انجام شد`);

      // Check current branch
      const branch = await safeExec("/usr/bin/git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        timeout: 5000,
        cwd: projectDir,
      }).catch(() => "main");
      log.push(`📌 شاخه فعلی: ${branch}`);

      // Pull
      await safeExec("/usr/bin/git", ["pull", "origin", branch], {
        timeout: 60_000,
        cwd: projectDir,
      });
      log.push(`✅ pull انجام شد — آخرین تغییرات دریافت شد`);
    }

    const hash = await safeExec("/usr/bin/git", ["rev-parse", "--short", "HEAD"], {
      timeout: 5000,
      cwd: projectDir,
    }).catch(() => "نامشخص");
    log.push(`🔖 آخرین commit: ${hash}`);

  } catch (e: any) {
    log.push(`❌ ${e.message || "خطا در بروزرسانی"}`);
  }

  return log;
}

/**
 * Extract a ZIP file to the project directory.
 * Returns log lines for display.
 */
export async function extractZipToProject(zipPath: string, projectDir: string): Promise<string[]> {
  const log: string[] = [];

  try {
    log.push(`📦 استخراج فایل ZIP به ${projectDir} ...`);

    const backupDir = `${projectDir}.bak-${Date.now()}`;
    await safeExec("/usr/bin/mv", [projectDir, backupDir], { timeout: 10_000 });
    log.push(`📦 پوشه فعلی به ${backupDir} انتقال یافت`);

    await safeExec("/usr/bin/unzip", ["-o", zipPath, "-d", projectDir], {
      timeout: 120_000,
    });
    log.push(`✅ فایل ZIP با موفقیت استخراج شد`);

    // Clean up the uploaded zip
    await import("node:fs/promises").then(m => m.unlink(zipPath).catch(() => {}));

  } catch (e: any) {
    log.push(`❌ ${e.message || "خطا در استخراج ZIP"}`);
  }

  return log;
}

// ═══════════════════════════════════════════
//  Auth Helpers
// ═══════════════════════════════════════════

interface AuthResult {
  userId?: number;
  name?: string;
  role?: string;
  user?: { id: number; name: string; role: string; isActive: boolean };
  response?: NextResponse;
}

export async function requireAdmin(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    // بررسی هر دو نوع cookie: admin_session و dornika_user_token
    const token = cookieStore.get("admin_session")?.value || 
                  cookieStore.get("__session")?.value ||
                  cookieStore.get("dornika_user_token")?.value;
    
    if (!token) {
      return { response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
    }

    // ابتدا بررسی در admin_sessions
    const [adminSession] = await db
      .select({
        userId: adminSessions.userId,
        expiresAt: adminSessions.expiresAt,
        user: {
          id: adminUsers.id,
          name: adminUsers.name,
          role: adminUsers.role,
          isActive: adminUsers.isActive,
        },
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
      .where(
        and(
          eq(adminSessions.token, token),
          gt(adminSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (adminSession && adminSession.user && adminSession.user.isActive) {
      if (adminSession.user.role !== "admin" && adminSession.user.role !== "superadmin") {
        return { response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
      }
      return { userId: adminSession.user.id, name: adminSession.user.name, role: adminSession.user.role, user: adminSession.user };
    }

    // اگر در admin_sessions نبود، بررسی در users (برای superadmin/admin که از طریق لاگین معمولی وارد شده‌اند)
    const { verifyAuthToken, USER_TOKEN_COOKIE } = await import("@/lib/auth");
    const payload = verifyAuthToken(token);
    
    if (!payload?.userId) {
      return { response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return { response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return { response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
    }

    return { userId: user.id, name: user.name, role: user.role, user };
  } catch {
    return { response: NextResponse.json({ ok: false, error: "Auth check failed" }, { status: 500 }) };
  }
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  const result = await requireAdmin();
  if (result.response) return result;

  if (result.role !== "superadmin") {
    return { response: NextResponse.json({ ok: false, error: "Forbidden: superadmin required" }, { status: 403 }) };
  }

  return result;
}

// ═══════════════════════════════════════════
//  Rate Limiter (in-memory)
// ═══════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000).unref();

// ═══════════════════════════════════════════
//  Setup Lock — persistent across restarts
// ═══════════════════════════════════════════

import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { SETUP_STORAGE, AUDIT_LOG } from "@/lib/storage-paths";

const SETUP_LOCK_FILE = path.join(SETUP_STORAGE, ".setup-lock");

// ─── Token Management ───
const TOKEN_FILE = path.join(SETUP_STORAGE, ".token-meta.json");
const MAX_TOKEN_ATTEMPTS = 10;
const TOKEN_LOCKOUT_MINUTES = 30;

interface TokenMeta {
  tokenHash: string;       // SHA-256 hash of the token
  createdAt: string;       // ISO timestamp when first validated
  expiresAt: string;       // ISO timestamp (24h from creation)
  consumed: boolean;       // true after finalize
  attemptCount: number;    // invalid attempts counter
  lockedUntil?: string;    // ISO timestamp for lockout
}

function hashToken(token: string): string {
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Atomic write for token meta file
 * Write to temp file, then rename to prevent corruption
 */
function atomicWriteTokenMeta(meta: TokenMeta): void {
  const { writeFileSync: wf, renameSync } = require("node:fs");
  const tmpFile = TOKEN_FILE + ".tmp";
  wf(tmpFile, JSON.stringify(meta, null, 2), { encoding: "utf-8", mode: 0o600 });
  renameSync(tmpFile, TOKEN_FILE);
}

/**
 * Timing-safe comparison of two hex strings
 */
function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const { timingSafeEqual } = require("node:crypto");
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Validate token with expiration, single-use, lockout, and timing-safe comparison */
export function validateSetupToken(incoming: string): { ok: true } | { ok: false; error: string; status: number } {
  if (!process.env.SETUP_TOKEN || process.env.SETUP_TOKEN.length < 32) {
    return { ok: false, error: "SETUP_TOKEN در سرور تنظیم نشده (حداقل ۳۲ کاراکتر)", status: 500 };
  }

  // If no meta file yet, this is first attempt — create meta
  let meta: TokenMeta;
  if (!existsSync(TOKEN_FILE)) {
    // Timing-safe comparison with env token
    const incomingHash = hashToken(incoming);
    const expectedHash = hashToken(process.env.SETUP_TOKEN);
    if (!safeCompareHex(incomingHash, expectedHash)) {
      // First attempt with wrong token — create meta with attempt count
      meta = {
        tokenHash: expectedHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        consumed: false,
        attemptCount: 1,
      };
      mkdirSync(path.dirname(TOKEN_FILE), { recursive: true, mode: 0o700 });
      atomicWriteTokenMeta(meta);
      return { ok: false, error: "توکن نصب نامعتبر است", status: 403 };
    }
    // First successful validation — seal meta
    meta = {
      tokenHash: expectedHash,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      consumed: false,
      attemptCount: 0,
    };
    mkdirSync(path.dirname(TOKEN_FILE), { recursive: true, mode: 0o700 });
    atomicWriteTokenMeta(meta);
    return { ok: true };
  }

  // Meta exists — enforce all rules
  try {
    meta = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
  } catch {
    return { ok: false, error: "خطای خواندن توکن", status: 500 };
  }

  // Check lockout
  if (meta.lockedUntil && new Date(meta.lockedUntil) > new Date()) {
    return { ok: false, error: "توکن نصب به دلیل تلاش‌های نامعتبر قفل شده است. لطفاً صبر کنید.", status: 403 };
  }

  // Check expiration
  if (new Date(meta.expiresAt) <= new Date()) {
    return { ok: false, error: "توکن نصب منقضی شده است. لطفاً سرور را با SETUP_TOKEN جدید راه‌اندازی کنید.", status: 403 };
  }

  // Check consumed (single-use)
  if (meta.consumed) {
    return { ok: false, error: "توکن نصب قبلاً مصرف شده است.", status: 403 };
  }

  // Timing-safe comparison with hashed token
  const incomingHash = hashToken(incoming);
  if (!safeCompareHex(incomingHash, meta.tokenHash)) {
    meta.attemptCount++;
    // Lockout after max attempts
    if (meta.attemptCount >= MAX_TOKEN_ATTEMPTS) {
      meta.lockedUntil = new Date(Date.now() + TOKEN_LOCKOUT_MINUTES * 60 * 1000).toISOString();
      atomicWriteTokenMeta(meta);
      return { ok: false, error: `توکن نصب به دلیل ${MAX_TOKEN_ATTEMPTS} تلاش نامعتبر قفل شده است. ${TOKEN_LOCKOUT_MINUTES} دقیقه صبر کنید.`, status: 403 };
    }
    atomicWriteTokenMeta(meta);
    return { ok: false, error: "توکن نصب نامعتبر است", status: 403 };
  }

  return { ok: true };
}

/** Mark token as consumed after successful finalize */
export function consumeSetupToken(): void {
  if (!existsSync(TOKEN_FILE)) return;
  try {
    const meta: TokenMeta = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    meta.consumed = true;
    atomicWriteTokenMeta(meta);
  } catch { /* ignore */ }
}

// ─── Setup Lock ───
// Uses both file-based lock (persistent) and in-memory lock (race condition prevention)

const SETUP_RUNNING_FILE = path.join(SETUP_STORAGE, ".setup-running");

export function isSetupCompleted(): boolean {
  return existsSync(SETUP_LOCK_FILE);
}

export function lockSetup(): void {
  if (!isSetupCompleted()) {
    const dir = path.dirname(SETUP_LOCK_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    writeFileSync(SETUP_LOCK_FILE, JSON.stringify({ lockedAt: new Date().toISOString(), version: "2.0" }), { encoding: "utf-8", mode: 0o600 });
    // Consume token when setup is finalized
    consumeSetupToken();
  }
}

/**
 * Acquire setup lock with file-based persistence and in-memory race prevention.
 * Uses atomic file creation (wx flag) to prevent race conditions.
 */
let _setupRunning = false;
let _setupStartedAt = 0;

export function isSetupRunning(): boolean {
  // Check in-memory lock first
  if (_setupRunning) {
    if (Date.now() - _setupStartedAt > 10 * 60_000) { // 10 min TTL
      _setupRunning = false;
      // Also clean up stale file lock
      try { require("node:fs").unlinkSync(SETUP_RUNNING_FILE); } catch {}
      return false;
    }
    return true;
  }

  // Check file-based lock (survives process restart)
  if (existsSync(SETUP_RUNNING_FILE)) {
    try {
      const content = JSON.parse(readFileSync(SETUP_RUNNING_FILE, "utf-8"));
      const startedAt = new Date(content.startedAt).getTime();
      if (Date.now() - startedAt > 10 * 60_000) {
        // Stale lock — clean up
        require("node:fs").unlinkSync(SETUP_RUNNING_FILE);
        return false;
      }
      return true;
    } catch {
      // Corrupted file — clean up
      try { require("node:fs").unlinkSync(SETUP_RUNNING_FILE); } catch {}
      return false;
    }
  }

  return false;
}

export function acquireSetupLock(): boolean {
  if (isSetupCompleted()) return false;
  if (isSetupRunning()) return false;

  // Try to create file lock atomically (wx flag = fail if exists)
  try {
    const dir = path.dirname(SETUP_RUNNING_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    const { openSync, closeSync } = require("node:fs");
    const fd = openSync(SETUP_RUNNING_FILE, "wx");
    closeSync(fd);
    writeFileSync(SETUP_RUNNING_FILE, JSON.stringify({ startedAt: new Date().toISOString() }), { encoding: "utf-8", mode: 0o600 });
  } catch {
    // File already exists — another process has the lock
    return false;
  }

  _setupRunning = true;
  _setupStartedAt = Date.now();
  return true;
}

export function releaseSetupLock(): void {
  _setupRunning = false;
  try { require("node:fs").unlinkSync(SETUP_RUNNING_FILE); } catch {}
}

// ─── Audit Logger ───

export async function auditLog(entry: {
  action: string;
  actor: string;
  target?: string;
  result: "success" | "failure";
  details?: string;
  ip?: string;
}): Promise<void> {
  try {
    const { appendFile, mkdir } = await import("node:fs/promises");
    await mkdir(path.dirname(AUDIT_LOG), { recursive: true, mode: 0o700 });
    const line = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + "\n";
    await appendFile(AUDIT_LOG, line, { encoding: "utf-8", mode: 0o600 });
  } catch { /* audit failure must not break the request */ }
}

// ═══════════════════════════════════════════
//  Setup Operational Functions — REMOVED
//  All system-level operations (install packages, npm, git, nginx config,
//  certbot) are now handled externally via bootstrap-server.sh
//  The admin panel only accepts & persists settings via REST API.
// ═══════════════════════════════════════════
