import OpenAI from "openai";
import sharp from "sharp";
import { getAiConfig } from "@/lib/ai";
import { trackedChatCompletion } from "@/lib/ai-usage";

export type ExtractedVariant = {
  name: string;
  sku: string;
  price: string;
  stock: string;
  specs: Record<string, string>;
};

export type ExtractedProduct = {
  title: string;
  brand: string;
  category: string;
  description: string;
  sku: string;
  price: string;
  stock: string;
  variants: ExtractedVariant[];
  confidence: number;
  warnings: string[];
};

function latinDigits(value: unknown) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function amount(value: unknown) {
  return latinDigits(value).replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "").slice(0, 20);
}

function clean(value: unknown, max = 250) {
  return String(value ?? "").replace(/[\u0000\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || content;
  const array = source.match(/\[[\s\S]*\]/)?.[0];
  const object = source.match(/\{[\s\S]*\}/)?.[0];
  return JSON.parse(array || object || "[]");
}

function normalizeProducts(raw: unknown, sourceText = "", isImage = false): ExtractedProduct[] {
  const strict = !isImage && sourceText.length > 0; // سخت‌گیری فقط برای ورودی متنی
  const normalizedSource = latinDigits(sourceText).replace(/,/g, "");
  const sourceLines = latinDigits(sourceText).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const sourceAmounts = Array.from(normalizedSource.matchAll(/([0-9][0-9,]{2,})\s*(تومان|ریال|﷼)/gi)).map(match => {
    const rawAmount = Number(match[1].replace(/,/g, "")) || 0;
    return String(match[2] === "تومان" ? rawAmount * 10 : rawAmount);
  });
  const evidencedAmount = (raw: unknown, warnings: string[]) => {
    const value = amount(raw);
    if (!value) return "";
    if (!sourceAmounts.length) return value; // بدون منبع برای تطبیق (مثلاً تصویر بدون OCR)
    if (sourceAmounts.includes(value)) return value;
    const numeric = Number(value);
    // تشخیص: مدل قیمت را ۱۰ برابر (تومان→ریال اشتباه) برگردانده
    if (numeric % 10 === 0 && sourceAmounts.includes(String(numeric / 10))) {
      warnings.push(`قیمت ${value} با متن اصلی تطبیق داده و به ${numeric / 10} ریال اصلاح شد.`);
      return String(numeric / 10);
    }
    // تشخیص: مدل قیمت تومانی را بدون ضرب در ۱۰ برگردانده
    if (sourceAmounts.includes(String(numeric * 10))) {
      warnings.push(`قیمت تومانی ${value} به ${numeric * 10} ریال تبدیل شد.`);
      return String(numeric * 10);
    }
    // قیمت در منبع نیست
    if (strict) {
      warnings.push(`قیمت ${value} در متن اصلی پیدا نشد و قابل اعتماد نیست - باید دستی بررسی شود.`);
      return ""; // برای ورودی متنی قیمت حدسی را نگه نمی‌داریم
    }
    warnings.push(`قیمت ${value} در متن اصلی پیدا نشد و باید دستی بررسی شود.`);
    return value;
  };
  const evidencedSku = (sku: string, warnings: string[]) => {
    if (!sku) return "";
    if (!normalizedSource) return sku; // بدون منبع برای تطبیق
    if (normalizedSource.includes(sku)) return sku;
    if (strict) {
      warnings.push(`کد ${sku} در متن اصلی پیدا نشد و باید دستی بررسی شود.`);
      return ""; // برای ورودی متنی کد حدسی را نگه نمی‌داریم
    }
    return sku;
  };
  const titleFromEvidence = (sku: string, current: string, warnings: string[]) => {
    if (!sku || (current && current.toLowerCase() !== sku.toLowerCase())) {
      // عنوان فعلی SKU نیست - بررسی کن که در متن منبع وجود دارد
      if (strict && normalizedSource && current.length > 2) {
        const titleWords = current.split(/\s+/).filter(w => w.length > 2);
        const titleInSource = titleWords.length > 0 && titleWords.some(w => normalizedSource.includes(w));
        if (!titleInSource) {
          warnings.push(`نام محصول "${current}" در متن اصلی تأیید نشد.`);
        }
      }
      return current;
    }
    // عنوان برابر با SKU است - سعی کن نام واقعی را از خط منبع بازیابی کنی
    const lineIndex = sourceLines.findIndex(line => line.toLowerCase().includes(sku.toLowerCase()) && !/^[-–•*›>▸]/.test(line));
    if (lineIndex < 0) return current;
    return clean(sourceLines[lineIndex].replace(/\s+(?:قیمت|price)\s*[:：]?\s*[\s\S]*$/i, ""), 200) || current;
  };
  const variantNameFromEvidence = (sku: string, current: string) => {
    if (!sku || (current && current.toLowerCase() !== sku.toLowerCase())) return current;
    const line = sourceLines.find(item => item.toLowerCase().includes(sku.toLowerCase()));
    if (!line) return current;
    return clean(line.replace(/^[-–•*›>▸]\s*/, "").replace(new RegExp(`(?:کد|sku)\\s*[:：]?\\s*${sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "").replace(/\s+(?:قیمت|price)\s*[:：]?\s*[\s\S]*$/i, ""), 160) || current;
  };
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.products) ? (raw as any).products : [];
  return list.slice(0, 250).flatMap((entry: any) => {
    const title = clean(entry?.title || entry?.name, 200);
    if (!title) return [];
    const rawWarnings: unknown[] = Array.isArray(entry?.warnings) ? entry.warnings as unknown[] : [];
    const warnings: string[] = rawWarnings.map((item: unknown) => clean(item, 300)).filter((s): s is string => s.length > 0).slice(0, 10);
    const sku = evidencedSku(clean(entry?.sku || entry?.code, 100), warnings);
    const variants = (Array.isArray(entry?.variants) ? entry.variants : []).slice(0, 100).flatMap((variant: any, index: number) => {
      const vSku = evidencedSku(clean(variant?.sku || variant?.code, 100), warnings);
      const name = variantNameFromEvidence(vSku, clean(variant?.name || variant?.title || `تنوع ${index + 1}`, 160));
      const price = evidencedAmount(variant?.price, warnings);
      const stock = amount(variant?.stock || variant?.quantity) || "0";
      const specs = variant?.specs && typeof variant.specs === "object"
        ? Object.fromEntries(Object.entries(variant.specs).slice(0, 30).map(([key, value]) => [clean(key, 80), clean(value, 180)]).filter(([key]) => key))
        : {};
      if (!vSku && !price && !name) return [];
      return [{ name, sku: vSku, price, stock, specs }];
    });
    const product: ExtractedProduct = {
      title: titleFromEvidence(sku, title, warnings),
      brand: clean(entry?.brand, 100),
      category: clean(entry?.category, 120),
      description: clean(entry?.description, 2000),
      sku,
      price: evidencedAmount(entry?.price, warnings),
      stock: amount(entry?.stock || entry?.quantity) || "0",
      variants,
      confidence: Math.max(0, Math.min(1, Number(entry?.confidence) || 0)),
      warnings: [...new Set(warnings)], // حذف warningهای تکراری
    };
    if (!product.price && product.variants.every(item => !item.price)) product.warnings.push("قیمت خوانا نیست و باید بررسی شود.");
    if (!product.sku && product.variants.every(item => !item.sku)) product.warnings.push("کد هیچکدام از تنوع‌ها خوانا نیست و باید بررسی شود.");
    return [product];
  });
}

const EXTRACTION_PROMPT = `اطلاعات محصولات صنعتی را فقط از محتوای داده‌شده استخراج کن و چیزی را حدس نزن.
خروجی فقط JSON با کلید products باشد. برای هر محصول دقیقاً این فیلدها را بده:
title, brand, category, description, sku, price, stock, confidence, warnings, variants.
هر تنوع: name, sku, price, stock, specs.
قیمت خروجی فقط عدد و بر حسب ریال باشد؛ اگر منبع صریحاً تومان است در ۱۰ ضرب کن.
title باید نام کامل و توصیفی محصول باشد و هرگز نباید فقط برابر کد/SKU باشد. کد/SKU را عیناً با حروف بزرگ و کوچک و خط تیره حفظ کن. عدد ناخوانا را رشته خالی بگذار و در warnings بنویس.

**تشخیص هوشمند محصولات با تنوع:**
- اگر چند ردیف مشخصات مشابه دارند ولی در یک ویژگی (سایز، رنگ، توان، فشار، قطر، مدل، SDR، ضخامت) متفاوت هستند، آن‌ها را به‌عنوان تنوع‌های یک محصول مادر گروه‌بندی کن.
- مثال: "لوله پلی اتیلن ۱ اینچ SDR11" و "لوله پلی اتیلن ۲ اینچ SDR11" → یک محصول "لوله پلی اتیلن" با دو تنوع سایز
- مثال: "پمپ آب ۰.۵ اسب" و "پمپ آب ۱ اسب" → یک محصول "پمپ آب" با دو تنوع توان
- مثال: "شیر فلکه برنجی ۱/۲" و "شیر فلکه برنجی ۳/۴" → یک محصول "شیر فلکه برنجی" با دو تنوع سایز
- اگر نام محصول شامل اعداد اندازه (مثل ۱/۲، ۳/۴، ۱، ۲ اینچ) است و بقیه نام یکسان است، محصول مادر را بدون عدد بساز و اعداد را در name تنوع بگذار.
- اگر محصول فقط یک ردیف دارد و تنوع ندارد، title کامل با مشخصات باشد و variants خالی بگذار.
- حتماً بررسی کن که تنوع‌ها واقعاً به یک محصول مادر تعلق دارند یا محصولات جداگانه‌ای هستند.

قیمت کل فاکتور، شماره تلفن، تاریخ و تعداد را با قیمت یا کد محصول اشتباه نگیر.`;

/** تقسیم متن بزرگ به تکه‌های کوچک برای پردازش دسته‌ای */
function splitTextIntoChunks(text: string, chunkSize = 15000): string[] {
  if (text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let current = 0;
  
  while (current < text.length) {
    let end = Math.min(current + chunkSize, text.length);
    // سعی کن تکه را در یک خط خاتمه بدی تا محصولات نصفه نشن
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > current) end = lastNewline;
    }
    chunks.push(text.slice(current, end));
    current = end;
  }
  return chunks;
}

export async function extractProductsWithAI(input: {
  text?: string;
  image?: Buffer;
  userId?: number;
  isAdmin: boolean;
  isImage?: boolean;
}) {
  const role = input.image ? "vision" : "data";
  const config = await getAiConfig(role);
  if (!config?.apiKey) return { products: [] as ExtractedProduct[], warning: `کلید ایجنت ${role} تنظیم نشده است.` };

  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl || undefined, timeout: 90_000, maxRetries: 2 });
  
  // پردازش تصویر (تک تصویر، تقسیم نمی‌شود)
  if (input.image) {
    const optimized = await sharp(input.image, { animated: false }).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    const content: any[] = [{ type: "text", text: EXTRACTION_PROMPT }];
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${optimized.toString("base64")}`, detail: "high" } });

    try {
      const response: any = await trackedChatCompletion(client, {
        model: config.model,
        messages: [{ role: "system", content: "تو استخراج‌گر دقیق و محافظه‌کار کاتالوگ و فاکتور محصولات صنعتی هستی." }, { role: "user", content }],
        temperature: 0,
        max_tokens: 5000,
      }, { agent: role, task: "product-extraction", provider: config.provider, model: config.model, userId: input.userId, isAdmin: input.isAdmin });

      const products = normalizeProducts(parseJson(response.choices[0]?.message?.content || ""), input.text || "", input.isImage || false);
      return { products, warning: products.length ? undefined : "محصول قابل‌اعتمادی در تصویر تشخیص داده نشد." };
    } catch (e: any) {
      return { products: [] as ExtractedProduct[], warning: `خطا در پردازش تصویر: ${e.message}` };
    }
  }

  // پردازش متن — برای متن‌های بزرگ، پردازش دسته‌ای
  const fullText = input.text || "";
  if (fullText.length < 3) return { products: [], warning: "متن فایل بسیار کوتاه است." };
  
  const chunks = splitTextIntoChunks(fullText, 15000);
  const allProducts: ExtractedProduct[] = [];
  const allWarnings: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkPrompt = `${EXTRACTION_PROMPT}\n\nاین تکه ${i + 1} از ${chunks.length} کاتالوگ است. فقط محصولات موجود در همین تکه را استخراج کن:\n${chunk}`;
    
    let attempt = 0;
    let success = false;
    while (attempt < 2 && !success) { // ۱ بار تلاش مجدد در صورت خطا
      try {
        const response: any = await trackedChatCompletion(client, {
          model: config.model,
          messages: [
            { role: "system", content: "تو استخراج‌گر دقیق و محافظه‌کار کاتالوگ و فاکتور محصولات صنعتی هستی. فقط از اطلاعات همین تکه استفاده کن." },
            { role: "user", content: chunkPrompt }
          ],
          temperature: 0,
          max_tokens: 4000,
        }, { agent: role, task: `chunk-${i+1}-extraction-attempt-${attempt+1}`, provider: config.provider, model: config.model, userId: input.userId, isAdmin: input.isAdmin });

        const chunkProducts = normalizeProducts(parseJson(response.choices[0]?.message?.content || ""), chunk, false);
        allProducts.push(...chunkProducts);
        if (chunkProducts.length === 0) allWarnings.push(`تکه ${i+1}: محصولی تشخیص داده نشد`);
        success = true;
      } catch (e: any) {
        attempt++;
        if (attempt >= 2) {
          allWarnings.push(`تکه ${i+1}: خطا در پردازش پس از ${attempt} تلاش - ${e.message}`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000)); // مکث ۵ ثانیه‌ای قبل از تلاش مجدد
        }
      }
    }
    if (!success) continue; // رفتن به تکه بعدی در صورت شکست نهایی

    // مکث بین تکه‌ها برای جلوگیری از محدودیت نرخ API
    if (i < chunks.length - 1) await new Promise(resolve => setTimeout(resolve, 3000)); // افزایش مکث به ۳ ثانیه
  }

  // حذف محصولات تکراری فقط بر اساس SKU (چون SKU باید یکتا باشد)
  const uniqueProducts = allProducts.filter((product, index, self) => {
    // اگر محصول SKU ندارد، نمی‌توان آن را با بقیه مقایسه کرد، پس نگه داشته می‌شود تا دستی بررسی شود
    if (!product.sku) {
      return true;
    }
    // اولین محصولی که این SKU را دارد پیدا کن (بدون حساسیت به حروف بزرگ و کوچک)
    return index === self.findIndex(p => p.sku && p.sku.toLowerCase() === product.sku.toLowerCase());
  });

  const finalWarning = allWarnings.length > 0 
    ? `${allWarnings.length} هشدار در پردازش: ${allWarnings.join(" | ").slice(0, 500)}${allWarnings.join(" | ").length > 500 ? "..." : ""}`
    : undefined;

  return { 
    products: uniqueProducts, 
    warning: uniqueProducts.length ? finalWarning : "محصول قابل‌اعتمادی در کل فایل تشخیص داده نشد.",
    chunkCount: chunks.length
  };
}