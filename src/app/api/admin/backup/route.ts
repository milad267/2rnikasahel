import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { readdir, readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import util from "node:util";
import { getCurrentUser } from "@/lib/auth";

const execPromise = util.promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), "backups");

export const dynamic = "force-dynamic";

function getDbUrl(): { host: string; port: string; user: string; password: string; database: string } | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const action = req.nextUrl.searchParams.get("action");

  if (action === "list") {
    await mkdir(BACKUP_DIR, { recursive: true });
    const files = await readdir(BACKUP_DIR);
    const result = await Promise.all(
      files
        .filter(f => f.endsWith(".sql") || f.endsWith(".dump") || f.endsWith(".gz"))
        .sort()
        .reverse()
        .slice(0, 20)
        .map(async (f) => {
          const stat = await readFile(path.join(BACKUP_DIR, f)).then(b => ({ size: b.length })).catch(() => ({ size: 0 }));
          return {
            file: f,
            size: stat.size > 1024 * 1024 ? `${(stat.size / 1024 / 1024).toFixed(1)} MB` : `${(stat.size / 1024).toFixed(1)} KB`,
            date: f.replace(/\.sql$/, "").replace(/_/g, " ").replace(/-/g, "/"),
          };
        }),
    );
    return NextResponse.json({ ok: true, files: result });
  }

  if (action === "download") {
    const filename = req.nextUrl.searchParams.get("file");
    if (!filename) return NextResponse.json({ ok: false, error: "filename required" }, { status: 400 });
    const filePath = path.join(BACKUP_DIR, path.basename(filename));
    if (!existsSync(filePath)) return NextResponse.json({ ok: false, error: "فایل یافت نشد" }, { status: 404 });

    const stream = createReadStream(filePath);
    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/octet-stream");
    res.headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    return res;
  }

  return NextResponse.json({ ok: false, error: "action must be list or download" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const action = req.nextUrl.searchParams.get("action");

  if (action === "create") {
    const dbInfo = getDbUrl();
    if (!dbInfo) return NextResponse.json({ ok: false, error: "DATABASE_URL تنظیم نشده" }, { status: 400 });

    await mkdir(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    try {
      // استفاده از pg_dump
      const cmd = `pg_dump --host=${dbInfo.host} --port=${dbInfo.port} --username=${dbInfo.user} --dbname=${dbInfo.database} --no-password --file="${filepath}"`;
      await execPromise(cmd, { env: { ...process.env, PGPASSWORD: dbInfo.password }, timeout: 120000 });
      const stat = await readFile(filepath).then(b => b.length);
      return NextResponse.json({
        ok: true,
        file: filename,
        size: stat > 1024 * 1024 ? `${(stat / 1024 / 1024).toFixed(1)} MB` : `${(stat / 1024).toFixed(1)} KB`,
        date: timestamp.replace(/T/, " "),
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: `خطا در pg_dump: ${e.message}` }, { status: 500 });
    }
  }

  if (action === "restore") {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده" }, { status: 400 });

    const dbInfo = getDbUrl();
    if (!dbInfo) return NextResponse.json({ ok: false, error: "DATABASE_URL تنظیم نشده" }, { status: 400 });

    const tempPath = path.join(BACKUP_DIR, `temp_restore_${Date.now()}.sql`);
    await mkdir(BACKUP_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    try {
      const cmd = `psql --host=${dbInfo.host} --port=${dbInfo.port} --username=${dbInfo.user} --dbname=${dbInfo.database} --no-password --file="${tempPath}"`;
      await execPromise(cmd, { env: { ...process.env, PGPASSWORD: dbInfo.password }, timeout: 300000 });
      await unlink(tempPath).catch(() => {});
      return NextResponse.json({ ok: true, message: "بازیابی با موفقیت انجام شد" });
    } catch (e: any) {
      await unlink(tempPath).catch(() => {});
      return NextResponse.json({ ok: false, error: `خطا در بازیابی: ${e.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "action must be create or restore" }, { status: 400 });
}
