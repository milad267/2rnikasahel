/**
 * 🧠 موتور هوشمند تشخیص محصول
 * 
 * درک ساختار محصول: والد (مادر) → تنوع‌ها (فرزندان)
 * هر تنوع: SKU + قیمت + مشخصات
 */

export interface SmartProduct {
  title: string;
  brand?: string;
  category?: string;
  description?: string;
  // محصولات بدون تنوع
  sku?: string;
  price?: string;
  stock?: string;
  // تنوع‌ها
  variants: SmartVariant[];
  imageUrl?: string;
  slug?: string;
}

export interface SmartVariant {
  name: string;
  sku: string;
  price: string;
  stock: string;
  specs?: Record<string, string>;
}

/**
 * تحلیل هوشمند متن و استخراج محصولات با تنوع‌ها
 * 
 * الگوریتم بهبودیافته:
 * ۱. خطوط بدون پیشوند (-, •, *) که نام/مشخصات دارن = محصول مادر جدید
 * ۲. خطوط با پیشوند (-, •, *) = تنوع محصول جاری
 * ۳. خط حاوی "برند:" = برند محصول جاری
 * ۴. خطوط خالی = جداکننده (محصول فعلی بسته میشه)
 */
export function analyzeProductList(text: string): SmartProduct[] {
  const normalized = text.replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const lines = normalized.split("\n").map(l => l.trim());
  const products: SmartProduct[] = [];
  let current: SmartProduct | null = null;
  const skuFrom = (value: string) => value.match(/(?:SKU|کد(?:\s*کالا)?)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9._/-]{2,99})/i)?.[1]
    || value.match(/\b([A-Za-z]{1,10}[-_/][A-Za-z0-9._/-]{2,90}|\d{6,14})\b/)?.[1] || "";
  const priceFrom = (value: string) => {
    const match = value.match(/(?:قیمت|price)\s*[:：]?\s*([\d,]{3,})\s*(تومان|ریال|﷼)?/i)
      || value.match(/([\d,]{3,})\s*(تومان|ریال|﷼)/i);
    if (!match) return "";
    const number = Number(match[1].replace(/,/g, "")) || 0;
    return String(match[2]?.toLowerCase() === "تومان" ? number * 10 : number);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      // خط خالی = پایان محصول فعلی
      if (current && (current.variants.length > 0 || current.price || current.sku)) {
        products.push(current);
      }
      current = null;
      continue;
    }

    // استخراج برند
    const brandMatch = line.match(/(?:برند|brand|شرکت|تولید)[:\s]*["']?([A-Za-z\u0600-\u06FF0-9\s\-]{2,30})["']?/i);

    // تشخیص تنوع (خط با - یا • یا * شروع میشه و قیمت داره)
    const isVariant = /^\s*[-–•*▸›>]\s*.+/.test(line) && /\d[\d,]{2,}/.test(line);

    if (isVariant && current) {
      const price = priceFrom(line);
      const namePart = line
        .replace(/^\s*[-–•*▸›>]\s*/, "")
        .replace(/\s*[\d,]{3,}\s*(?:تومان|ریال)?.*$/, "")
        .trim();
      const sku = skuFrom(line);

      current.variants.push({
        name: namePart || `تنوع ${current.variants.length + 1}`,
        sku,
        price,
        stock: "0",
        specs: { code: sku },
      });
      continue;
    }

    // برند برای محصول جاری
    if (brandMatch && current && !current.brand) {
      current.brand = brandMatch[1].trim();
      continue;
    }

    // خط ساده با قیمت در انتها = محصول مستقیم (بدون تنوع)
    const directPriceMatch = line.match(/([\d,]{3,})\s*(تومان|ریال|﷼)\s*$/);
    const hasName = line.replace(/[\d,]+/g, "").trim().length >= 3;

    if (directPriceMatch && hasName) {
      // بستن محصول قبلی
      if (current && (current.variants.length > 0 || current.price || current.sku)) {
        products.push(current);
      }
      current = null;

      const sku = skuFrom(line);
      const name = line.slice(0, line.length - directPriceMatch[0].length).replace(sku, "").replace(/\s*[-–|:]\s*$/, "").trim();
      const price = priceFrom(line);

      products.push({
        title: name,
        sku,
        price,
        stock: "0",
        brand: brandMatch ? brandMatch[1].trim() : undefined,
        variants: [],
      });
      continue;
    }

    // خط با نام محصول (بدون قیمت، بدون پیشوند) = محصول مادر جدید
    const isParentLine = hasName && !isVariant && !directPriceMatch && line.length > 3;
    
    if (isParentLine) {
      // بستن محصول قبلی
      if (current && (current.variants.length > 0 || current.price || current.sku)) {
        products.push(current);
      }

      current = {
        title: line,
        brand: brandMatch ? brandMatch[1].trim() : undefined,
        variants: [],
      };
      continue;
    }
  }

  // محصول آخر
  if (current && (current.variants.length > 0 || current.price || current.sku)) {
    products.push(current);
  }

  return products;
}

/**
 * محاسبه قیمت با درصد افزایش/کاهش
 */
export function applyPriceAdjustment(price: string, percent: number): string {
  const num = Number(price.replace(/,/g, "")) || 0;
  return String(Math.round(num * (1 + percent / 100)));
}

/**
 * تطبیق محصولات جدید با محصولات موجود (برای بروزرسانی قیمت)
 */
export function matchProducts(
  newProducts: SmartProduct[],
  existingProducts: { id: number; title: string; slug: string; variants: { id: number; sku: string; price: string }[] }[]
) {
  const results: {
    new: SmartProduct[];
    update: { existingId: number; variantId?: number; newPrice: string }[];
    unmatched: SmartProduct[];
  } = { new: [], update: [], unmatched: [] };

  for (const np of newProducts) {
    const matched = existingProducts.find(ep =>
      ep.title.includes(np.title) || np.title.includes(ep.title) ||
      ep.slug === np.slug ||
      (np.sku && ep.slug.includes(np.sku))
    );

    if (matched) {
      // محصول وجود داره - بروزرسانی قیمت
      if (np.price) {
        results.update.push({ existingId: matched.id, newPrice: np.price });
      }
      // بروزرسانی قیمت تنوع‌ها
      for (const nv of np.variants) {
        const matchedVariant = matched.variants.find(mv =>
          mv.sku === nv.sku || mv.sku.includes(nv.sku.slice(-4))
        );
        if (matchedVariant) {
          results.update.push({
            existingId: matched.id,
            variantId: matchedVariant.id,
            newPrice: nv.price,
          });
        } else {
          results.unmatched.push(np);
        }
      }
    } else {
      // محصول جدید
      results.new.push(np);
    }
  }

  return results;
}

/**
 * تولید slug از روی عنوان
 */
export function generateSlug(title: string): string {
  return title
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/gi, "")
    .toLowerCase()
    .slice(0, 80) || `product-${Date.now()}`;
}
