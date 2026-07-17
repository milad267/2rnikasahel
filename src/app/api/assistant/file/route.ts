import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/request-security";
import { analyzeProductList } from "@/lib/product-intelligence";
import { getCurrentUser } from "@/lib/auth";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { extractProductsWithAI } from "@/lib/agents/product-extraction";
import { CHAT_STORAGE } from "@/lib/storage-paths";
import { hasModuleAccess } from "@/lib/admin-permissions-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_USER = 500 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json", "xml"]);

/** پسوندهای مجاز برای کاربران غیرادمین (تصویر جداگانه بررسی می‌شود) */
const USER_EXTENSIONS = new Set<string>([
  ...Array.from(TEXT_EXTENSIONS),
  "pdf",
  "xls",
  "xlsx",
]);

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function safeStorageId(value: string | null) {
  return value && /^[a-f0-9]{48}\.[a-z0-9]{1,10}$/.test(value) ? value : null;
}

export async function GET(req: NextRequest) {
  const id = safeStorageId(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "فایل نامعتبر است." }, { status: 400 });
  try {
    const data = await readFile(path.join(CHAT_STORAGE, id));
    const ext = extension(id);
    const imageTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
    const requestedName = String(req.nextUrl.searchParams.get("name") || "attachment").replace(/[\r\n"\\]/g, "_").slice(0, 180);
    const isImage = Boolean(imageTypes[ext]);
    return new NextResponse(data, {
      headers: {
        "Content-Type": imageTypes[ext] || "application/octet-stream",
        "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(requestedName)}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "فایل پیدا نشد." }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  // تشخیص ادمین؛ سقف حجم ندارد اما تعداد درخواست‌ها برای جلوگیری از سوءاستفاده کنترل می‌شود.
  let user = null;
  try { user = await getCurrentUser(); } catch {}
  const isAdmin = user && (user.role === "superadmin" || user.role === "admin");
  const canExtractProducts = Boolean(isAdmin && user && await hasModuleAccess(user.id, user.role, "ai") && await hasModuleAccess(user.id, user.role, "products"));

  const limited = enforceRateLimit(
    req,
    isAdmin ? `admin-assistant-file:${user?.id}` : "assistant-file",
    isAdmin ? 30 : 10,
    10 * 60_000,
  );
  if (limited) return limited;

  try {
    const form = await req.formData();
    const purpose = String(form.get("purpose") || "chat").slice(0, 30);
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده است." }, { status: 400 });
    }
    if (!isAdmin && file.size > MAX_FILE_SIZE_USER) {
      return NextResponse.json({
        ok: false,
        error: "حجم فایل برای کاربران نباید بیشتر از ۵۰ مگابایت باشد.",
      }, { status: 400 });
    }

    const ext = extension(file.name);
    if (!isAdmin && !USER_EXTENSIONS.has(ext)) {
      return NextResponse.json({ ok: false, error: "کاربران می‌توانند فایل متنی، PDF، Excel یا تصویر آپلود کنند." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : "bin";
    const storageId = `${crypto.randomBytes(24).toString("hex")}.${safeExt}`;
    await mkdir(CHAT_STORAGE, { recursive: true });
    await writeFile(path.join(CHAT_STORAGE, storageId), buffer, { flag: "wx" });
    const fileUrl = `/api/assistant/file?id=${storageId}&name=${encodeURIComponent(file.name)}`;
    let text = "";
    let needsOcrFallback = false;
    let fileType = "text";

    if (TEXT_EXTENSIONS.has(ext)) {
      text = buffer.toString("utf8");
      fileType = "text";
    } else if (["xls", "xlsx"].includes(ext)) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      text = workbook.SheetNames.map((name) => {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
        return `برگه ${name}:\n${csv}`;
      }).join("\n\n");
      fileType = "excel";
    } else if (ext === "pdf") {
      // تلاش برای خواندن PDF با pdf-parse
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buffer });
        try {
          text = (await parser.getText()).text;
          await parser.destroy();
        } catch {
          await parser.destroy().catch(() => {});
          needsOcrFallback = true;
        }
      } catch {
        needsOcrFallback = true;
      }

      // اگر PDF متنی نبود (تصویری/اسکن‌شده)، fallback به OCR
      if (needsOcrFallback || (text.replace(/\s/g, "").length < 50)) {
        fileType = "pdf-image";
        try {
          // استفاده از sharp برای تبدیل صفحه اول PDF به تصویر (اگر PDF تصویری باشه)
          // و بعد OCR با tesseract
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("fas+eng");
          try {
            // تلاش مستقیم OCR روی بافر PDF (tesseract میتونه بعضی وقتا مستقیم بخونه)
            const ocrResult = await worker.recognize(buffer);
            const ocrText = ocrResult.data.text.replace(/\u0000/g, "").trim();
            if (ocrText.length > 20) {
              text = ocrText;
            } else if (needsOcrFallback) {
              text = "[PDF تصویری - متن کمی استخراج شد. لطفاً صفحات PDF را به صورت عکس آپلود کنید یا از فایل Excel استفاده کنید.]\n" + ocrText;
            }
          } finally {
            await worker.terminate();
          }
        } catch (ocrError) {
          console.error("[ASSISTANT_FILE] OCR fallback failed:", ocrError);
          if (needsOcrFallback) {
            text = "[این PDF احتمالاً تصویری (اسکن‌شده) است و متن قابل استخراج نیست. لطفاً:\n۱. فایل را به صورت Excel یا CSV ذخیره کنید\n۲. یا از هر صفحه PDF اسکرین‌شات بگیرید و تصاویر را آپلود کنید]";
          }
        }
      } else {
        fileType = "pdf";
      }
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      // تصویر اصلی ذخیره می‌شود و در مرحله بعد واقعاً به مدل بینایی داده خواهد شد.
      fileType = "image";
      text = `[تصویر پیوست‌شده: ${file.name}]\nاندازه: ${Math.round(file.size / 1024)} KB\nنوع: ${ext.toUpperCase()}`;
    } else {
      fileType = "binary";
      text = `[فایل پیوست‌شده: ${file.name}]\nاندازه: ${Math.round(file.size / 1024)} KB\nنوع: ${file.type || ext.toUpperCase() || "نامشخص"}\nاین نوع فایل برای دانلود و مشاهده پیوست شده است؛ استخراج محتوای خودکار برای آن تضمین نمی‌شود.`;
    }

    text = text.replace(/\u0000/g, "").trim().slice(0, 20_000);
    if (!text) {
      return NextResponse.json({ ok: false, error: "متنی از فایل استخراج نشد. اگر PDF اسکن‌شده است، لطفاً تصاویر صفحات را جداگانه آپلود کنید." }, { status: 422 });
    }

    // تحلیل هوشمند: استخراج خودکار محصولات از متن
    let products: any[] = [];
    let extractionWarning = "";
    if (canExtractProducts && purpose !== "image-edit" && (fileType === "image" || text.length > 20)) {
      try {
        let imageEvidenceText = "";
        if (fileType === "image") {
          try {
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker("fas+eng");
            try {
              const ocr = await worker.recognize(buffer);
              imageEvidenceText = ocr.data.text.replace(/\u0000/g, "").trim().slice(0, 12_000);
            } finally {
              await worker.terminate();
            }
          } catch (ocrError) {
            console.warn("[ASSISTANT_FILE] image OCR evidence failed:", ocrError);
          }
        }
        const extractedByAi = await extractProductsWithAI({
          text: fileType === "image" ? imageEvidenceText : text,
          image: fileType === "image" ? buffer : undefined,
          userId: user?.id,
          isAdmin: true,
          isImage: fileType === "image",
        });
        products = extractedByAi.products;
        extractionWarning = extractedByAi.warning || "";
      } catch (error) {
        console.error("[ASSISTANT_FILE] structured extraction failed:", error);
        extractionWarning = "استخراج هوشمند ساختاریافته انجام نشد؛ نتیجه محلی نمایش داده می‌شود.";
      }
    }
    try {
      const extracted = products.length ? [] : analyzeProductList(text);
      if (extracted.length > 0) {
        products = extracted.map(p => ({
          title: p.title,
          brand: p.brand || undefined,
          sku: p.sku || (p.variants[0]?.sku),
          price: p.price || (p.variants[0]?.price),
          variants: p.variants.map(v => ({
            name: v.name,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            specs: v.specs,
          })),
        }));
      }
    } catch { /* product extraction is best-effort */ }

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      fileType,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      storageId,
      url: fileUrl,
      text,
      products: products.length > 0 ? products : undefined,
      productsCount: products.length,
      extractionWarning: extractionWarning || undefined,
      needsOcrFallback: needsOcrFallback || undefined,
    });
  } catch (error) {
    console.error("[ASSISTANT_FILE]", error);
    return NextResponse.json({ ok: false, error: "خواندن فایل با خطا مواجه شد." }, { status: 500 });
  }
}
