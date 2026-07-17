import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const globalRateLimits = globalThis as typeof globalThis & {
  __dornikaRateLimits?: Map<string, Bucket>;
};

const buckets = globalRateLimits.__dornikaRateLimits ?? new Map<string, Bucket>();
globalRateLimits.__dornikaRateLimits = buckets;

// پاکسازی حافظه: هر ۵ دقیقه باکت‌های منقضی‌شده حذف می‌شوند
if (typeof globalThis.setInterval === "function") {
  const CLEANUP_KEY = "__dornikaRateLimitCleanup";
  if (!(globalThis as Record<string, unknown>)[CLEANUP_KEY]) {
    (globalThis as Record<string, unknown>)[CLEANUP_KEY] = true;
    setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }, 300_000); // هر ۵ دقیقه
  }
}

export function clientIp(req: NextRequest): string {
  // اولویت: هدرهای استاندارد پروکسی → IP اتصال مستقیم
  const fromHeader =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  // اگر هدری نبود از IP اتصال TCP استفاده کن (مواردی که پروکسی هدر اضافه نمی‌کند)
  // در Next.js در محیط Node، req.ip از socket remoteAddress می‌آید
  if (fromHeader) return fromHeader;

  // تلاش برای دریافت IP از nextRequest.ip (فقط در Edge Runtime یا با middleware تنظیم می‌شود)
  const ip = (req as any).ip || req.headers.get("x-vercel-forwarded-for") || "";
  if (ip) return ip;

  // آخرین fallback: از remoteAddress سوکت
  try {
    const socket = (req as any).socket;
    if (socket?.remoteAddress) return socket.remoteAddress;
  } catch {
    // ignore
  }

  // همچنان fallback به "unknown" اما با ترکیب scope+identifier منحصربه‌فردتر
  return "0.0.0.0";
}

export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  current.count += 1;
  return null;
}

export function safeChatHistory(value: unknown, maxItems = 10) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-maxItems)
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const message = item as { role?: unknown; content?: unknown };
      return {
        role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(message.content || "").slice(0, 4_000),
      };
    })
    .filter((item) => item.content.trim());
}

export function safeChatAttachments(value: unknown, maxItems = 10) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const storageId = String(item.storageId || "");
    if (!/^[a-f0-9]{48}\.[a-z0-9]{1,10}$/.test(storageId)) return [];
    const type = String(item.type || "file").slice(0, 30);
    const mimeType = String(item.mimeType || "application/octet-stream").slice(0, 120);
    const size = Math.max(0, Math.min(Number(item.size) || 0, Number.MAX_SAFE_INTEGER));
    return [{
      name: String(item.name || "attachment").replace(/[\r\n]/g, " ").slice(0, 255),
      type,
      mimeType,
      size,
      storageId,
      url: `/api/assistant/file?id=${storageId}&name=${encodeURIComponent(String(item.name || "attachment").slice(0, 180))}`,
    }];
  });
}

export function safeExtractedProducts(value: unknown, maxItems = 100) {
  if (!Array.isArray(value)) return undefined;
  const clean = (input: unknown, max: number) => String(input ?? "").replace(/[\u0000\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const number = (input: unknown, max = 14) => String(input ?? "").replace(/[^0-9]/g, "").slice(0, max);
  return value.slice(0, maxItems).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const title = clean(item.title, 300);
    if (!title) return [];
    const variants = Array.isArray(item.variants) ? item.variants.slice(0, 100).flatMap(raw => {
      if (!raw || typeof raw !== "object") return [];
      const variant = raw as Record<string, unknown>;
      const specs = variant.specs && typeof variant.specs === "object" && !Array.isArray(variant.specs)
        ? Object.fromEntries(Object.entries(variant.specs as Record<string, unknown>).slice(0, 30).map(([key, val]) => [clean(key, 80), clean(val, 180)]).filter(([key]) => key))
        : {};
      return [{ name: clean(variant.name, 200), sku: clean(variant.sku || variant.code, 100), price: number(variant.price), stock: number(variant.stock, 10), unitValue: clean(variant.unitValue, 60), specs }];
    }) : [];
    return [{
      title,
      slug: clean(item.slug, 180),
      brand: clean(item.brand, 100),
      category: clean(item.category, 120),
      description: clean(item.description, 5000),
      sku: clean(item.sku || item.code, 100),
      price: number(item.price),
      stock: number(item.stock, 10),
      variants,
    }];
  });
}
