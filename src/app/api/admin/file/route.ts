import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin-security";
import { UPLOAD_PRIVATE_DIR } from "@/lib/storage-paths";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * سرو فایل‌های خصوصی (پیوست چت، مدارک، فایل ادمین)
 * فقط با احراز هویت — مسیر APP_DATA_DIR/uploads/private
 *
 * قوانین دسترسی:
 * - Superadmin: دسترسی به همه فایل‌های خصوصی
 * - Admin: فقط فایل‌های خصوصی خودش (ownerUserId = auth.user.id)
 * - هیچ Admin نمی‌تواند فایل خصوصی Admin دیگر را ببیند
 */

const ALLOWED_FILENAME = /^[a-f0-9]+\.[a-z0-9]{1,10}$/;

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !ALLOWED_FILENAME.test(id)) {
    return NextResponse.json({ ok: false, error: "فایل نامعتبر است." }, { status: 400 });
  }

  // Path traversal protection
  const safeName = path.basename(id);
  if (safeName !== id) {
    return NextResponse.json({ ok: false, error: "مسیر نامعتبر." }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_PRIVATE_DIR, safeName);

  try {
    // ─── Check DB: file must exist, be private, and belong to this admin ───
    const [fileRecord] = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.url, `/api/admin/file?id=${safeName}`))
      .limit(1);

    if (!fileRecord) {
      return NextResponse.json({ ok: false, error: "فایل پیدا نشد." }, { status: 404 });
    }

    // Must be private
    if (fileRecord.visibility !== "private") {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز." }, { status: 403 });
    }

    // Ownership check: admin can only access own private files
    const isSuperAdmin = auth.role === "superadmin";
    if (!isSuperAdmin && fileRecord.ownerUserId !== auth.user!.id) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز — این فایل متعلق به شما نیست." }, { status: 403 });
    }

    const fileStat = await stat(filePath);
    const ext = path.extname(safeName).toLowerCase().replace(".", "");
    const mimeType = MIME_MAP[ext] || "application/octet-stream";

    // Stream the file instead of reading fully into RAM
    const stream = createReadStream(filePath);

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "فایل پیدا نشد." }, { status: 404 });
  }
}
