"use client";

import { useState, useRef } from "react";
import { Sparkles, Upload, Loader2, Check, Save, ScanLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** هشدارهای بحرانی که باعث عدم انتخاب خودکار می‌شوند */
const CRITICAL_WARNING_PATTERNS = [
  "باید بررسی شود",
  "پیدا نشد",
  "خوانا نیست",
  "نامعتبر",
  "نامشخص",
];

/** بررسی می‌کند که آیا محصول برای ساخت امن است (قابل انتخاب خودکار) */
function isSafeToCreate(item: ImportResult): boolean {
  if (!item.title || item.title.length < 2) return false;

  // بررسی هشدارهای بحرانی
  const warnings = item.warnings || [];
  const hasCriticalWarning = warnings.some(w =>
    CRITICAL_WARNING_PATTERNS.some(pattern => w.includes(pattern))
  );
  // هشدار تصحیح قیمت (تطبیق با متن) بحرانی نیست
  const isOnlyCorrectionWarning = warnings.length > 0 &&
    warnings.every(w => w.includes("تطبیق") || w.includes("اصلاح") || w.includes("تبدیل"));
  
  if (hasCriticalWarning && !isOnlyCorrectionWarning) return false;

  if (item.variants && item.variants.length > 0) {
    // محصول با تنوع: همه تنوع‌ها باید SKU غیرخالی و price مثبت داشته باشند
    return item.variants.every(
      v => v.sku && v.sku.trim().length > 0 && Number(v.price) > 0
    );
  }

  // محصول بدون تنوع: باید SKU و price مثبت داشته باشد
  return Boolean(item.sku && item.sku.trim().length > 0 && Number(item.price) > 0);
}

interface ImportVariant {
  name: string; sku: string; price: string; stock: string; specs?: Record<string, string>;
}

interface ImportResult {
  title: string; slug: string; category: string; price: string; stock: string;
  description: string; variants: ImportVariant[];
  sku?: string; brand?: string; confidence?: number; warnings?: string[];
  image: string | null; imageFound: boolean;
  status: "pending" | "preview" | "approved" | "error";
  error?: string;
}

export function AiProductImport() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [saving, setSaving] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    if (!input.trim()) { toast.error("محصولی وارد کنید یا فایل آپلود کنید"); return; }
    setLoading(true);
    setStep("input");
    let parsed: any[] | null = null;

    try {
      const res = await fetch("/api/admin/assistant/extract-products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.products)) parsed = data.products;
      if (data.warning) toast.warning(data.warning);
    } catch {}

    // اگر AI نتیجه نداد، از parser محلی استفاده کن
    if (!parsed || parsed.length === 0) {
      parsed = parseProductsLocally(input);
    }

    if (parsed && parsed.length > 0) {
      const mapped = parsed.map((p: any) => ({ ...p, status: "preview" as const }));
      setResults(mapped);
      // فقط موارد safe به‌طور پیش‌فرض انتخاب شوند
      setSelectedIndices(
        mapped
          .map((item: ImportResult, idx: number) => isSafeToCreate(item) ? idx : -1)
          .filter((idx: number) => idx >= 0)
      );
      setStep("preview");
      const safeCount = mapped.filter(item => isSafeToCreate(item)).length;
      toast.success(`✅ ${safeCount} محصول قابل‌اعتماد از ${parsed.length} مورد شناسایی شد`);
    } else {
      toast.error("محصولی تشخیص داده نشد. متن را واضح تر وارد کنید.");
    }
    setLoading(false);
  }

  /** Parser محلی پیشرفته - بدون نیاز به API Key */
  function parseProductsLocally(text: string): any[] {
    // نرمال‌سازی متن: حروف عربی به فارسی، اعداد عربی به انگلیسی
    let normalized = text
      .replace(/ي/g, "ی").replace(/ك/g, "ک")
      .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

    const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
    const products: any[] = [];
    let current: any = null;

    // تشخیص نوع فایل: CSV یا متن ساده
    const hasSemicolons = lines.filter(l => l.includes(";")).length > 1;
    const hasTabs = lines.filter(l => l.includes("\t")).length > 2;
    const hasPipes = lines.filter(l => l.includes("|")).length > 2;
    const hasCommas = lines.filter(l => {
      const cols = l.split(",");
      return cols.length >= 3 && cols.some(c => /[\d]{4,}/.test(c));
    }).length > 1;

    if (hasSemicolons || hasTabs || hasPipes) {
      const sep = hasSemicolons ? ";" : hasTabs ? "\t" : "|";
      return parseTabularData(lines, sep);
    }
    if (hasCommas) {
      return parseTabularData(lines, ",");
    }

    // تشخیص ستون‌های با عرض ثابت (خروجی PDF با فاصله‌های متعدد)
    const fixedWidthLines = lines.filter(l => (l.match(/\s{3,}/g) || []).length >= 2 && l.match(/[\d,]{4,}/));
    if (fixedWidthLines.length >= 3 && fixedWidthLines.length > lines.length * 0.3) {
      return parseFixedWidthColumns(lines);
    }

    // متن ساده - خط به خط
    for (const line of lines) {
      // الگوهای مختلف قیمت (پشتیبانی از ۱۲۳,۴۵۶,۷۸۹ یا 123456789)
      const priceMatch = line.match(/([\d,]+)\s*(?:تومان|ریال|قیمت|price|ریال|تومان|﷼)/i)
        || line.match(/قیمت[:\s]*([\d,]+)/i)
        || line.match(/([\d,]{4,})(?:\s*(?:تومان|ریال|﷼))?/);
      const stockMatch = line.match(/(?:موجودی|stock|تعداد|quantity|count|انبار)[:\s]*(\d+)/i);
      const skuMatch = line.match(/(?:sku|کد|شماره|کالا|SKU|کد کالا)[:\s]*["']?([A-Za-z0-9_-]{3,})["']?/i)
        || line.match(/^(\d{6,12})\s+/); // SKU در ابتدای خط
      const categoryMatch = line.match(/(?:دسته|category|گروه|group)[:\s]*["']?([^"',;]{2,})["']?/i);
      const hasPrice = /[\d,]{4,}\s*(?:تومان|ریال|﷼)/.test(line) || /قیمت[:\s]*[\d,]{4,}/.test(line);

      // تشخیص تنوع (خط با - یا • یا * یا > شروع میشه)
      const variantMatch = line.match(/^[\s]*[-–•*››>▸]\s*(.+)/);
      if (variantMatch && current && (hasPrice || current.price !== "0")) {
        const vText = variantMatch[1];
        const vPrice = vText.match(/([\d,]+)\s*(?:تومان|ریال|﷼)?/);
        const vSku = vText.match(/\b((?:[A-Za-z]{1,6}[-_]?\d{2,6}[-_]?[A-Za-z0-9]{0,6})|(?:\d{6,12}))\b/);
        const vName = vText
          .replace(/([\d,]+)\s*(?:تومان|ریال|﷼)?.*$/, "")
          .replace(/^["']|["']$/g, "")
          .trim() || `تنوع ${current.variants.length + 1}`;

        current.variants.push({
          name: vName,
          sku: vSku ? vSku[1] : `VAR-${products.length + 1}-${current.variants.length + 1}`,
          price: vPrice ? vPrice[1].replace(/,/g, "") : current.price,
          stock: "0",
        });
        continue;
      }

      // تشخیص محصول با الگوی: SKU - نام - قیمت (مانند "855121180 - پمپ سانتریفیوژ - 18,500,000")
      const skuNamePrice = line.match(/^(\d{6,12})\s*[-–]\s*(.+?)\s*[-–]\s*([\d,]+)\s*(?:تومان|ریال|﷼)?/);
      if (skuNamePrice) {
        if (current) products.push(current);
        current = {
          title: skuNamePrice[2].trim(),
          slug: skuNamePrice[1].toLowerCase(),
          category: categoryMatch ? categoryMatch[1].trim() : "",
          price: skuNamePrice[3].replace(/,/g, ""),
          stock: stockMatch ? stockMatch[1] : "0",
          description: "",
          variants: [],
          image: null,
          imageFound: false,
        };
        continue;
      }

      // تشخیص محصول با الگوی: نام | قیمت | موجودی | SKU (pipe-separated)
      const pipeParts = line.split("|").map(p => p.trim());
      if (pipeParts.length >= 2) {
        const pName = pipeParts[0];
        const pPrice = pipeParts.find(p => /[\d,]{4,}/.test(p))?.replace(/,/g, "") || "";
        const pStock = pipeParts.find(p => /^\d+$/.test(p)) || "0";
        const pSku = pipeParts.find(p => /^[A-Za-z0-9-]{3,}$/.test(p)) || "";
        if (pName && pName.length > 2 && pPrice) {
          if (current) products.push(current);
          current = {
            title: pName,
            slug: pSku.toLowerCase() || pName.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 50),
            category: categoryMatch ? categoryMatch[1].trim() : "",
            price: pPrice,
            stock: pStock || "0",
            description: "",
            variants: [],
            image: null,
            imageFound: false,
          };
          continue;
        }
      }

      // تشخیص محصول با الگوی: نام: قیمت (colon-separated)
      const colonParts = line.match(/^(.+?)[:\s]+([\d,]+)\s*(?:تومان|ریال|﷼)?$/);
      if (colonParts && colonParts[1].length > 2 && colonParts[1].length < 60) {
        if (current) products.push(current);
        current = {
          title: colonParts[1].trim(),
          slug: "",
          category: categoryMatch ? categoryMatch[1].trim() : "",
          price: colonParts[2].replace(/,/g, ""),
          stock: stockMatch ? stockMatch[1] : "0",
          description: "",
          variants: [],
          image: null,
          imageFound: false,
        };
        if (skuMatch) current.slug = skuMatch[1].toLowerCase();
        current.slug = current.slug || current.title.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 50) || "product-" + (products.length + 1);
        continue;
      }

      // تشخیص خط جدید محصول
      const isNewProduct = (
        (line.match(/^[A-Za-z0-9\u0600-\u06FF].{2,}/) && hasPrice) ||
        (line.match(/^[A-Za-z0-9\u0600-\u06FF]{4,}/) && !line.match(/^(سفارش|تاریخ|آدرس|شماره|موبایل|ایمیل|تلفن|وب|http|@|قیمت|مجموع|جمع|کد)/i))
      );

      if (isNewProduct || (!current && line.length > 3)) {
        if (current) products.push(current);
        const title = line.replace(/^(?:محصول|product|item|نام|title|نام محصول)[:\s]*"?/i, "").replace(/"?$/, "").trim();
        current = {
          title: title || `محصول ${products.length + 1}`,
          slug: "",
          category: categoryMatch ? categoryMatch[1].trim() : "",
          price: priceMatch ? priceMatch[1].replace(/,/g, "") : "0",
          stock: stockMatch ? stockMatch[1] : "0",
          description: "",
          variants: [],
          image: null,
          imageFound: false,
        };
        if (skuMatch) current.slug = skuMatch[1].toLowerCase();
        current.slug = current.slug || current.title.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 50) || "product-" + (products.length + 1);
        if (categoryMatch) current.category = categoryMatch[1].trim();
        continue;
      }

      // اطلاعات اضافی
      if (current) {
        if (priceMatch && current.price === "0") current.price = priceMatch[1].replace(/,/g, "");
        if (stockMatch && current.stock === "0") current.stock = stockMatch[1];
        if (current.description.length < 100 && line.length > 10) {
          current.description += (current.description ? " - " : "") + line.replace(/^[-–•*]\s*/, "");
        }
      }
    }
    if (current) products.push(current);
    return products;
  }

  /** پارس کردن ستون‌های با عرض ثابت (خروجی PDF با فاصله‌های متعدد) */
  function parseFixedWidthColumns(lines: string[]): any[] {
    const products: any[] = [];
    let lastSku = "";

    for (const line of lines) {
      // حذف خطوط تکراری و هدر
      if (line.length < 5 || /^\d+$/.test(line) || /^(صفحه|ردیف|کد|نام|قیمت|شرح|تاریخ)/i.test(line)) continue;

      // استخراج SKU (9-12 رقم پشت سر هم) - الگوی اصلی فاکتورهای فارسی
      const skuMatch = line.match(/\b(\d{8,12})\b/);
      // استخراج قیمت (ارقام با کاما)
      const prices = line.match(/([\d,]{5,})/g);
      const price = prices ? prices[prices.length - 1].replace(/,/g, "") : "";

      // اگر SKU داریم، محصول جدید
      if (skuMatch) {
        const sku = skuMatch[1];
        lastSku = sku;
        
        // استخراج نام محصول - متن قبل از SKU و بعد از آخرین قیمت
        const beforeSku = line.substring(0, line.indexOf(skuMatch[0])).trim();
        let name = beforeSku
          .replace(/[\d,]{4,}/g, "") // حذف اعداد (قیمت‌ها)
          .replace(/[""''""]/g, "")
          .trim();
        
        // اگر نام طولانی نیست، از سایز/مشخصات استفاده کن
        if (name.length < 2) {
          const sizeMatch = line.match(/([\d.]+)\s*(mm|cm|inch|اینچ|\")/i);
          name = sizeMatch ? `سایز ${sizeMatch[0]}` : `محصول ${products.length + 1}`;
        }

        products.push({
          title: name || `محصول ${sku}`,
          slug: sku,
          category: "",
          price: price || "0",
          stock: "0",
          description: line,
          variants: [],
          image: null,
          imageFound: false,
        });
      } else if (price && products.length > 0) {
        // خط بدون SKU ولی با قیمت - احتمالاً تنوع یا اطلاعات اضافی
        const lastProduct = products[products.length - 1];
        if (lastProduct.price === "0" || lastProduct.price === "0") {
          lastProduct.price = price;
        }
        if (lastProduct.description.length < line.length) {
          lastProduct.description += " | " + line;
        }
      }
    }
    return products;
  }

  /** پارس کردن داده‌های جدولی (CSV / TSV / Pipe-separated) */
  function parseTabularData(lines: string[], separator = ";"): any[] {
    const products: any[] = [];

    // تشخیص هدر با جستجوی کلمات کلیدی
    const headerLine = lines[0].toLowerCase();
    const headerCols = lines[0].split(separator).map(c => c.trim().toLowerCase());
    
    // تشخیص موقعیت ستون‌ها بر اساس هدر
    const nameIdx = headerCols.findIndex(h => /^(نام|title|name|product|محصول|کالا|item|شرح)/i.test(h));
    const priceIdx = headerCols.findIndex(h => /^(قیمت|price|fee|cost|قیمت.*ریال|price_rial)/i.test(h));
    const skuIdx = headerCols.findIndex(h => /^(کد|sku|code|کد.*کالا|شماره|شناسه)/i.test(h));
    const stockIdx = headerCols.findIndex(h => /^(موجودی|stock|تعداد|quantity|count|qty)/i.test(h));
    
    const hasHeader = nameIdx !== -1 || priceIdx !== -1 || skuIdx !== -1;
    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length < 2) continue;

      // استخراج نام
      let nameCol = "";
      if (nameIdx !== -1) nameCol = cols[nameIdx] || "";
      else nameCol = cols[0] || "";

      // استخراج قیمت
      let priceCol = "0";
      if (priceIdx !== -1) priceCol = cols[priceIdx] || "";
      else priceCol = cols.find(c => /[\d,]{4,}/.test(c)) || cols[1] || "0";

      // استخراج موجودی
      let stockCol = "0";
      if (stockIdx !== -1) stockCol = cols[stockIdx] || "";
      else stockCol = cols.find(c => /^\d+$/.test(c)) || cols[2] || "0";

      // استخراج SKU
      let skuCol = "";
      if (skuIdx !== -1) skuCol = cols[skuIdx] || "";
      else skuCol = cols.find(c => /^[A-Za-z0-9-]{3,}$/.test(c)) || "";

      const price = priceCol.replace(/,/g, "").replace(/[^\d]/g, "");
      const stock = stockCol.replace(/,/g, "").replace(/[^\d]/g, "") || "0";

      if (nameCol && nameCol.length > 2 && !/^(تاریخ|کد|نام|قیمت|ردیف|row|id)/i.test(nameCol)) {
        products.push({
          title: nameCol,
          slug: skuCol.toLowerCase() || nameCol.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 50) || "product-" + (products.length + 1),
          category: "",
          price: price || "0",
          stock: stock,
          description: "",
          variants: [],
          image: null,
          imageFound: false,
        });
      }
    }
    return products;
  }


  async function saveSelected(indices: number[]) {
    setSaving(true);
    let created = 0;
    const updatedResults = [...results];
    for (const i of indices) {
      if (i >= updatedResults.length) continue;
      const item = updatedResults[i];
      if (item.status === "approved" || item.status === "error") continue;
      // بررسی امنیتی سمت کلاینت (امنیت اصلی سمت سرور است)
      if (!isSafeToCreate(item)) {
        updatedResults[i] = { ...updatedResults[i], status: "error" as const, error: "اطلاعات محصول ناقص است - ابتدا بررسی دستی کنید." };
        continue;
      }
      try {
        const res = await fetch("/api/admin/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "تأیید نهایی", fileProducts: [item] }),
        });
        const data = await res.json();
        if (data.ok && data.results?.[0]?.success) {
          updatedResults[i] = { ...updatedResults[i], status: "approved" as const };
          created++;
        } else {
          updatedResults[i] = { ...updatedResults[i], status: "error" as const, error: data.results?.[0]?.error || data.error || "اطلاعات کد یا قیمت کامل نیست" };
        }
      } catch {
        updatedResults[i] = { ...updatedResults[i], status: "error" as const, error: "خطا در ایجاد" };
      }
    }
    setResults(updatedResults);
    if (created > 0) toast.success(`✅ ${created} محصول ایجاد شد (غیرفعال - برای فعال‌سازی به بخش محصولات بروید)`);
    setSaving(false);
  }

  async function saveAll() {
    await saveSelected(results.map((_, i) => i));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target?.files;
    if (!files || files.length === 0) return;
    
    let allText = "";
    const extractedProducts: any[] = [];
    setOcrStatus("در حال آپلود و تحلیل دقیق فایل‌ها...");
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/assistant/file", { method: "POST", body: form });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "خواندن فایل انجام نشد");
        allText += `\n--- ${file.name} ---\n${data.text || ""}\n`;
        if (Array.isArray(data.products)) extractedProducts.push(...data.products);
        if (data.extractionWarning) toast.warning(data.extractionWarning);
        toast.success(`📄 ${file.name} خوانده و تحلیل شد`);
      } catch { toast.error(`خطا در خواندن ${file.name}`); }
    }
    setInput(prev => prev + allText);
    if (extractedProducts.length) {
      const mapped = extractedProducts.map((product: any) => ({
        title: product.title,
        slug: product.slug || product.sku || product.title.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 80),
        sku: product.sku || "",
        brand: product.brand || "",
        category: product.category || "",
        price: product.price || "",
        stock: product.stock || "0",
        description: product.description || "",
        variants: Array.isArray(product.variants) ? product.variants : [],
        confidence: product.confidence || 0,
        warnings: Array.isArray(product.warnings) ? product.warnings : [],
        image: null,
        imageFound: false,
        status: "preview" as const,
      }));
      setResults(mapped);
      setSelectedIndices(
        mapped
          .map((item: ImportResult, idx: number) => isSafeToCreate(item) ? idx : -1)
          .filter((idx: number) => idx >= 0)
      );
      setStep("preview");
    }
    setOcrStatus(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mt-6 rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
      <button type="button" onClick={() => { setOpen(!open); if (!open) setStep("input"); }}
        className="flex items-center gap-2 text-sm font-bold text-purple-700 w-full text-right">
        <Sparkles className="size-4" strokeWidth={1.6} />
        🤖 دستیار هوشمند ایجاد محصول
        <span className="text-[10px] font-normal text-slate-400 mr-auto">{open ? "بستن" : "باز کردن"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {step === "input" && (
            <>
              <p className="text-xs text-slate-500">لیست محصولات را تایپ کنید یا فایل PDF، Excel، CSV، متن یا عکس آپلود کنید. نام، کد، قیمت و تنوع‌ها قبل از ساخت نمایش داده می‌شوند.</p>
              
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={6}
                placeholder="مثال:
	پمپ سانتریفیوژ استیل 304 - قیمت: ۱۸,۵۰۰,۰۰۰ ریال - موجودی: ۴۲
	تنوع‌ها: ۱/۲ اینچ (SKU: CF-100-A) - ۱۸,۵۰۰,۰۰۰ ریال, ۳/۴ اینچ (SKU: CF-100-B) - ۲۲,۰۰۰,۰۰۰ ریال"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-500 font-mono leading-6" />

              {ocrStatus && (
                <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-4 py-2.5 text-xs text-purple-700">
                  <ScanLine className="size-4 animate-pulse" strokeWidth={1.5} />
                  {ocrStatus}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                  <Upload className="size-3.5" /> آپلود فایل
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              <button onClick={analyze} disabled={loading || !input.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "در حال تحلیل..." : "تحلیل و شناسایی"}
              </button>
            </>
          )}

          {step === "preview" && results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">
                  {results.length} محصول شناسایی شد
                  <span className="text-[10px] font-normal text-slate-400 mr-2">
                    (همه با وضعیت غیرفعال ساخته می‌شوند)
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("input")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50">بازگشت</button>
                  <button onClick={async () => {
                    await saveSelected(selectedIndices);
                  }} disabled={saving || selectedIndices.length === 0}
                    className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    ایجاد انتخاب شده ({selectedIndices.length})
                  </button>
                </div>
              </div>

              {/* انتخاب همه */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIndices.length === results.filter(r => r.status === "preview" && isSafeToCreate(r)).length && results.filter(r => r.status === "preview").length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        // فقط موارد safe و status=preview
                        setSelectedIndices(
                          results
                            .map((r, i) => (r.status === "preview" && isSafeToCreate(r)) ? i : -1)
                            .filter((i: number) => i >= 0)
                        );
                      } else {
                        setSelectedIndices([]);
                      }
                    }}
                    className="size-3.5 accent-purple-600" />
                  <span className="text-[10px] font-medium text-slate-600">انتخاب همه</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {selectedIndices.length} از {results.filter(r => r.status === "preview" && isSafeToCreate(r)).length} قابل‌اعتماد انتخاب شده
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {results.map((item, i) => (
                  <div key={i} className={cn("rounded-xl border p-4 text-xs transition-all",
                    item.status === "approved" ? "border-green-200 bg-green-50" :
                    item.status === "error" ? "border-red-200 bg-red-50" :
                    selectedIndices.includes(i) ? "border-purple-200 bg-purple-50/30" :
                    "border-slate-200 bg-white hover:border-purple-200"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input type="checkbox"
                            checked={selectedIndices.includes(i)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedIndices(prev => [...prev, i]);
                              } else {
                                setSelectedIndices(prev => prev.filter(idx => idx !== i));
                              }
                            }}
                            disabled={item.status !== "preview" || !isSafeToCreate(item)}
                            className="size-3.5 accent-purple-600 mt-0.5 disabled:opacity-30" />
                          <span className="font-bold text-slate-900">{item.title}</span>
                          {item.status === "approved" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[8px] font-bold text-green-700">ایجاد شد (غیرفعال)</span>}
                          {item.status === "error" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[8px] font-bold text-red-700">خطا</span>}
                          {item.status === "preview" && !isSafeToCreate(item) && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700 flex items-center gap-0.5">
                              <AlertTriangle className="size-2.5" /> نیاز به بررسی
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500">
                          <span>💰 {Number(item.price || 0).toLocaleString()} ریال</span>
                          <span>📦 موجودی: {item.stock || "—"}</span>
                          <span>🔢 کد: {item.sku || (item.variants.length ? "در تنوع‌ها" : "نامشخص")}</span>
                          <span>📁 {item.category || "بدون دسته"}</span>
                        </div>
                        {typeof item.confidence === "number" && item.confidence > 0 && <p className="mt-1 text-[9px] text-slate-400">اطمینان خواندن: {Math.round(item.confidence * 100)}٪</p>}
                        {item.warnings?.length ? <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[9px] text-amber-700">⚠️ {item.warnings.join("؛ ")}</p> : null}
                        {item.description && <p className="mt-1 text-[10px] text-slate-400 line-clamp-2">{item.description}</p>}
                        
                        {item.variants.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-[10px] text-purple-600 cursor-pointer font-medium">تنوع‌ها ({item.variants.length})</summary>
                            <div className="mt-1 space-y-1">
                              {item.variants.map((v, idx) => (
                                <div key={idx} className="text-[9px] text-slate-500 flex gap-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-slate-400">{v.sku}</span>
                                  <span>{Number(v.price).toLocaleString()} ریال</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          {!item.imageFound && <span className="text-[9px] text-amber-600">⚠️ تصویر پیدا نشد</span>}
                          {item.imageFound && item.image && <span className="text-[9px] text-green-600">✅ تصویر: موجود</span>}
                          {item.error && <span className="text-[9px] text-red-600">❌ {item.error}</span>}
                        </div>
                      </div>
                    </div>

                    {item.status === "preview" && (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <button onClick={async () => {
                          if (!isSafeToCreate(item)) {
                            toast.error("این محصول اطلاعات ناقص دارد و باید ابتدا بررسی شود.");
                            return;
                          }
                          await saveSelected([i]);
                        }} disabled={saving || !isSafeToCreate(item)}
                          className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
                          {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          ایجاد این محصول
                        </button>
                        <button onClick={() => {
                          const newInput = input + `\n${item.title} - ${item.price} ریال\n`;
                          setInput(newInput);
                          setResults(results.filter((_, idx) => idx !== i));
                          setSelectedIndices(prev => prev.filter(idx => idx !== i).map(idx => idx > i ? idx - 1 : idx));
                        }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50">ویرایش</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <strong>ℹ️ توجه:</strong> محصولات با وضعیت <strong>غیرفعال</strong> ساخته می‌شوند. برای نمایش در فروشگاه، از بخش "محصولات" تیک "فعال" را بزنید.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
