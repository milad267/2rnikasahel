import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_WIDTH = 1400;

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const data = category
    ? await db.select().from(uploadedFiles).where(eq(uploadedFiles.category, category)).orderBy(desc(uploadedFiles.createdAt))
    : await db.select().from(uploadedFiles).orderBy(desc(uploadedFiles.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = String(formData.get("category") || "general");
    const altText = (formData.get("altText") as string) || null;
    const skipWatermark = formData.get("skipWatermark") === "true";

    if (!file) {
      return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده است." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "فقط فایل‌های تصویری JPG/PNG/WEBP مجاز هستند." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "حجم فایل نباید بیشتر از ۱۰ مگابایت باشد." }, { status: 400 });
    }

    const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
    const safeName = crypto.randomBytes(12).toString("hex") + ext;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());

    // ─── پردازش تصویر با Sharp ───
    let processedBuffer: Buffer;

    try {
      const sharp = (await import("sharp")).default;
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // تغییر اندازه اگر عرض بیشتر از MAX_WIDTH باشد
      let pipeline = image;
      if (metadata.width && metadata.width > MAX_WIDTH) {
        pipeline = pipeline.resize(MAX_WIDTH, undefined, { fit: "inside", withoutEnlargement: true });
      }

      // تبدیل به JPEG با کیفیت ۸۵ (بهینه‌سازی حجم)
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });

      if (!skipWatermark) {
        // بارگذاری واترمارک
        const watermarkPath = path.join(process.cwd(), "public", "watermark.svg");
        let watermarkBuffer: Buffer;
        try {
          watermarkBuffer = await readFile(watermarkPath);
        } catch {
          // اگر فایل واترمارک وجود نداشت، بدون واترمارک ادامه بده
          watermarkBuffer = Buffer.from("");
        }

        if (watermarkBuffer.length > 0) {
          // محاسبه اندازه واترمارک متناسب با تصویر (حدود ۳۰٪ عرض)
          const wmWidth = Math.round((metadata.width || MAX_WIDTH) * 0.3);
          const wmHeight = Math.round(wmWidth * (80 / 280)); // نسبت ابعاد SVG

          // اعمال واترمارک در گوشه پایین-راست با ۱۵ پیکسل فاصله
          pipeline = pipeline.composite([
            {
              input: watermarkBuffer,
              top: Math.max(10, (metadata.height || 500) - wmHeight - 15),
              left: Math.max(10, (metadata.width || MAX_WIDTH) - wmWidth - 15),
              blend: "over",
            },
          ]);
        }
      }

      processedBuffer = await pipeline.toBuffer();
    } catch (sharpErr) {
      // اگر پردازش با خطا مواجه شد (مثلاً فایل SVG)، فایل اصلی ذخیره شود
      console.warn("[UPLOAD] Sharp processing failed, falling back to raw:", sharpErr);
      processedBuffer = buffer;
    }

    const outputPath = path.join(uploadDir, safeName);
    await writeFile(outputPath, processedBuffer);

    const url = `/uploads/${safeName}`;
    const fileSize = processedBuffer.length;
    const [saved] = await db
      .insert(uploadedFiles)
      .values({ filename: file.name, url, mimeType: "image/jpeg", size: fileSize, category, altText })
      .returning();

    return NextResponse.json({ ok: true, file: saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
