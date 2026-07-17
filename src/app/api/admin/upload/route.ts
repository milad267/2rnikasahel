import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { enforceRateLimit } from "@/lib/request-security";
import { UPLOAD_PUBLIC_DIR, UPLOAD_PRIVATE_DIR, ALLOWED_UPLOAD_CATEGORIES, type AllowedUploadCategory } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════
//  MIME → Extension Mapping (برای تصاویر و ویدیوهای شناخته‌شده)
//  برای سایر فرمت‌ها، پسوند از نام فایل کاربر استخراج می‌شود
// ═══════════════════════════════════════════

const IMAGE_MIME_MAP: Readonly<Record<string, string>> = Object.freeze({
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "jpg",
  "image/heif": "jpg",
  "image/svg+xml": "svg",
});

const VIDEO_MIME_MAP: Readonly<Record<string, string>> = Object.freeze({
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
});

// ═══════════════════════════════════════════
//  Category Visibility Mapping
// ═══════════════════════════════════════════

const PRIVATE_CATEGORIES = new Set(["chat", "document", "private", "attachment"]);
const PUBLIC_CATEGORIES = new Set(["product", "blog", "slide", "brand", "category", "general", "banner"]);

// ═══════════════════════════════════════════
//  Image Bomb Prevention (فقط برای تصاویر)
// ═══════════════════════════════════════════

const MAX_IMAGE_WIDTH = 8000;
const MAX_IMAGE_HEIGHT = 8000;
const MAX_IMAGE_PIXELS = 50_000_000; // 50MP

// ═══════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════

/** تعیین مسیر بر اساس عمومی/خصوصی */
function resolveUploadDir(isPrivate: boolean): string {
  return isPrivate ? UPLOAD_PRIVATE_DIR : UPLOAD_PUBLIC_DIR;
}

/** ساخت URL امن برای فایل */
function buildFileUrl(storageName: string, isPrivate: boolean): string {
  if (isPrivate) {
    return `/api/admin/file?id=${storageName}`;
  }
  return `/api/public/file?id=${storageName}`;
}

/** محدود و پاک‌سازی altText */
function sanitizeAltText(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/[\r\n\t\u0000]/g, " ").trim().slice(0, 255) || null;
}

/** استخراج extension از MIME یا نام فایل — همه فرمت‌ها مجاز هستند */
function extFromFile(file: File): string {
  // ابتدا از MIME برای تصاویر/ویدیوهای شناخته‌شده
  const mimeExt = IMAGE_MIME_MAP[file.type] || VIDEO_MIME_MAP[file.type];
  if (mimeExt) return mimeExt;

  // برای سایر فایل‌ها، پسوند از نام فایل استخراج می‌شود
  const nameExt = path.extname(file.name).toLowerCase().replace(".", "");
  // پاک‌سازی پسوند — فقط حروف و اعداد
  const safeExt = nameExt.replace(/[^a-z0-9]/g, "").slice(0, 10);
  return safeExt || "bin";
}

/** بررسی visibility از category */
function getVisibility(category: string): "public" | "private" {
  return PRIVATE_CATEGORIES.has(category) ? "private" : "public";
}

// ═══════════════════════════════════════════
//  GET — لیست فایل‌ها با Pagination و Filter
// ═══════════════════════════════════════════

const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const category = req.nextUrl.searchParams.get("category");
  const visibility = req.nextUrl.searchParams.get("visibility");
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || String(PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  // Admin فقط فایل‌های عمومی یا فایل‌های خصوصی خودش را می‌بیند
  const conditions = [];
  if (category) {
    conditions.push(eq(uploadedFiles.category, category));
  }
  if (visibility === "public") {
    conditions.push(eq(uploadedFiles.visibility, "public"));
  } else if (visibility === "private") {
    // Admin فقط فایل‌های خصوصی خودش را می‌بیند
    conditions.push(eq(uploadedFiles.ownerUserId, auth.user!.id));
  }

  const query = db
    .select()
    .from(uploadedFiles)
    .where(conditions.length > 0 ? eq(uploadedFiles.visibility, visibility || "public") : undefined)
    .orderBy(desc(uploadedFiles.createdAt))
    .limit(limit)
    .offset(offset);

  const data = await query;
  return NextResponse.json({ ok: true, data, page, limit, hasMore: data.length === limit });
}

// ═══════════════════════════════════════════
//  POST — آپلود امن (همه فرمت‌ها مجاز)
// ═══════════════════════════════════════════

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const limited = enforceRateLimit(req, `admin-upload:${auth.user!.id}`, 20, 60_000);
  if (limited) return limited;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawCategory = String(formData.get("category") || "general").slice(0, 40).toLowerCase();
    const altText = sanitizeAltText(formData.get("altText") as string);
    const skipWatermark = formData.get("skipWatermark") === "true";

    if (!file) {
      return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده است." }, { status: 400 });
    }

    // ─── Category Allowlist ───
    const category: AllowedUploadCategory = (ALLOWED_UPLOAD_CATEGORIES as readonly string[]).includes(rawCategory)
      ? rawCategory as AllowedUploadCategory
      : "general";

    const visibility = getVisibility(category);
    const isPrivate = visibility === "private";

    // ─── همه فرمت‌ها مجاز هستند — هیچ محدودیت MIME وجود ندارد ───
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    // ─── Size Limits (بدون محدودیت فرمت — فقط محدودیت حجم) ───
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for all files
    const maxSize = MAX_FILE_SIZE;
    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      return NextResponse.json({ ok: false, error: `حجم فایل نباید بیشتر از ${limitMB} مگابایت باشد.` }, { status: 400 });
    }

    // ─── Extension from MIME or filename (همه فرمت‌ها مجاز) ───
    const ext = extFromFile(file);

    // ─── Read Buffer ───
    const buffer = Buffer.from(await file.arrayBuffer());

    // ─── File Processing ───
    let processedBuffer: Buffer;
    let finalMimeType = file.type || "application/octet-stream";
    let storageExt = ext;

    if (isImage && file.type !== "image/svg+xml") {
      // Image (except SVG): try to process with Sharp, fallback to raw buffer
      try {
        const sharp = (await import("sharp")).default;
        const image = sharp(buffer);
        const metadata = await image.metadata();

        // Pixel bomb prevention (skip if can't read dimensions)
        if (metadata.width && metadata.height) {
          if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
            console.warn("[UPLOAD] Image dimensions too large, saving raw");
            processedBuffer = buffer;
          } else if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
            console.warn("[UPLOAD] Image pixels too many, saving raw");
            processedBuffer = buffer;
          } else {
            let pipeline = image;
            const targetWidth = 1400;
            if (metadata.width && metadata.width > targetWidth) {
              pipeline = pipeline.resize(targetWidth, undefined, { fit: "inside", withoutEnlargement: true });
            }

            // واترمارک: تشخیص خودکار پس‌زمینه روشن/تاریک و انتخاب لوگوی مناسب
            if (!skipWatermark) {
              try {
                const sharp = (await import("sharp")).default;
                const finalBuffer = await pipeline.toBuffer();
                const finalMetadata = await sharp(finalBuffer).metadata();
                const w = finalMetadata.width || targetWidth;
                const h = finalMetadata.height || 500;

                // تشخیص میانگین روشنایی تصویر (sample از گوشه پایین-رست)
                const regionSize = Math.min(100, Math.floor(w * 0.3), Math.floor(h * 0.3));
                const regionLeft = Math.max(0, w - regionSize);
                const regionTop = Math.max(0, h - regionSize);
                const region = await sharp(finalBuffer)
                  .extract({ left: regionLeft, top: regionTop, width: regionSize, height: regionSize })
                  .greyscale()
                  .raw()
                  .toBuffer();
                // میانگین روشنایی پیکسل‌ها
                let sum = 0;
                for (let i = 0; i < region.length; i++) sum += region[i];
                const avgBrightness = sum / region.length; // 0-255
                // روشن > 160 → لوگو مشکی، تاریک < 160 → لوگو سفید
                const logoPath = avgBrightness > 160
                  ? path.join(process.cwd(), "public", "logo", "logo.svg")
                  : path.join(process.cwd(), "public", "logo", "logo-white.svg");

                const logoBuffer = await readFile(logoPath);
                const wmWidth = Math.round(w * 0.25);
                const wmHeight = Math.round(wmWidth * 0.62); // نسبت تقریبی لوگو
                const wmPng = await sharp(logoBuffer)
                  .resize(wmWidth, wmHeight, { fit: "inside" })
                  .png()
                  .toBuffer();

                pipeline = sharp(finalBuffer).composite([{
                  input: wmPng,
                  top: Math.max(10, h - wmHeight - 15),
                  left: Math.max(10, w - wmWidth - 15),
                  blend: "over",
                }]);
              } catch (wmErr) {
                console.warn("[UPLOAD] Watermark composite failed, skipping watermark:", wmErr);
              }
            }

            // Convert to JPEG در آخر
            pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
            finalMimeType = "image/jpeg";
            storageExt = "jpg";

            processedBuffer = await pipeline.toBuffer();
          }
        } else {
          processedBuffer = buffer;
        }
      } catch (sharpErr) {
        // Sharp failed — save original file instead of rejecting
        console.warn("[UPLOAD] Sharp processing failed, saving original file:", sharpErr);
        processedBuffer = buffer;
      }
    } else {
      // Video, SVG, documents, archives, code, etc. — save directly without processing
      processedBuffer = buffer;
    }

    // ─── Write to Persistent Storage ───
    const storageName = crypto.randomBytes(12).toString("hex") + "." + storageExt;
    const uploadDir = resolveUploadDir(isPrivate);
    await mkdir(uploadDir, { recursive: true, mode: 0o750 });

    const outputPath = path.join(uploadDir, storageName);
    await writeFile(outputPath, processedBuffer, { mode: isPrivate ? 0o600 : 0o644 });

    const url = buildFileUrl(storageName, isPrivate);
    const fileSize = processedBuffer.length;

    // ─── Save to Database with Ownership ───
    const [saved] = await db
      .insert(uploadedFiles)
      .values({
        filename: file.name,
        url,
        mimeType: finalMimeType,
        size: fileSize,
        category,
        altText,
        visibility,
        ownerUserId: auth.user!.id,
        ownerType: "admin",
      })
      .returning();

    return NextResponse.json({ ok: true, file: saved });
  } catch (error) {
    console.error("[UPLOAD] Internal error:", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}