import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { UPLOAD_PUBLIC_DIR } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

/**
 * POST /api/profile/avatar
 * آپلود عکس پروفایل کاربر
 * نیاز به احراز هویت دارد
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده است." }, { status: 400 });
    }

    // فقط تصاویر مجاز هستند
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "فقط تصاویر مجاز هستند." }, { status: 400 });
    }

    // محدودیت حجم: ۵ مگابایت
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "حجم تصویر نباید بیشتر از ۵ مگابایت باشد." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // پردازش تصویر با Sharp
    let processedBuffer: Buffer;
    let finalMimeType = "image/jpeg";
    let storageExt = "jpg";

    try {
      const sharp = (await import("sharp")).default;
      // resize به ۲۵۶×۲۵۶ با حفظ نسبت ابعاد و کراپ (cover)
      processedBuffer = await sharp(buffer)
        .resize(256, 256, { fit: "cover", position: "center" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } catch {
      // اگر Sharp کار نکرد، فایل اصلی را ذخیره می‌کنیم
      processedBuffer = buffer;
      finalMimeType = file.type || "image/jpeg";
      const ext = path.extname(file.name).toLowerCase().replace(".", "") || "jpg";
      storageExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 10) || "jpg";
    }

    // ذخیره فایل
    const storageName = `avatar-${crypto.randomBytes(12).toString("hex")}.${storageExt}`;
    const uploadDir = UPLOAD_PUBLIC_DIR;
    await mkdir(uploadDir, { recursive: true });

    const outputPath = path.join(uploadDir, storageName);
    await writeFile(outputPath, processedBuffer);

    const url = `/api/public/file?id=${storageName}`;
    const fileSize = processedBuffer.length;

    // حذف آواتار قبلی کاربر (فقط رکوردهای DB، فایل‌ها باقی می‌مانند)
    const prevAvatars = await db
      .select({ id: uploadedFiles.id })
      .from(uploadedFiles)
      .where(and(eq(uploadedFiles.ownerUserId, user.id), eq(uploadedFiles.category, "avatar")));

    if (prevAvatars.length > 0) {
      await db.delete(uploadedFiles)
        .where(and(eq(uploadedFiles.ownerUserId, user.id), eq(uploadedFiles.category, "avatar")));
    }

    // ذخیره رکورد جدید
    const [saved] = await db
      .insert(uploadedFiles)
      .values({
        filename: file.name,
        url,
        mimeType: finalMimeType,
        size: fileSize,
        category: "avatar",
        visibility: "public",
        ownerUserId: user.id,
        ownerType: "user",
        altText: `آواتار ${user.name}`,
      })
      .returning();

    return NextResponse.json({ ok: true, url: saved.url, file: saved });
  } catch (error) {
    console.error("[AVATAR_UPLOAD] Error:", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور." }, { status: 500 });
  }
}

/**
 * GET /api/profile/avatar
 * دریافت آواتار کاربر جاری
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });
  }

  try {
    const [avatar] = await db
      .select()
      .from(uploadedFiles)
      .where(and(eq(uploadedFiles.ownerUserId, user.id), eq(uploadedFiles.category, "avatar")))
      .orderBy(desc(uploadedFiles.createdAt))
      .limit(1);

    return NextResponse.json({
      ok: true,
      avatar: avatar || null,
      url: avatar?.url || null,
    });
  } catch (error) {
    console.error("[AVATAR_GET] Error:", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور." }, { status: 500 });
  }
}
