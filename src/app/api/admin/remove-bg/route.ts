import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { CHAT_STORAGE, UPLOAD_PUBLIC_DIR } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const SAFE_FILENAME = /^[a-f0-9]{48}\.(?:jpe?g|png|webp|gif)$/i;

async function readLocalImage(imageUrl: string) {
  if (imageUrl.startsWith("/api/assistant/file")) {
    const id = new URL(imageUrl, "http://local").searchParams.get("id") || "";
    if (!SAFE_FILENAME.test(id)) throw new Error("تصویر چت نامعتبر است");
    return readFile(path.join(CHAT_STORAGE, id));
  }

  if (imageUrl.startsWith("/api/public/file")) {
    const id = new URL(imageUrl, "http://local").searchParams.get("id") || "";
    if (!/^[a-f0-9]+\.[a-z0-9]{1,10}$/i.test(id)) throw new Error("تصویر نامعتبر است");
    return readFile(path.join(UPLOAD_PUBLIC_DIR, id));
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const imagePath = path.resolve(publicRoot, imageUrl.replace(/^\/+/, ""));
  if (!imagePath.startsWith(publicRoot + path.sep)) throw new Error("مسیر تصویر نامعتبر است");
  return readFile(imagePath);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const imageUrl = String(body?.url || "").trim();
    const method = String(body?.method || "auto");

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "آدرس تصویر الزامی است" }, { status: 400 });
    }

    let resultBuffer: Buffer | null = null;
    let sourceType = "";

    // خواندن API key ریمو بک‌گراند از تنظیمات
    const removeBgApiKey = await getSetting<string>("services.removebg.api_key", "services");

    // ── روش ۱: استفاده از Remove.bg API ──
    if (removeBgApiKey && (method === "auto" || method === "removebg")) {
      try {
        // دریافت تصویر از سرور محلی
        const imageBuffer = await readLocalImage(imageUrl);

        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: "image/png" });
        formData.append("image_file", blob, "image.png");
        formData.append("size", "auto");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: { "X-Api-Key": removeBgApiKey },
          body: formData,
        });

        if (response.ok) {
          resultBuffer = Buffer.from(await response.arrayBuffer());
          sourceType = "removebg";
        } else {
          const errText = await response.text();
          console.warn("[REMOVE-BG] API error:", errText);
        }
      } catch (apiErr) {
        console.warn("[REMOVE-BG] API call failed:", apiErr);
      }
    }

    // ── روش ۲: استفاده از Sharp (پس‌زمینه سفید ساده) ──
    if (!resultBuffer && (method === "auto" || method === "sharp")) {
      try {
        const buffer = await readLocalImage(imageUrl);

        // Validate image with Sharp first
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error("فایل تصویری نامعتبر است");
        }

        // استفاده از آستانه‌گذاری ساده برای حذف پس‌زمینه سفید
        const image = sharp(buffer);
        const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

        const threshold = 240; // آستانه تشخیص سفید
        const pixels = Buffer.alloc(data.length);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // اگر پیکسل نزدیک به سفید است، شفاف کن
          if (r > threshold && g > threshold && b > threshold) {
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = 0; // آلفا = ۰ (شفاف)
          } else {
            pixels[i] = data[i];
            pixels[i + 1] = data[i + 1];
            pixels[i + 2] = data[i + 2];
            pixels[i + 3] = data[i + 3];
          }
        }

        resultBuffer = await sharp(pixels, {
          raw: { width: info.width, height: info.height, channels: 4 },
        }).png().toBuffer();
        sourceType = "sharp";
      } catch (sharpErr) {
        console.warn("[REMOVE-BG] Sharp fallback failed:", sharpErr);
      }
    }

    if (!resultBuffer) {
      return NextResponse.json({
        ok: false,
        error: "حذف پس‌زمینه ممکن نشد. لطفاً API key سرویس Remove.bg را در تنظیمات وارد کنید.",
      }, { status: 400 });
    }

    // ── ذخیره تصویر پردازش شده در APP_DATA_DIR ──
    const storageName = `${crypto.randomBytes(12).toString("hex")}.png`;
    await mkdir(UPLOAD_PUBLIC_DIR, { recursive: true, mode: 0o750 });
    const outputPath = path.join(UPLOAD_PUBLIC_DIR, storageName);
    await writeFile(outputPath, resultBuffer, { mode: 0o644 });

    const url = `/api/public/file?id=${storageName}`;
    const [saved] = await db
      .insert(uploadedFiles)
      .values({
        filename: `nobg-${path.basename(imageUrl)}`,
        url,
        mimeType: "image/png",
        size: resultBuffer.length,
        category: "product",
        altText: "بدون پس‌زمینه",
        visibility: "public",
        ownerUserId: user.id,
        ownerType: "admin",
      })
      .returning();

    return NextResponse.json({
      ok: true,
      file: saved,
      sourceType,
      message: sourceType === "removebg"
        ? "✅ پس‌زمینه با هوش مصنوعی حذف شد"
        : "⚠️ پس‌زمینه سفید حذف شد (روش پایه)",
    });
  } catch (error) {
    console.error("[REMOVE-BG] Internal error:", error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور." }, { status: 500 });
  }
}
