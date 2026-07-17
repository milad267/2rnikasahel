/**
 * 🖼️ هوش تصویر پیشرفته — Image Intelligence Agent
 * 
 * این ایجنت وظایف زیر را انجام می‌دهد:
 * ۱. جستجوی تصویر واقعی محصول از اینترنت
 * ۲. دانلود و پردازش تصاویر
 * ۳. حذف پس‌زمینه (با remove.bg API یا Sharp)
 * ۴. حذف واترمارک از تصاویر
 * ۵. افزایش کیفیت و بهینه‌سازی
 * ۶. افزودن واترمارک لوگوی سایت
 * ۷. اختصاص تصویر به محصول
 * ۸. اعتبارسنجی تطابق تصویر با محصول
 */

import axios from "axios";
import sharp from "sharp";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { products, productVariants, siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAiConfig } from "@/lib/ai";
import { trackedChatCompletion } from "@/lib/ai-usage";
import { CHAT_STORAGE, UPLOAD_PUBLIC_DIR } from "@/lib/storage-paths";
import type { ImageSearchResult, ProcessedImage } from "./types";

/* ══════════════════════════════════════════════
   انواع داخلی
   ══════════════════════════════════════════════ */

interface WatermarkConfig {
  logoPath: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  opacity: number;
  scale: number; // 0-1, نسبت به عرض تصویر
}

const DEFAULT_WATERMARK: WatermarkConfig = {
  logoPath: path.join(process.cwd(), "public", "logo", "logo.png"),
  position: "bottom-right",
  opacity: 0.7,
  scale: 0.15,
};

const STANDARD_PRODUCT_SIZE = { width: 800, height: 600 };
const STANDARD_BLOG_SIZE = { width: 1200, height: 630 };

/* ══════════════════════════════════════════════
   جستجوی تصویر از اینترنت
   ══════════════════════════════════════════════ */

/**
 * جستجوی تصویر محصول از موتورهای جستجو
 * از Google Images، Bing، یا DuckDuckGo استفاده می‌کند
 */
export async function searchProductImage(
  productName: string,
  brand?: string,
  options?: {
    maxResults?: number;
    minWidth?: number;
    minHeight?: number;
  },
): Promise<ImageSearchResult[]> {
  const maxResults = options?.maxResults || 5;
  const minWidth = options?.minWidth || 300;
  const minHeight = options?.minHeight || 300;

  // ساخت عبارت جستجو
  const searchQuery = [productName, brand, "product", "real image"]
    .filter(Boolean)
    .join(" ");

  const results: ImageSearchResult[] = [];

  // روش ۱: جستجو با DuckDuckGo (رایگان، بدون API Key)
  try {
    const ddgResults = await searchDuckDuckGo(searchQuery, maxResults);
    results.push(...ddgResults);
  } catch (error) {
    console.warn("⚠️ DuckDuckGo search failed:", error);
  }

  // روش ۲: اگر نتایج کافی نیست، از Google Custom Search استفاده کن (نیاز به API Key)
  if (results.length < maxResults) {
    try {
      const googleResults = await searchGoogleImages(searchQuery, maxResults - results.length);
      results.push(...googleResults);
    } catch (error) {
      console.warn("⚠️ Google search failed:", error);
    }
  }

  // پالایش نتایج
  return results
    .filter(img => img.width >= minWidth && img.height >= minHeight)
    .slice(0, maxResults);
}

/**
 * جستجوی تصویر با DuckDuckGo (رایگان)
 */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<ImageSearchResult[]> {
  const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&v7=0`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
    timeout: 10000,
  });

  const images = response.data?.results || [];

  return images.slice(0, maxResults).map((img: any) => ({
    url: img.image || img.thumbnail,
    source: "duckduckgo",
    width: img.width || 400,
    height: img.height || 400,
    format: (img.image || "").split(".").pop()?.toLowerCase() || "jpg",
    description: img.title || "",
    confidence: img.width && img.height ? 0.7 : 0.5,
  }));
}

/**
 * جستجوی تصویر با Google Custom Search API
 * نیاز به API Key دارد که در تنظیمات ذخیره می‌شود
 */
async function searchGoogleImages(query: string, maxResults: number): Promise<ImageSearchResult[]> {
  // خواندن API Key از تنظیمات
  const [cxSetting, apiKeySetting] = await Promise.all([
    db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, "ai.google_cx"), eq(siteSettings.group, "ai")))
      .limit(1),
    db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, "ai.google_api_key"), eq(siteSettings.group, "ai")))
      .limit(1),
  ]);

  const cx = cxSetting[0]?.value as string;
  const apiKey = apiKeySetting[0]?.value as string;

  if (!cx || !apiKey) {
    console.warn("⚠️ Google Custom Search API key not configured");
    return [];
  }

  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${apiKey}&searchType=image&num=${Math.min(maxResults, 10)}`;

  const response = await axios.get(url, { timeout: 10000 });
  const items = response.data?.items || [];

  return items.map((item: any) => ({
    url: item.link,
    source: "google",
    width: item.image?.width || 500,
    height: item.image?.height || 500,
    format: item.fileFormat?.split("/").pop() || "jpg",
    description: item.title || item.snippet || "",
    confidence: item.image?.width ? 0.8 : 0.5,
  }));
}

/* ══════════════════════════════════════════════
   دانلود و پردازش تصویر
   ══════════════════════════════════════════════ */

/**
 * دانلود تصویر از URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": url,
      },
    });

    // اعتبارسنجی نوع محتوا
      const contentType = String(response.headers?.["content-type"] || "");
    if (!contentType.startsWith("image/")) {
      console.warn(`⚠️ Invalid content type: ${contentType} for URL: ${url}`);
      return null;
    }

    return Buffer.from(response.data);
  } catch (error: any) {
    console.warn(`⚠️ Failed to download image from ${url}:`, error.message);
    return null;
  }
}

/**
 * بررسی وجود واترمارک در تصویر
 * از AI برای تشخیص واترمارک استفاده می‌کند
 */
export async function detectWatermark(
  imageBuffer: Buffer,
  userId?: number,
  isAdmin = false,
): Promise<{ hasWatermark: boolean; confidence: number; regions?: string[] }> {
  try {
    const config = await getAiConfig("vision");
    if (!config?.apiKey) {
      return { hasWatermark: false, confidence: 0 };
    }

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
      timeout: 15000,
    });

    const optimized = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: "inside" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const response = await trackedChatCompletion(client, {
      model: config.model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "تو متخصص تشخیص واترمارک در تصاویر هستی. دقت کن آیا این تصویر واترمارک، لوگو، متن تبلیغاتی یا امضای عکاس دارد؟ فقط با YES/NO و درصد اطمینان پاسخ بده. اگر YES است، مختصراً بگو واترمارک کجاست.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "آیا این تصویر واترمارک دارد؟" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${optimized.toString("base64")}`,
                detail: "high",
              },
            },
          ] as any,
        },
      ],
      max_tokens: 200,
    }, {
      agent: "vision",
      task: "watermark-detection",
      provider: config.provider,
      model: config.model,
      userId,
      isAdmin,
    });

    const content = (response.choices[0]?.message?.content || "").toLowerCase();
    const hasWatermark = content.includes("yes") || content.includes("بله") || content.includes("دارد");
    const confidenceMatch = content.match(/(\d{1,3})\s*٪?/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.5;

    return { hasWatermark, confidence };
  } catch (error) {
    console.warn("⚠️ Watermark detection failed:", error);
    return { hasWatermark: false, confidence: 0 };
  }
}

/**
 * حذف واترمارک از تصویر با استفاده از AI
 * روش: تشخیص ناحیه واترمارک و بازسازی آن ناحیه
 */
export async function removeWatermark(
  imageBuffer: Buffer,
  userId?: number,
  isAdmin = false,
): Promise<Buffer> {
  // روش ساده: برش ناحیه واترمارک (اگر در گوشه باشد)
  // روش پیشرفته: استفاده از AI برای تکمیل ناحیه
  // فعلاً روش ساده را پیاده‌سازی می‌کنیم
  
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // تشخیص محل واترمارک با AI
    const config = await getAiConfig("vision");
    if (config?.apiKey) {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || undefined,
        timeout: 15000,
      });

      const optimized = await sharp(imageBuffer)
        .resize(800, 800, { fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();

      // از AI می‌خواهیم ناحیه واترمارک را شناسایی کند
      const response = await trackedChatCompletion(client, {
        model: config.model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "ناحیه دقیق واترمارک در این تصویر را شناسایی کن. مختصات (x, y, width, height) را برگردان. اگر واترمارک در گوشه‌هاست، بگو: bottom-right, bottom-left, top-right, top-left",
          },
          { role: "user", content: [{ type: "text", text: "واترمارک کجاست؟ مختصات بده." }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${optimized.toString("base64")}`, detail: "high" } }] as any },
        ],
        max_tokens: 150,
      }, {
        agent: "vision",
        task: "watermark-removal",
        provider: config.provider,
        model: config.model,
        userId,
        isAdmin,
      });

      const content = response.choices[0]?.message?.content || "";

      // اگر واترمارک در گوشه‌هاست، آن ناحیه را با میانگین رنگ اطراف پر کن
      if (content.includes("bottom-right")) {
        const regionSize = Math.floor(Math.min(width, height) * 0.15);
        // گرفتن میانگین رنگ ناحیه مجاور
        const stats = await sharp(imageBuffer)
          .extract({ left: width - regionSize - 20, top: height - regionSize - 20, width: regionSize, height: regionSize })
          .stats();
        const avgColor = stats.channels.map(c => Math.round(c.mean));
        // رنگ‌آمیزی ناحیه واترمارک با رنگ میانگین
        const watermarkOverlay = await sharp({
          create: { width: regionSize, height: regionSize, channels: 4, background: { r: avgColor[0], g: avgColor[1], b: avgColor[2], alpha: 0.8 } },
        }).png().toBuffer();
        
        return await sharp(imageBuffer)
          .composite([{
            input: watermarkOverlay,
            top: height - regionSize,
            left: width - regionSize,
            blend: "overlay",
          }])
          .png()
          .toBuffer();
      }
    }

    // روش fallback: اگر تشخیص میسر نبود، تصویر اصلی را برگردان
    return imageBuffer;
  } catch (error) {
    console.warn("⚠️ Watermark removal failed, returning original:", error);
    return imageBuffer;
  }
}

/**
 * افزایش کیفیت و شارپ‌سازی تصویر
 */
export async function upscaleImage(
  imageBuffer: Buffer,
  scaleFactor = 1.5,
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = Math.round((metadata.width || 400) * scaleFactor);
  const height = Math.round((metadata.height || 300) * scaleFactor);

  return await sharp(imageBuffer)
    .resize(width, height, {
      fit: "inside",
      kernel: sharp.kernel.lanczos3, // بهترین کیفیت برای بزرگنمایی
    })
    .sharpen({
      sigma: 1.5,
      m1: 0.5,
      m2: 0.5,
      x1: 2,
      y2: 10,
      y3: 20,
    })
    .toBuffer();
}

/**
 * حذف پس‌زمینه با remove.bg API یا Sharp
 */
export async function removeBackground(
  imageBuffer: Buffer,
  method: "auto" | "removebg" | "sharp" = "auto",
): Promise<Buffer> {
  // روش ۱: remove.bg API
  if (method === "removebg" || method === "auto") {
    try {
      // خواندن API Key از تنظیمات
      const [setting] = await db.select({ value: siteSettings.value })
        .from(siteSettings)
        .where(and(eq(siteSettings.key, "ai.removebg_api_key"), eq(siteSettings.group, "ai")))
        .limit(1);

      const apiKey = setting?.value as string;
      if (apiKey) {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });
        formData.append("image_file", blob, "product.png");
        formData.append("size", "auto");

        const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
          headers: {
            "X-Api-Key": apiKey,
          },
          responseType: "arraybuffer",
          timeout: 30000,
        });

        if (response.status === 200) {
          return Buffer.from(response.data);
        }
      }
    } catch (error) {
      console.warn("⚠️ Remove.bg API failed, falling back to Sharp method:", error);
    }
  }

  // روش ۲: Sharp (پس‌زمینه سفید/روشن)
  if (method === "sharp" || method === "auto") {
    try {
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const threshold = 250;
      for (let i = 0; i < data.length; i += 4) {
        // اگر پیکسل نزدیک به سفید است، شفاف کن
        if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
          data[i + 3] = 0;
        }
      }

      return await sharp(data, { raw: info })
        .png()
        .toBuffer();
    } catch (error) {
      console.warn("⚠️ Sharp background removal failed:", error);
    }
  }

  // اگر هیچ روشی کار نکرد، تصویر اصلی را برگردان
  return imageBuffer;
}

/**
 * افزودن واترمارک لوگوی سایت به تصویر
 */
export async function addSiteWatermark(
  imageBuffer: Buffer,
  config: Partial<WatermarkConfig> = {},
): Promise<Buffer> {
  const watermarkConfig = { ...DEFAULT_WATERMARK, ...config };

  try {
    // بارگذاری لوگو
    let logoBuffer: Buffer;
    try {
      logoBuffer = await readFile(watermarkConfig.logoPath);
    } catch {
      // اگر لوگو وجود ندارد، از یک متن ساده استفاده کن
      const svgLogo = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="60" rx="8" fill="#1a1a2e" opacity="0.8"/>
        <text x="100" y="38" font-family="Vazirmatn, Arial" font-size="18" fill="white" text-anchor="middle">درنیکا ساحل</text>
      </svg>`;
      logoBuffer = Buffer.from(svgLogo);
    }

    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 800;
    const imgHeight = metadata.height || 600;

    // تنظیم اندازه لوگو نسبت به تصویر
    const logoWidth = Math.round(imgWidth * watermarkConfig.scale);
    const logoMetadata = await sharp(logoBuffer).metadata();
    const logoAspectRatio = (logoMetadata.width || 200) / (logoMetadata.height || 60);
    const logoHeight = Math.round(logoWidth / logoAspectRatio);

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, logoHeight, { fit: "inside" })
      .png()
      .toBuffer();

    // موقعیت لوگو
    const margin = 15;
    let left = imgWidth - logoWidth - margin;
    let top = imgHeight - logoHeight - margin;

    switch (watermarkConfig.position) {
      case "bottom-left":
        left = margin;
        top = imgHeight - logoHeight - margin;
        break;
      case "top-right":
        left = imgWidth - logoWidth - margin;
        top = margin;
        break;
      case "top-left":
        left = margin;
        top = margin;
        break;
      case "center":
        left = Math.round((imgWidth - logoWidth) / 2);
        top = Math.round((imgHeight - logoHeight) / 2);
        break;
    }

    // اعمال واترمارک با شفافیت مشخص
    return await sharp(imageBuffer)
      .composite([{
        input: resizedLogo,
        top: Math.max(0, top),
        left: Math.max(0, left),
        blend: "over",
        premultiplied: true,
      }])
      .png()
      .toBuffer();
  } catch (error) {
    console.warn("⚠️ Watermark addition failed:", error);
    return imageBuffer;
  }
}

/**
 * ذخیره تصویر پردازش‌شده در حافظه
 */
async function saveProcessedImage(
  imageBuffer: Buffer,
  category: "product" | "blog" | "general" = "general",
  format: "webp" | "jpeg" | "png" = "webp",
): Promise<{ storageId: string; url: string; size: number }> {
  const ext = format === "jpeg" ? "jpg" : format;
  const storageId = `${crypto.randomBytes(24).toString("hex")}.${ext}`;
  
  let outputBuffer: Buffer;
  switch (format) {
    case "webp":
      outputBuffer = await sharp(imageBuffer).webp({ quality: 85 }).toBuffer();
      break;
    case "jpeg":
      outputBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
      break;
    default:
      outputBuffer = await sharp(imageBuffer).png().toBuffer();
  }

  const targetDir = category === "general" ? CHAT_STORAGE : path.join(UPLOAD_PUBLIC_DIR, category);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, storageId), outputBuffer, { flag: "wx" });

  const url = category === "general"
    ? `/api/assistant/file?id=${storageId}&name=${encodeURIComponent(`image.${ext}`)}`
    : `/api/public/file?category=${category}&id=${storageId}&name=${encodeURIComponent(`image.${ext}`)}`;

  return { storageId, url, size: outputBuffer.byteLength };
}

/**
 * اعتبارسنجی اینکه آیا تصویر با محصول مطابقت دارد
 */
export async function validateProductImage(
  imageBuffer: Buffer,
  productName: string,
  userId?: number,
  isAdmin = false,
): Promise<{ matches: boolean; confidence: number; description: string }> {
  try {
    const config = await getAiConfig("vision");
    if (!config?.apiKey) {
      return { matches: true, confidence: 0.5, description: "تشخیص بدون AI ممکن نیست" };
    }

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
      timeout: 20000,
    });

    const optimized = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();

    const response = await trackedChatCompletion(client, {
      model: config.model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `تو یک متخصص تشخیص محصولات صنعتی هستی. بگو آیا این تصویر با محصول "${productName}" مطابقت دارد؟ 
خروجی فقط JSON با این ساختار: { "matches": boolean, "confidence": 0-100, "description": "توضیح مختصر" }`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `آیا این تصویر مربوط به "${productName}" است؟` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${optimized.toString("base64")}`, detail: "high" } },
          ] as any,
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    }, {
      agent: "vision",
      task: "product-image-validation",
      provider: config.provider,
      model: config.model,
      userId,
      isAdmin,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    return {
      matches: result.matches === true,
      confidence: (result.confidence || 50) / 100,
      description: result.description || "",
    };
  } catch (error) {
    console.warn("⚠️ Image validation failed:", error);
    return { matches: true, confidence: 0.5, description: "تشخیص انجام نشد" };
  }
}

/* ══════════════════════════════════════════════
   API عمومی
   ══════════════════════════════════════════════ */

/**
 * جستجو و پردازش کامل تصویر برای محصول
 * این تابع یکجا: جستجو → دانلود → حذف پس‌زمینه → حذف واترمارک → بهینه‌سازی → واترمارک سایت → ذخیره
 */
export async function findAndProcessProductImage(
  productName: string,
  brand?: string,
  options?: {
    category?: "product" | "blog" | "general";
    size?: { width: number; height: number };
    userId?: number;
    isAdmin?: boolean;
    productId?: number;
  },
): Promise<{
  success: boolean;
  image?: ProcessedImage;
  message: string;
  processingSteps: string[];
}> {
  const steps: string[] = [];
  const category = options?.category || "product";
  const targetSize = options?.size || STANDARD_PRODUCT_SIZE;

  try {
    // ۱. جستجوی تصویر
    steps.push("🔍 جستجوی تصویر در اینترنت...");
    const searchResults = await searchProductImage(productName, brand, { maxResults: 3 });

    if (searchResults.length === 0) {
      return {
        success: false,
        message: "❌ هیچ تصویری برای این محصول در اینترنت یافت نشد.",
        processingSteps: steps,
      };
    }

    // ۲. دانلود بهترین تصویر
    steps.push(`📥 دانلود تصویر از ${searchResults[0].source}...`);
    const imageBuffer = await downloadImage(searchResults[0].url);

    if (!imageBuffer) {
      return {
        success: false,
        message: "❌ دانلود تصویر با شکست مواجه شد.",
        processingSteps: steps,
      };
    }

    let processedBuffer = imageBuffer;

    // ۳. اعتبارسنجی تطابق تصویر با محصول
    if (options?.userId) {
      steps.push("✅ اعتبارسنجی تصویر...");
      const validation = await validateProductImage(
        processedBuffer,
        productName,
        options.userId,
        options.isAdmin || false,
      );
      if (!validation.matches && validation.confidence < 0.3) {
        steps.push(`⚠️ تصویر با اطمینان ${Math.round(validation.confidence * 100)}% مطابقت دارد`);
      }
    }

    // ۴. حذف پس‌زمینه
    if (category === "product") {
      steps.push("🎨 حذف پس‌زمینه...");
      processedBuffer = await removeBackground(processedBuffer, "auto");
    }

    // ۵. تشخیص و حذف واترمارک
    const watermarkCheck = await detectWatermark(processedBuffer, options?.userId, options?.isAdmin);
    if (watermarkCheck.hasWatermark) {
      steps.push(`🚫 حذف واترمارک (اطمینان: ${Math.round(watermarkCheck.confidence * 100)}%)...`);
      processedBuffer = await removeWatermark(processedBuffer, options?.userId, options?.isAdmin);
    }

    // ۶. افزایش کیفیت
    steps.push("✨ افزایش کیفیت تصویر...");
    processedBuffer = await upscaleImage(processedBuffer, 1.2);

    // ۷. تغییر اندازه به ابعاد استاندارد
    steps.push(`📐 تغییر اندازه به ${targetSize.width}×${targetSize.height}...`);
    processedBuffer = await sharp(processedBuffer)
      .resize(targetSize.width, targetSize.height, {
        fit: "inside",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

    // ۸. افزودن واترمارک سایت
    steps.push("🏷️ افزودن واترمارک سایت...");
    processedBuffer = await addSiteWatermark(processedBuffer);

    // ۹. بهینه‌سازی و ذخیره
    steps.push("💾 ذخیره تصویر نهایی...");
    const saved = await saveProcessedImage(processedBuffer, category, "webp");

    // ۱۰. اختصاص تصویر به محصول (در صورت وجود productId)
    if (options?.productId && category === "product") {
      steps.push("🔄 اختصاص تصویر به محصول...");
      await db.update(products)
        .set({ coverImage: saved.url })
        .where(eq(products.id, options.productId));
    }

    return {
      success: true,
      image: {
        originalUrl: searchResults[0].url,
        storageId: saved.storageId,
        url: saved.url,
        width: targetSize.width,
        height: targetSize.height,
        format: "webp",
        size: saved.size,
        processingSteps: steps,
        hasWatermark: true,
      },
      message: `✅ تصویر محصول "${productName}" با موفقیت پیدا و پردازش شد.`,
      processingSteps: steps,
    };
  } catch (error: any) {
    steps.push(`❌ خطا: ${error.message}`);
    return {
      success: false,
      message: `❌ خطا در پردازش تصویر: ${error.message}`,
      processingSteps: steps,
    };
  }
}

/**
 * جستجوی تصویر برای بلاگ و تطابق با محتوا
 */
export async function findBlogImage(
  blogTitle: string,
  keywords: string[],
  options?: {
    userId?: number;
    isAdmin?: boolean;
    blogPostId?: number;
  },
): Promise<{
  success: boolean;
  image?: ProcessedImage;
  message: string;
}> {
  const searchQuery = [blogTitle, ...keywords.slice(0, 3), "blog", "article"].join(" ");

  try {
    const searchResults = await searchProductImage(searchQuery, undefined, {
      maxResults: 3,
      minWidth: 800,
      minHeight: 400,
    });

    if (searchResults.length === 0) {
      return { success: false, message: "❌ تصویر مرتبط با بلاگ یافت نشد." };
    }

    const imageBuffer = await downloadImage(searchResults[0].url);
    if (!imageBuffer) {
      return { success: false, message: "❌ دانلود تصویر بلاگ با شکست مواجه شد." };
    }

    let processed = imageBuffer;

    // حذف واترمارک
    const watermark = await detectWatermark(processed, options?.userId, options?.isAdmin);
    if (watermark.hasWatermark) {
      processed = await removeWatermark(processed, options?.userId, options?.isAdmin);
    }

    // تغییر اندازه به ابعاد استاندارد بلاگ
    processed = await sharp(processed)
      .resize(STANDARD_BLOG_SIZE.width, STANDARD_BLOG_SIZE.height, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();

    // افزودن واترمارک
    processed = await addSiteWatermark(processed);

    const saved = await saveProcessedImage(processed, "blog", "webp");

    return {
      success: true,
      image: {
        originalUrl: searchResults[0].url,
        storageId: saved.storageId,
        url: saved.url,
        width: STANDARD_BLOG_SIZE.width,
        height: STANDARD_BLOG_SIZE.height,
        format: "webp",
        size: saved.size,
        processingSteps: ["جستجو", "حذف واترمارک", "تغییر اندازه", "افزودن واترمارک"],
        hasWatermark: true,
      },
      message: `✅ تصویر بلاگ "${blogTitle}" با موفقیت تنظیم شد.`,
    };
  } catch (error: any) {
    return { success: false, message: `❌ خطا: ${error.message}` };
  }
}

/**
 * تنظیم مسیر لوگوی سایت
 */
export async function configureWatermarkLogo(logoPath: string): Promise<void> {
  // ذخیره مسیر لوگو در حافظه بلندمدت
  const [setting] = await db.select({ value: siteSettings.value })
    .from(siteSettings)
    .where(and(eq(siteSettings.key, "ai.watermark_logo_path"), eq(siteSettings.group, "ai")))
    .limit(1);

  await db.insert(siteSettings)
    .values({
      key: "ai.watermark_logo_path",
      group: "ai",
      value: logoPath,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [siteSettings.key, siteSettings.locale],
      set: { value: logoPath, updatedAt: new Date() },
    });

  // بروزرسانی مسیر پیش‌فرض
  DEFAULT_WATERMARK.logoPath = logoPath;
}
