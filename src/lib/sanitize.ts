/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses a strict allowlist approach — only safe tags and attributes are permitted.
 * تمام event handlerها، پروتکل‌های خطرناک و تگ‌های ناامن حذف می‌شوند.
 */

// تگ‌های مجاز HTML — کاملاً محدود و امن
const ALLOWED_TAGS = new Set([
  "p", "br", "b", "i", "u", "strong", "em", "s", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "a", "img",
  "blockquote", "pre", "code", "hr",
  "div", "span",
]);

// ویژگی‌های مجاز برای هر تگ — style حذف شد (خطر XSS دارد)
const ALLOWED_ATTRS = new Set([
  "href", "target", "rel",
  "src", "alt", "width", "height",
  "class", "id",
  "dir", "lang",
  "colspan", "rowspan",
  "align",
]);

// پروتکل‌های امن برای href
const SAFE_HREF_PROTOCOLS = /^(https?:\/\/|mailto:|tel:|\/|#)/i;

// پروتکل‌های امن برای src
const SAFE_SRC_PROTOCOLS = /^(https?:\/\/|\/|data:image\/)/i;

/**
 * پاک‌سازی HTML برای جلوگیری از XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  // مرحله ۱: حذف تگ‌های خطرناک و CDATA/SGML
  let cleaned = input
    // حذف CDATA
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "")
    // حذف کدهای جاوااسکریپت در HTML
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed\s*>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg\s*>/gi, "")  // SVG خطرناک
    .replace(/<math[\s\S]*?<\/math\s*>/gi, "")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, "")  // CSS می‌تواند XSS کند
    .replace(/<form[\s\S]*?<\/form\s*>/gi, "")
    .replace(/<input[\s\S]*?\/?\s*>/gi, "")
    .replace(/<button[\s\S]*?<\/button\s*>/gi, "")
    .replace(/<textarea[\s\S]*?<\/textarea\s*>/gi, "")
    .replace(/<select[\s\S]*?<\/select\s*>/gi, "")
    .replace(/<option[\s\S]*?<\/option\s*>/gi, "")
    .replace(/<marquee[\s\S]*?<\/marquee\s*>/gi, "")
    .replace(/<link[\s\S]*?\/?\s*>/gi, "")
    .replace(/<meta[\s\S]*?\/?\s*>/gi, "")
    // حذف event handlerها — تمام انواع
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // حذف پروتکل‌های خطرناک در attributes
    .replace(/\bjavascript\s*:/gi, "blocked:")
    .replace(/\bdata\s*:/gi, "blocked:")
    .replace(/\bvbscript\s*:/gi, "blocked:")
    .replace(/\blivescript\s*:/gi, "blocked:")
    .replace(/\bmocha\s*:/gi, "blocked:");

  // مرحله ۲: پردازش تگ‌های مجاز و حذف ویژگی‌های غیرمجاز
  cleaned = cleaned.replace(/<(\/?)\s*(\w+)((?:\s+[^>]*)?)\s*(\/?)>/g, (_match: string, _closing: string, tagName: string, attrs: string, _selfClose: string) => {
    const tag = tagName.toLowerCase();
    
    // تگ‌های غیرمجاز → حذف کامل
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    // تگ بسته‌شونده → بدون تغییر
    if (_closing) return _match;

    // تگ مجاز → پالایش ویژگی‌ها
    const safeAttrs = attrs.replace(/\s+(\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g, (fullAttr: string, attrName: string) => {
      const attr = attrName.toLowerCase();
      
      // ویژگی غیرمجاز → حذف
      if (!ALLOWED_ATTRS.has(attr)) return "";

      // استخراج مقدار ویژگی
      const valueMatch = fullAttr.match(/=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/);
      const value = valueMatch ? (valueMatch[1] || valueMatch[2] || valueMatch[3] || "") : "";

      // اعتبارسنجی href
      if (attr === "href" && !SAFE_HREF_PROTOCOLS.test(value)) {
        return "";
      }

      // اعتبارسنجی src
      if (attr === "src" && !SAFE_SRC_PROTOCOLS.test(value)) {
        return "";
      }

      return fullAttr;
    });

    return `<${tag}${safeAttrs}${_selfClose}>`;
  });

  return cleaned;
}