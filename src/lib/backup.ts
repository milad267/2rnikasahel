import { readdir, writeFile, mkdir, unlink, stat, rename, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { siteSettings } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";

import { BACKUP_DIR as STABLE_BACKUP_DIR } from "@/lib/storage-paths";

/** مسیر پایدار بکاپ — داخل APP_DATA_DIR */
export const BACKUP_DIR = STABLE_BACKUP_DIR;

// ═══════════════════════════════════════════
//  Backup Encryption — AES-256-GCM
// ═══════════════════════════════════════════

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get backup encryption key from environment.
 *
 * Production: BACKUP_ENCRYPTION_KEY is MANDATORY.
 * Development: plaintext allowed only with BACKUP_ALLOW_UNENCRYPTED=true.
 */
function getEncryptionKey(): Buffer | null {
  const rawKey = process.env.BACKUP_ENCRYPTION_KEY;

  // Valid key formats: 64 hex chars (32 bytes) or raw 32-byte string
  const parseKey = (k: string): Buffer | null => {
    if (/^[a-fA-F0-9]{64}$/.test(k)) return Buffer.from(k, "hex");
    if (k.length === 32) return Buffer.from(k, "utf-8");
    return null; // invalid format
  };

  if (!rawKey || rawKey.trim() === "") {
    // No key provided
    if (process.env.NODE_ENV === "production") {
      // In production, encryption is mandatory — caller must handle this
      return null; // caller will enforce
    }
    // Development: allow unencrypted only if explicit flag
    if (process.env.BACKUP_ALLOW_UNENCRYPTED === "true") {
      return null; // developer opted in to plaintext
    }
    // Default dev: also require encryption for safety
    return null; // caller will enforce
  }

  const parsed = parseKey(rawKey);
  if (!parsed) {
    if (process.env.NODE_ENV === "production") {
      return null; // caller will enforce
    }
    console.warn("[backup] BACKUP_ENCRYPTION_KEY has invalid format. Expected 64 hex chars or 32 bytes.");
    return null; // caller will enforce
  }

  return parsed;
}

/**
 * Check if encryption is mandatory and key is missing.
 */
export function isEncryptionRequiredAndMissing(): boolean {
  if (process.env.NODE_ENV !== "production" && process.env.BACKUP_ALLOW_UNENCRYPTED === "true") {
    return false; // developer explicitly allows plaintext
  }
  const key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key || key.trim() === "") return true;
  if (!/^[a-fA-F0-9]{64}$/.test(key) && key.length !== 32) return true;
  return false;
}

/**
 * Encrypt a file in-place with AES-256-GCM.
 * Returns the path to the encrypted file (original path + .enc).
 * Securely removes the plaintext file after encryption.
 */
export async function encryptFile(filePath: string, key: Buffer): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const { readFile, unlink } = await import("node:fs/promises");
  const plaintext = await readFile(filePath);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encPath = `${filePath}.enc`;

  // Build manifest for the encrypted file
  const manifest = {
    encrypted: true,
    algorithm: ENCRYPTION_ALGORITHM,
    version: 2,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    originalSize: plaintext.length,
    encryptedSize: encrypted.length + iv.length + authTag.length,
  };

  const { writeFile } = await import("node:fs/promises");
  await writeFile(encPath, JSON.stringify(manifest, null, 0), { encoding: "utf-8", mode: 0o600 });

  // Securely remove plaintext file
  try { await unlink(filePath); } catch { /* ignore */ }

  return encPath;
}

/**
 * Decrypt an encrypted backup file.
 * Returns the decrypted content as a string.
 * Throws if authentication fails or key is missing.
 */
export function decryptFile(filePath: string, key: Buffer): string {
  const { readFileSync } = require("node:fs");
  const raw = readFileSync(filePath, "utf-8");
  const manifest = JSON.parse(raw);

  if (!manifest.encrypted || manifest.algorithm !== ENCRYPTION_ALGORITHM) {
    throw new Error("فایل رمزنگاری‌شده نیست یا الگوریتم نامعتبر است.");
  }

  if (!manifest.iv || !manifest.authTag || !manifest.ciphertext) {
    throw new Error("فایل رمزنگاری‌شده ناقص است.");
  }

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(manifest.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(manifest.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(manifest.ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Encrypt data with AES-256-GCM.
 * Returns: { iv, authTag, ciphertext } all as hex strings.
 */
function encryptData(plaintext: string, key: Buffer): { iv: string; authTag: string; ciphertext: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
  };
}

/**
 * Decrypt data with AES-256-GCM.
 * Throws if auth tag is invalid (tampered data).
 */
function decryptData(iv: string, authTag: string, ciphertext: string, key: Buffer): string {
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

/** گروه‌بندی جدول‌ها برای بکاپ انتخابی */
export const BACKUP_GROUPS: {
  id: string;
  label: string;
  desc: string;
  tables: { name: string; table: any }[];
}[] = [
  {
    id: "products",
    label: "محصولات و کاتالوگ",
    desc: "محصولات، دسته‌بندی‌ها، برندها، واحدها، تنوع‌ها و برچسب‌ها",
    tables: [
      { name: "categories", table: schema.categories },
      { name: "units", table: schema.units },
      { name: "brands", table: schema.brands },
      { name: "tags", table: schema.tags },
      { name: "products", table: schema.products },
      { name: "product_variants", table: schema.productVariants },
      { name: "product_tags", table: schema.productTags },
    ],
  },
  {
    id: "customers",
    label: "مشتریان و حساب‌ها",
    desc: "اطلاعات کاربران و آدرس‌های ثبت‌شده",
    tables: [
      { name: "users", table: schema.users },
      { name: "user_addresses", table: schema.userAddresses },
    ],
  },
  {
    id: "orders",
    label: "سفارش‌ها و درخواست‌ها",
    desc: "سفارش‌ها، اقلام، تاریخچه، استعلام قیمت و پیام‌های تماس",
    tables: [
      { name: "orders", table: schema.orders },
      { name: "order_items", table: schema.orderItems },
      { name: "order_history", table: schema.orderHistory },
      { name: "quote_requests", table: schema.quoteRequests },
      { name: "contact_messages", table: schema.contactMessages },
    ],
  },
  {
    id: "content",
    label: "محتوا و بلاگ",
    desc: "اسلایدها، ویژگی‌های صفحه اصلی و مطالب بلاگ",
    tables: [
      { name: "landing_slides", table: schema.landingSlides },
      { name: "landing_features", table: schema.landingFeatures },
      { name: "slides", table: schema.slides },
      { name: "blog_categories", table: schema.blogCategories },
      { name: "blog_posts", table: schema.blogPosts },
      { name: "blog_post_tags", table: schema.blogPostTags },
    ],
  },
  {
    id: "settings",
    label: "تنظیمات سایت",
    desc: "تنظیمات عمومی، پالت رنگ و سرویس‌دهنده‌های پیامک",
    tables: [
      { name: "site_settings", table: schema.siteSettings },
      { name: "color_palettes", table: schema.colorPalettes },
      { name: "sms_providers", table: schema.smsProviders },
    ],
  },
];

/** همه‌ی جدول‌ها به‌ترتیب امنِ درج مجدد (وابستگی‌ها اول) */
export const ALL_TABLES: { name: string; table: any }[] = [
  { name: "site_settings", table: schema.siteSettings },
  { name: "color_palettes", table: schema.colorPalettes },
  { name: "categories", table: schema.categories },
  { name: "units", table: schema.units },
  { name: "brands", table: schema.brands },
  { name: "tags", table: schema.tags },
  { name: "products", table: schema.products },
  { name: "product_variants", table: schema.productVariants },
  { name: "product_tags", table: schema.productTags },
  { name: "landing_slides", table: schema.landingSlides },
  { name: "landing_features", table: schema.landingFeatures },
  { name: "slides", table: schema.slides },
  { name: "blog_categories", table: schema.blogCategories },
  { name: "blog_posts", table: schema.blogPosts },
  { name: "blog_post_tags", table: schema.blogPostTags },
  { name: "users", table: schema.users },
  { name: "user_addresses", table: schema.userAddresses },
  { name: "orders", table: schema.orders },
  { name: "order_items", table: schema.orderItems },
  { name: "order_history", table: schema.orderHistory },
  { name: "quote_requests", table: schema.quoteRequests },
  { name: "contact_messages", table: schema.contactMessages },
  { name: "sms_providers", table: schema.smsProviders },
];

function fmtSize(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

/** لیست جدول‌های انتخاب‌شده بر اساس groupهای دلخواه (خالی = همه) */
export function tablesForGroups(groupIds?: string[]): { name: string; table: any }[] {
  if (!groupIds || groupIds.length === 0) return ALL_TABLES;
  const names = new Set<string>();
  for (const g of BACKUP_GROUPS) {
    if (groupIds.includes(g.id)) g.tables.forEach((t) => names.add(t.name));
  }
  return ALL_TABLES.filter((t) => names.has(t.name));
}

export type BackupResult = {
  ok: boolean;
  file?: string;
  size?: string;
  rows?: number;
  tables?: number;
  error?: string;
};

/**
 * Atomic write: write to temp file, then rename
 * Prevents partial writes and ensures data integrity
 */
async function atomicWriteJson(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = filePath + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
  await writeFile(tmp, JSON.stringify(data, null, 0), { encoding: "utf-8", mode: 0o600 });
  await rename(tmp, filePath);
  // Chmod after rename to ensure permissions
  const { chmod } = await import("node:fs/promises");
  await chmod(filePath, 0o600);
}

/**
 * Backup manifest for validation
 */
interface BackupManifest {
  version: number;
  createdAt: string;
  groups: string[] | "all";
  auto: boolean;
  tableCount: number;
  totalRows: number;
  checksum: string; // SHA-256 of the JSON content
}

/**
 * Validate backup file against manifest
 */
export function validateBackupManifest(parsed: any): { ok: true; manifest: BackupManifest } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "فایل بکاپ خالی یا نامعتبر است." };
  }
  if (!parsed.version || typeof parsed.version !== "number") {
    return { ok: false, error: "فایل بکاپ فاقد فیلد version است." };
  }
  if (parsed.version < 2) {
    return { ok: false, error: `نسخه بکاپ (${parsed.version}) پشتیبانی نمی‌شود. حداقل نسخه: ۲` };
  }
  if (!parsed.createdAt || typeof parsed.createdAt !== "string") {
    return { ok: false, error: "فایل بکاپ فاقد فیلد createdAt است." };
  }
  if (!parsed.tables || typeof parsed.tables !== "object" || Array.isArray(parsed.tables)) {
    return { ok: false, error: "فایل بکاپ فاقد داده‌های جدول‌ها (tables) است." };
  }

  const tableNames = Object.keys(parsed.tables);
  const validTableNames = new Set(ALL_TABLES.map(t => t.name));
  for (const name of tableNames) {
    if (!validTableNames.has(name)) {
      return { ok: false, error: `جدول ناشناخته در بکاپ: "${name}". فایل ممکن است خراب یا دستکاری شده باشد.` };
    }
    if (!Array.isArray(parsed.tables[name])) {
      return { ok: false, error: `داده‌های جدول "${name}" باید آرایه باشد.` };
    }
  }

  if (tableNames.length === 0) {
    return { ok: false, error: "فایل بکاپ حاوی هیچ جدولی نیست." };
  }

  let totalRows = 0;
  for (const name of tableNames) {
    totalRows += (parsed.tables[name] as any[]).length;
  }

  const manifest: BackupManifest = {
    version: parsed.version,
    createdAt: parsed.createdAt,
    groups: parsed.groups || "all",
    auto: !!parsed.auto,
    tableCount: tableNames.length,
    totalRows,
    checksum: parsed.checksum || "",
  };

  return { ok: true, manifest };
}

/**
 * ساخت بکاپ JSON از گروه‌های انتخاب‌شده (auto=خودکار برای نام‌گذاری)
 * اگر BACKUP_ENCRYPTION_KEY تنظیم باشد، با AES-256-GCM رمزنگاری می‌شود.
 *
 * در Production: BACKUP_ENCRYPTION_KEY اجباری است. در صورت عدم تنظیم خطا برمی‌گرداند.
 * در Development: با BACKUP_ALLOW_UNENCRYPTED=true plaintext مجاز است.
 */
export async function createJsonBackup(
  groupIds?: string[],
  opts?: { auto?: boolean },
): Promise<BackupResult> {
  // Enforce encryption in production
  if (isEncryptionRequiredAndMissing()) {
    return {
      ok: false,
      error: "امکان ساخت بکاپ بدون کلید رمزنگاری وجود ندارد. لطفاً BACKUP_ENCRYPTION_KEY را تنظیم کنید.",
    };
  }

  try {
    await mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const prefix = opts?.auto ? "auto-backup-json" : "backup-json";

    const selected = tablesForGroups(groupIds);
    const dump: Record<string, any[]> = {};
    let rows = 0;
    for (const { name, table } of selected) {
      try {
        const data = await db.select().from(table);
        dump[name] = data;
        rows += data.length;
      } catch {
        dump[name] = [];
      }
    }

    const payload = {
      version: 2,
      createdAt: new Date().toISOString(),
      groups: groupIds && groupIds.length ? groupIds : "all",
      auto: !!opts?.auto,
      tables: dump,
    };

    // Calculate checksum for integrity validation
    const checksum = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    // Check if encryption is enabled
    const encryptionKey = getEncryptionKey();
    let finalPayload: any;
    let filename: string;

    if (encryptionKey) {
      // Encrypted backup
      const { iv, authTag, ciphertext } = encryptData(JSON.stringify({ ...payload, checksum }), encryptionKey);
      finalPayload = {
        encrypted: true,
        algorithm: ENCRYPTION_ALGORITHM,
        iv,
        authTag,
        ciphertext,
        metadata: {
          version: 2,
          createdAt: payload.createdAt,
          groups: payload.groups,
          auto: payload.auto,
          tableCount: selected.length,
          totalRows: rows,
        },
      };
      filename = `${prefix}-${timestamp}.enc.json`;
    } else {
      // Unencrypted backup (legacy)
      finalPayload = { ...payload, checksum };
      filename = `${prefix}-${timestamp}.json`;
    }

    const filepath = path.join(BACKUP_DIR, filename);

    // Atomic write with restricted permissions
    await atomicWriteJson(filepath, finalPayload);

    return {
      ok: true,
      file: filename,
      size: fmtSize(Buffer.byteLength(JSON.stringify(finalPayload))),
      rows,
      tables: selected.length,
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Decrypt backup if encrypted, returning the original payload.
 * Throws if decryption fails (wrong key or tampered data).
 */
export function decryptBackupPayload(parsed: any): any {
  if (!parsed.encrypted) return parsed; // Not encrypted

  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    throw new Error("این بکاپ رمزنگاری شده است اما BACKUP_ENCRYPTION_KEY تنظیم نشده.");
  }

  if (parsed.algorithm !== ENCRYPTION_ALGORITHM) {
    throw new Error(`الگوریتم رمزنگاری ناشناخته: ${parsed.algorithm}`);
  }

  if (!parsed.iv || !parsed.authTag || !parsed.ciphertext) {
    throw new Error("فایل بکاپ رمزنگاری‌شده ناقص است (iv/authTag/ciphertext موجود نیست).");
  }

  try {
    const decrypted = decryptData(parsed.iv, parsed.authTag, parsed.ciphertext, encryptionKey);
    return JSON.parse(decrypted);
  } catch (err: any) {
    if (err.message?.includes("unsupported") || err.message?.includes("bad decrypt")) {
      throw new Error("رمزگشایی بکاپ ناموفق بود. کلید رمزنگاری اشتباه است یا فایل دستکاری شده.");
    }
    throw new Error("رمزگشایی بکاپ ناموفق بود.");
  }
}

/** بازیابی از داده‌ی JSON parse‌شده با validation */
export async function restoreFromJson(parsed: any): Promise<BackupResult> {
  // Decrypt if encrypted (before validation)
  let decryptedPayload: any;
  try {
    decryptedPayload = decryptBackupPayload(parsed);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  // Validate manifest first
  const validation = validateBackupManifest(decryptedPayload);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const tables = decryptedPayload?.tables;
  // فقط جدول‌هایی که در فایل هستند بازیابی می‌شوند
  const present = ALL_TABLES.filter((t) => Array.isArray(tables[t.name]));
  let restoredRows = 0;

  await db.transaction(async (tx) => {
    for (const { table } of [...present].reverse()) {
      await tx.delete(table);
    }
    for (const { name, table } of present) {
      const data = tables[name] as any[];
      if (Array.isArray(data) && data.length > 0) {
        for (let i = 0; i < data.length; i += 500) {
          await tx.insert(table).values(data.slice(i, i + 500));
        }
        restoredRows += data.length;
      }
    }
    for (const { name } of present) {
      const data = tables[name] as any[];
      if (Array.isArray(data) && data.length > 0 && "id" in data[0]) {
        await tx
          .execute(
            sql.raw(
              `SELECT setval(pg_get_serial_sequence('"${name}"', 'id'), COALESCE((SELECT MAX(id) FROM "${name}"), 1), true)`,
            ),
          )
          .catch(() => {});
      }
    }
  });

  return { ok: true, tables: present.length, rows: restoredRows };
}

export type BackupFileInfo = {
  file: string;
  type: "json" | "sql";
  size: string;
  date: string;
  auto: boolean;
  mtime: number;
};

/** لیست فایل‌های بکاپ (جدیدترین اول) */
export async function listBackups(): Promise<BackupFileInfo[]> {
  await mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const files = await readdir(BACKUP_DIR);
  const result: BackupFileInfo[] = [];
  for (const f of files) {
    if (!/\.(sql|dump|gz|json)$/.test(f)) continue;
    try {
      const st = await stat(path.join(BACKUP_DIR, f));
      result.push({
        file: f,
        type: f.endsWith(".json") ? "json" : "sql",
        size: fmtSize(st.size),
        date: new Date(st.mtime).toLocaleString("fa-IR"),
        auto: f.startsWith("auto-"),
        mtime: st.mtimeMs,
      });
    } catch {
      /* ignore */
    }
  }
  return result.sort((a, b) => b.mtime - a.mtime);
}

/**
 * حذف فایل بکاپ با path traversal protection
 */
export async function deleteBackup(filename: string): Promise<boolean> {
  // Path traversal protection: only allow basename
  const safeName = path.basename(filename);
  if (safeName !== filename) {
    return false; // Reject paths with directory components
  }

  // Validate filename format
  if (!/^[\w.\-]+$/.test(safeName)) {
    return false;
  }

  const filePath = path.join(BACKUP_DIR, safeName);

  // Ensure file is within BACKUP_DIR
  const resolvedPath = path.resolve(filePath);
  const resolvedBackupDir = path.resolve(BACKUP_DIR);
  if (!resolvedPath.startsWith(resolvedBackupDir + path.sep)) {
    return false; // Path traversal attempt
  }

  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/** نگه‌داری فقط N بکاپِ خودکارِ اخیر */
export async function applyAutoRetention(keep: number): Promise<void> {
  const list = (await listBackups()).filter((b) => b.auto);
  const toDelete = list.slice(Math.max(0, keep));
  for (const b of toDelete) await deleteBackup(b.file);
}

// ─── تنظیمات بکاپ خودکار (در یک ردیف siteSettings ذخیره می‌شود) ───

export type AutoBackupConfig = {
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly";
  time: string; // "HH:MM" برای daily/weekly
  weekday: number; // 0..6 برای weekly (0=یکشنبه)
  retention: number; // تعداد بکاپ خودکار برای نگه‌داری
  groups: string[]; // خالی = همه
  lastRun: string | null;
};

export const DEFAULT_AUTO_CONFIG: AutoBackupConfig = {
  enabled: false,
  frequency: "daily",
  time: "03:00",
  weekday: 5,
  retention: 3,
  groups: [],
  lastRun: null,
};

const CONFIG_KEY = "auto_config";
const CONFIG_GROUP = "backup";

export async function getAutoConfig(): Promise<AutoBackupConfig> {
  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, CONFIG_KEY), eq(siteSettings.group, CONFIG_GROUP)));
    if (!row) return { ...DEFAULT_AUTO_CONFIG };
    return { ...DEFAULT_AUTO_CONFIG, ...(row.value as any) };
  } catch {
    return { ...DEFAULT_AUTO_CONFIG };
  }
}

export async function saveAutoConfig(cfg: AutoBackupConfig): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: CONFIG_KEY, value: cfg as any, group: CONFIG_GROUP, locale: "fa" })
    .onConflictDoUpdate({
      target: [siteSettings.key, siteSettings.locale],
      set: { value: cfg as any, group: CONFIG_GROUP },
    });
}

/** آیا با توجه به تنظیمات، اکنون زمان اجرای بکاپ خودکار است؟ */
export function isDue(cfg: AutoBackupConfig, now = new Date()): boolean {
  if (!cfg.enabled) return false;
  const last = cfg.lastRun ? new Date(cfg.lastRun) : null;
  const minsSince = last ? (now.getTime() - last.getTime()) / 60000 : Infinity;

  if (cfg.frequency === "hourly") {
    return minsSince >= 60;
  }
  const [h, m] = (cfg.time || "03:00").split(":").map((n) => parseInt(n, 10));
  const matchTime = now.getHours() === h && now.getMinutes() === (m || 0);
  if (cfg.frequency === "daily") {
    return matchTime && minsSince >= 60;
  }
  if (cfg.frequency === "weekly") {
    return now.getDay() === cfg.weekday && matchTime && minsSince >= 60;
  }
  return false;
}

/** اجرای بکاپ خودکار در صورت رسیدن زمان (بدون خطا) */
export async function runScheduledIfDue(): Promise<BackupResult | null> {
  const cfg = await getAutoConfig();
  if (!isDue(cfg)) return null;
  const res = await createJsonBackup(cfg.groups, { auto: true });
  if (res.ok) {
    await applyAutoRetention(cfg.retention || 3);
    await saveAutoConfig({ ...cfg, lastRun: new Date().toISOString() });
  }
  return res;
}

// ─── زمان‌بند درون‌فرآیندی (تا وقتی سرور روشن است کار می‌کند) ───
const g = globalThis as typeof globalThis & { __backupScheduler?: NodeJS.Timeout };

export function ensureScheduler(): void {
  if (g.__backupScheduler) return;
  g.__backupScheduler = setInterval(() => {
    runScheduledIfDue().catch(() => {});
  }, 60_000); // هر دقیقه بررسی می‌شود
}
