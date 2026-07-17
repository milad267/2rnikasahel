import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_PUBLIC_DIR } from "@/lib/storage-paths";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * سرو فایل‌های عمومی (تصاویر محصول، بلاگ، اسلایدر)
 * از مسیر APP_DATA_DIR/uploads/public — نه از public/
 * فقط فایل‌هایی که در DB با visibility=public ثبت شده‌اند را سرو می‌کند.
 */

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
};

// SVG و PDF به‌صورت inline سرو نمی‌شوند — فقط attachment
const INLINE_DISALLOWED = new Set(["svg", "pdf"]);

const ALLOWED_FILENAME = /^[a-f0-9]+\.[a-z0-9]{1,10}$/;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !ALLOWED_FILENAME.test(id)) {
    return NextResponse.json({ ok: false, error: "فایل نامعتبر است." }, { status: 400 });
  }

  // Path traversal protection
  const safeName = path.basename(id);
  if (safeName !== id) {
    return NextResponse.json({ ok: false, error: "مسیر نامعتبر." }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_PUBLIC_DIR, safeName);

  try {
    // ─── Check DB: file must exist and be public ───
    const ext = path.extname(safeName).toLowerCase().replace(".", "");
    const [fileRecord] = await db
      .select()
      .from(uploadedFiles)
      .where(and(eq(uploadedFiles.url, `/api/public/file?id=${safeName}`), eq(uploadedFiles.visibility, "public")))
      .limit(1);

    if (!fileRecord) {
      return NextResponse.json({ ok: false, error: "فایل پیدا نشد." }, { status: 404 });
    }

    const fileStat = await stat(filePath);
    const mimeType = MIME_MAP[ext] || "application/octet-stream";
    const isInline = !INLINE_DISALLOWED.has(ext);

    // Stream the file instead of reading fully into RAM
    const stream = createReadStream(filePath);

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${safeName}"`,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "فایل پیدا نشد." }, { status: 404 });
  }
}
