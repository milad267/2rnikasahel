import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import {
  requireSuperAdmin,
  checkRateLimit,
  createDatabaseBackup,
  auditLog,
  gitPull,
  extractZipToProject,
} from "@/lib/admin-security";
import {
  BACKUP_DIR,
  BACKUP_GROUPS,
  createJsonBackup,
  listBackups,
  deleteBackup,
  getAutoConfig,
  saveAutoConfig,
  runScheduledIfDue,
  ensureScheduler,
  applyAutoRetention,
  decryptBackupPayload,
  DEFAULT_AUTO_CONFIG,
  type AutoBackupConfig,
} from "@/lib/backup";
import { db } from "@/db";
import * as schema from "@/db/schema";
// archiver ╪¿╪▒╪º█î ╪│╪º╫«╪¬ ┘ü╪º█î┘ä ┘ç╪º█î ┘▓█î┘╛
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver");
import { Writable } from "node:stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

ensureScheduler();

// ═══════════════════════════════════════════
//  JSON Schema for backup file validation
// ═══════════════════════════════════════════

interface BackupMetadata {
  version: number;
  createdAt: string;
  groups: string[] | "all";
  auto: boolean;
  tableCount: number;
  totalRows: number;
}

interface BackupFileContent {
  version: number;
  createdAt: string;
  groups: string[] | "all";
  auto?: boolean;
  tables: Record<string, any[]>;
}

/** Build valid table names from the known schema */
const VALID_TABLE_NAMES = [
  "site_settings", "color_palettes", "categories", "units", "brands", "tags",
  "products", "product_variants", "product_tags",
  "landing_slides", "landing_features", "slides",
  "blog_categories", "blog_posts", "blog_post_tags",
  "users", "user_addresses", "orders", "order_items", "order_history",
  "quote_requests", "contact_messages", "sms_providers",
];

const validTablesSet = new Set(VALID_TABLE_NAMES);

/** Validate backup JSON against expected schema */
function validateBackupSchema(parsed: any): { ok: true; meta: BackupMetadata } | { ok: false; error: string } {
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
  for (const name of tableNames) {
    if (!validTablesSet.has(name)) {
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

  const meta: BackupMetadata = {
    version: parsed.version,
    createdAt: parsed.createdAt,
    groups: parsed.groups || "all",
    auto: !!parsed.auto,
    tableCount: tableNames.length,
    totalRows,
  };

  return { ok: true, meta };
}

/** In-process restore with transaction & rollback support */
async function safeRestoreFromJson(parsed: BackupFileContent): Promise<{ ok: true; rows: number; tables: number } | { ok: false; error: string }> {
  const tables = parsed.tables;
  const ALL_TABLES = [
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

  const present = ALL_TABLES.filter((t) => Array.isArray(tables[t.name]));
  let restoredRows = 0;

  try {
    await db.transaction(async (tx) => {
      // Delete in reverse dependency order
      for (const { table } of [...present].reverse()) {
        await tx.delete(table);
      }
      // Insert in dependency order
      for (const { name, table } of present) {
        const data = tables[name] as any[];
        if (Array.isArray(data) && data.length > 0) {
          for (let i = 0; i < data.length; i += 500) {
            await tx.insert(table).values(data.slice(i, i + 500));
          }
          restoredRows += data.length;
        }
      }
    });

    return { ok: true, rows: restoredRows, tables: present.length };
  } catch (e: any) {
    // Transaction auto-rolls back on error
    return { ok: false, error: `خطا در بازیابی (تراکنش برگشت خورد): ${e.message}` };
  }
}

// ═══════════════════════════════════════════
//  GET handler — read-only actions
// ═══════════════════════════════════════════

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  const action = req.nextUrl.searchParams.get("action");

  if (action === "list") {
    const files = await listBackups();
    return NextResponse.json({ ok: true, files });
  }

  if (action === "groups") {
    return NextResponse.json({
      ok: true,
      groups: BACKUP_GROUPS.map((g) => ({ id: g.id, label: g.label, desc: g.desc, tableCount: g.tables.length })),
    });
  }

  if (action === "config") {
    const config = await getAutoConfig();
    return NextResponse.json({ ok: true, config });
  }

  if (action === "download") {
    const filename = req.nextUrl.searchParams.get("file");
    const asZip = req.nextUrl.searchParams.get("zip") === "true";
    if (!filename) return NextResponse.json({ ok: false, error: "filename required" }, { status: 400 });
    const safeName = path.basename(filename);
    if (!/^[\w.\-]+$/.test(safeName)) return NextResponse.json({ ok: false, error: "نام فایل نامعتبر" }, { status: 400 });
    const filePath = path.join(BACKUP_DIR, safeName);
    if (!existsSync(filePath)) return NextResponse.json({ ok: false, error: "فایل یافت نشد" }, { status: 404 });

    if (asZip) {
      // ایجاد فایل زیپ روی‌فای
      const zipName = safeName.replace(/\.(json|sql)(\.enc)?$/i, ".zip");
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.append(createReadStream(filePath), { name: safeName });

      const chunks: Buffer[] = [];
      const writable = new Writable({
        write(chunk: Buffer, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });
      archive.pipe(writable);
      await archive.finalize();
      const zipBuffer = Buffer.concat(chunks);

      const res = new NextResponse(zipBuffer);
      res.headers.set("Content-Type", "application/zip");
      res.headers.set("Content-Disposition", `attachment; filename="${zipName}"`);
      return res;
    }

    const stream = createReadStream(filePath);
    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/octet-stream");
    res.headers.set("Content-Disposition", `attachment; filename="${safeName}"`);
    return res;
  }

  return NextResponse.json({ ok: false, error: "action نامعتبر" }, { status: 400 });
}

// ═══════════════════════════════════════════
//  POST handler — mutating actions
// ═══════════════════════════════════════════

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting: 3 requests per 60 seconds per IP
  if (!checkRateLimit(`backup:${ip}`, 3, 60_000)) {
    return NextResponse.json({ ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه صبر کنید." }, { status: 429 });
  }

  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  const action = req.nextUrl.searchParams.get("action") || "";
  const actor = auth.user?.name || "unknown";

  // ─── ایجاد بکاپ JSON ───
  if (action === "create-json") {
    try {
      const body = await req.json().catch(() => ({}));
      const groupIds = Array.isArray(body?.groups) ? body.groups : [];
      const auto = body?.auto === true;
      const result = await createJsonBackup(groupIds.length > 0 ? groupIds : [], { auto });
      if (result.ok) {
        await auditLog({ action: "backup:create-json", actor, target: result.file, result: "success", details: `${result.rows} rows, ${result.tables} tables`, ip });
        // Update auto config's lastRun when auto backup is created via UI
        if (auto) {
          const cfg = await getAutoConfig();
          await saveAutoConfig({ ...cfg, lastRun: new Date().toISOString() });
        }
      }
      return NextResponse.json(result);
    } catch (e: any) {
      await auditLog({ action: "backup:create-json", actor, result: "failure", details: e.message, ip });
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // ─── ایجاد بکاپ SQL با pg_dump ───
  if (action === "create") {
    try {
      const filename = await createDatabaseBackup();
      await auditLog({ action: "backup:create-sql", actor, target: filename, result: "success", ip });
      return NextResponse.json({ ok: true, file: filename });
    } catch (e: any) {
      await auditLog({ action: "backup:create-sql", actor, result: "failure", details: e.message, ip });
      return NextResponse.json({ ok: false, error: `خطا در pg_dump: ${e.message}` }, { status: 500 });
    }
  }

  // ─── Preview backup content (read-only, no restore) ───
  if (action === "preview") {
    try {
      const body = await req.json().catch(() => ({}));
      const filename = String(body?.file || "").trim();
      if (!filename) return NextResponse.json({ ok: false, error: "نام فایل الزامی است" }, { status: 400 });

      const safeName = path.basename(filename);
      if (!/^[\w.\-]+$/.test(safeName)) return NextResponse.json({ ok: false, error: "نام فایل نامعتبر" }, { status: 400 });

      const filepath = path.join(BACKUP_DIR, safeName);
      if (!existsSync(filepath)) return NextResponse.json({ ok: false, error: "فایل بکاپ یافت نشد" }, { status: 404 });

      const ext = path.extname(safeName).toLowerCase();
      if (ext !== ".json") {
        return NextResponse.json({ ok: false, error: "پیش‌نمایش فقط برای بکاپ‌های JSON امکان‌پذیر است" }, { status: 400 });
      }

      const raw = await readFile(filepath, "utf-8");
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return NextResponse.json({ ok: false, error: "فایل JSON خراب است" }, { status: 400 });
      }

      // Decrypt if encrypted before validation
      let decryptedPayload: any;
      try {
        decryptedPayload = decryptBackupPayload(parsed);
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
      }

      const validation = validateBackupSchema(decryptedPayload);
      if (!validation.ok) {
        return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
      }

      // Return metadata + table summaries (NO actual data)
      const tableSummaries: Record<string, { rowCount: number; sampleKeys: string[] }> = {};
      for (const [name, rows] of Object.entries(decryptedPayload.tables as Record<string, any[]>)) {
        tableSummaries[name] = {
          rowCount: rows.length,
          sampleKeys: rows.length > 0 ? Object.keys(rows[0]).slice(0, 5) : [],
        };
      }

      return NextResponse.json({
        ok: true,
        meta: validation.meta,
        tables: tableSummaries,
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // ─── Upload & preview backup file before restore ───
  if (action === "restore-upload") {
    try {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return NextResponse.json({ ok: false, error: "فایلی ارسال نشده" }, { status: 400 });

      const buf = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name).toLowerCase();
      if (ext !== ".json") {
        return NextResponse.json({ ok: false, error: "بازیابی فقط برای فایل‌های JSON مجاز است. برای فایل SQL از طریق SSH اقدام کنید." }, { status: 400 });
      }

      await mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
      const safeName = `restore-${crypto.randomBytes(4).toString("hex")}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const filepath = path.join(BACKUP_DIR, safeName);
      await writeFile(filepath, buf, { mode: 0o600 });

      // Validate the uploaded backup
      const raw = buf.toString("utf-8");
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        await unlink(filepath).catch(() => {});
        return NextResponse.json({ ok: false, error: "فایل JSON خراب است" }, { status: 400 });
      }

      // Decrypt if encrypted
      let decryptedPayload: any;
      try {
        decryptedPayload = decryptBackupPayload(parsed);
      } catch (err: any) {
        await unlink(filepath).catch(() => {});
        return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
      }

      const validation = validateBackupSchema(decryptedPayload);
      if (!validation.ok) {
        await unlink(filepath).catch(() => {});
        return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
      }

      // Return table summaries (no actual data)
      const tableSummaries: Record<string, { rowCount: number }> = {};
      for (const [name, rows] of Object.entries(decryptedPayload.tables as Record<string, any[]>)) {
        tableSummaries[name] = { rowCount: rows.length };
      }

      return NextResponse.json({
        ok: true,
        file: safeName,
        originalName: file.name,
        meta: validation.meta,
        tables: tableSummaries,
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // ─── Restore from JSON backup (Superadmin + explicit confirmation + audit) ───
  if (action === "restore") {
    try {
      const body = await req.json().catch(() => ({}));
      const filename = String(body?.file || "").trim();
      const confirmed = body?.confirmed === true;

      if (!filename) return NextResponse.json({ ok: false, error: "نام فایل الزامی است" }, { status: 400 });

      // Path Traversal Protection
      const safeName = path.basename(filename);
      if (!/^[\w.\-]+$/.test(safeName)) return NextResponse.json({ ok: false, error: "نام فایل نامعتبر" }, { status: 400 });

      const filepath = path.join(BACKUP_DIR, safeName);
      if (!existsSync(filepath)) return NextResponse.json({ ok: false, error: "فایل بکاپ یافت نشد" }, { status: 404 });

      // Only .json restore allowed via panel — SQL restore must be external
      const ext = path.extname(safeName).toLowerCase();
      if (ext !== ".json") {
        await auditLog({ action: "backup:restore-denied", actor, target: safeName, result: "failure", details: "SQL restore denied from panel", ip });
        return NextResponse.json(
          { ok: false, error: "بازیابی SQL از پنل مدیریت غیرفعال شده است. لطفاً از طریق ssh و psql اقدام کنید." },
          { status: 403 },
        );
      }

      // Read and parse the file
      const raw = await readFile(filepath, "utf-8");
      let parsed: BackupFileContent;
      try {
        parsed = JSON.parse(raw);
      } catch {
        await auditLog({ action: "backup:restore", actor, target: safeName, result: "failure", details: "Invalid JSON", ip });
        return NextResponse.json({ ok: false, error: "فایل JSON خراب است" }, { status: 400 });
      }

      // Schema validation
      const validation = validateBackupSchema(parsed);
      if (!validation.ok) {
        await auditLog({ action: "backup:restore", actor, target: safeName, result: "failure", details: validation.error, ip });
        return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
      }

      // ─── If not confirmed, return preview info and ask for confirmation ───
      if (!confirmed) {
        return NextResponse.json({
          ok: true,
          action: "confirm-required",
          message: `بازیابی ${validation.meta.totalRows} ردیف در ${validation.meta.tableCount} جدول. برای ادامه، confirmed: true ارسال کنید.`,
          meta: validation.meta,
          warning: "این عملیات تمام داده‌های فعلی جدول‌های موجود در بکاپ را بازنویسی می‌کند و قابل بازگشت نیست.",
        });
      }

      // ─── Confirmed — execute restore with transaction ───
      const result = await safeRestoreFromJson(parsed);

      if (result.ok) {
        await auditLog({
          action: "backup:restore",
          actor,
          target: safeName,
          result: "success",
          details: `${result.rows} rows restored across ${result.tables} tables`,
          ip,
        });
        return NextResponse.json({
          ok: true,
          message: `بازیابی با موفقیت انجام شد: ${result.rows} ردیف در ${result.tables} جدول بازیابی شد.`,
          rows: result.rows,
          tables: result.tables,
        });
      } else {
        await auditLog({ action: "backup:restore", actor, target: safeName, result: "failure", details: result.error, ip });
        return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
      }
    } catch (e: any) {
      await auditLog({ action: "backup:restore", actor, result: "failure", details: e.message, ip });
      return NextResponse.json({ ok: false, error: `خطا در بازیابی: ${e.message}` }, { status: 500 });
    }
  }

  // ─── Git pull — update from GitHub ───
  if (action === "git-pull") {
    try {
      const body = await req.json().catch(() => ({}));
      const repo = String(body?.repo || "").trim();
      if (!repo) return NextResponse.json({ ok: false, error: "آدرس مخزن GitHub الزامی است" }, { status: 400 });
      if (!/^https?:\/\/.+/.test(repo)) return NextResponse.json({ ok: false, error: "آدرس مخزن نامعتبر" }, { status: 400 });

      const projectDir = process.env.NODE_ENV === "production"
        ? "/var/www/dornika-sahel"
        : process.cwd();

      const log = await gitPull(repo, projectDir);
      const ok = !log.some(l => l.includes("❌"));
      await auditLog({ action: "backup:git-pull", actor, result: ok ? "success" : "failure", details: log.join("; "), ip });
      return NextResponse.json({ ok, log });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message, log: [`❌ ${e.message}`] }, { status: 500 });
    }
  }

  // ─── Update from uploaded ZIP ───
  if (action === "update-from-zip") {
    try {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return NextResponse.json({ ok: false, error: "فایلی ارسال نشده" }, { status: 400 });

      const projectDir = process.env.NODE_ENV === "production"
        ? "/var/www/dornika-sahel"
        : process.cwd();

      const zipDir = path.join(process.cwd(), ".update-cache");
      await mkdir(zipDir, { recursive: true, mode: 0o700 });
      const zipPath = path.join(zipDir, `update-${crypto.randomBytes(4).toString("hex")}.zip`);
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(zipPath, buf, { mode: 0o600 });

      const log = await extractZipToProject(zipPath, projectDir);
      const ok = !log.some(l => l.includes("❌"));
      await auditLog({ action: "backup:update-from-zip", actor, result: ok ? "success" : "failure", details: log.join("; "), ip });
      return NextResponse.json({ ok, log });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message, log: [`❌ ${e.message}`] }, { status: 500 });
    }
  }

  // ─── حذف فایل بکاپ ───
  if (action === "delete") {
    const filename = req.nextUrl.searchParams.get("file");
    if (!filename) return NextResponse.json({ ok: false, error: "filename required" }, { status: 400 });
    const safeName = path.basename(filename);
    if (!/^[\w.\-]+$/.test(safeName)) return NextResponse.json({ ok: false, error: "نام فایل نامعتبر" }, { status: 400 });
    const ok = await deleteBackup(safeName);
    if (ok) {
      await auditLog({ action: "backup:delete", actor, target: safeName, result: "success", ip });
    }
    return NextResponse.json({ ok });
  }

  // ─── تنظیمات بکاپ خودکار ───
  if (action === "auto-config") {
    try {
      const body = await req.json() as Partial<AutoBackupConfig>;
      if (typeof body.enabled === "boolean") DEFAULT_AUTO_CONFIG.enabled = body.enabled;
      if (typeof body.frequency === "string" && ["hourly", "daily", "weekly"].includes(body.frequency)) {
        DEFAULT_AUTO_CONFIG.frequency = body.frequency;
      }
      if (typeof body.time === "string" && /^\d{2}:\d{2}$/.test(body.time)) {
        DEFAULT_AUTO_CONFIG.time = body.time;
      }
      if (Array.isArray(body.groups)) DEFAULT_AUTO_CONFIG.groups = body.groups.filter((g: any) => typeof g === "string");
      if (typeof body.retention === "number") DEFAULT_AUTO_CONFIG.retention = Math.max(1, body.retention);
      await saveAutoConfig(DEFAULT_AUTO_CONFIG);
      await auditLog({ action: "backup:auto-config", actor, result: "success", ip });
      return NextResponse.json({ ok: true, config: DEFAULT_AUTO_CONFIG });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (action === "run-auto-now") {
    try {
      const result = await runScheduledIfDue();
      if (result?.ok) {
        await auditLog({ action: "backup:run-auto", actor, target: result.file, result: "success", ip });
      }
      return NextResponse.json(result);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (action === "retention") {
    try {
      const config = await getAutoConfig();
      await applyAutoRetention(config.retention || 3);
      await auditLog({ action: "backup:retention", actor, result: "success", ip });
      return NextResponse.json({ ok: true, message: "پاکسازی بکاپ‌های خودکار انجام شد" });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "action نامعتبر" }, { status: 400 });
}