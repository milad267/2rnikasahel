/**
 * 🔧 Tool Handlers — توابع اجرایی واقعی برای tool callهای agentها
 * 
 * وقتی یه agent یه tool call میکنه (مثل create_product)،
 * این فایل handler واقعی رو اجرا میکنه که دیتابیس رو تغییر میده.
 */
import { db } from "@/db";
import {
  products, productVariants, categories, units,
  orders, orderItems, users, blogPosts, slides,
  siteSettings, contactMessages,
} from "@/db/schema";
import { eq, and, desc, count, gte, sql, ne, ilike, or } from "drizzle-orm";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { CHAT_STORAGE } from "@/lib/storage-paths";
import { hasModuleAccess } from "@/lib/admin-permissions-server";
import { type AdminModule } from "@/lib/admin-permissions";

export type ToolContext = { userId?: number; isAdmin: boolean; adminRole?: string; confirmed: boolean };

async function chatImageSource(value: unknown) {
  const storageId = String(value || "");
  if (!/^[a-f0-9]{48}\.(?:jpe?g|png|webp|gif)$/i.test(storageId)) {
    throw new Error("تصویر پیوست‌شده معتبر نیست.");
  }
  return readFile(path.join(CHAT_STORAGE, storageId));
}

async function saveChatImage(data: Buffer, extension: string) {
  const storageId = `${crypto.randomBytes(24).toString("hex")}.${extension}`;
  await mkdir(CHAT_STORAGE, { recursive: true });
  await writeFile(path.join(CHAT_STORAGE, storageId), data, { flag: "wx" });
  return { storageId, size: data.byteLength, url: `/api/assistant/file?id=${storageId}&name=${encodeURIComponent(`edited.${extension}`)}` };
}

/** همه handlerهای tool — هرکدوم یه تابع async که args میگیره و string نتیجه برمیگردونه */
export const TOOL_HANDLERS: Record<string, (args: Record<string, unknown>, context: ToolContext) => Promise<string>> = {

  async search_products(args) {
    const query = String(args.query || "").trim().slice(0, 100);
    if (query.length < 2) return JSON.stringify({ ok: false, error: "نام یا مشخصات محصول را دقیق‌تر بگویید." });
    const rows = await db.select({
      title: products.title,
      slug: products.slug,
      subtitle: products.subtitle,
      minPrice: sql<string>`coalesce(min(${productVariants.price}), '0')`,
      stock: sql<number>`coalesce(sum(${productVariants.stock}), 0)::int`,
    }).from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(eq(products.isActive, true), or(ilike(products.title, `%${query}%`), ilike(products.subtitle, `%${query}%`))))
      .groupBy(products.id)
      .limit(8);
    return JSON.stringify({ ok: true, products: rows });
  },

  /* ─── Product Agent ─── */
  async create_product(args) {
    try {
      const clean = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
      const digits = (value: unknown) => String(value ?? "").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "").slice(0, 14);
      const title = clean(args.title, 300);
      if (title.length < 2) return JSON.stringify({ ok: false, error: "نام محصول معتبر نیست." });

      const baseSlug = clean(args.slug, 180) || title.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 160);
      const slug = baseSlug || `ai-product-${Date.now().toString(36)}`;
      const baseSku = clean(args.sku || args.code, 100);
      const basePrice = digits(args.price);
      const baseStock = Math.min(2_000_000_000, Number(digits(args.stock)) || 0);
      const inputVariants = (Array.isArray(args.variants) ? args.variants : []).slice(0, 100).map((raw: any, index: number) => ({
        name: clean(raw?.name || `تنوع ${index + 1}`, 200),
        sku: clean(raw?.sku || raw?.code, 100),
        price: digits(raw?.price),
        stock: Math.min(2_000_000_000, Number(digits(raw?.stock)) || 0),
        unitValue: clean(raw?.unitValue, 60) || null,
        specs: raw?.specs && typeof raw.specs === "object"
          ? Object.fromEntries(Object.entries(raw.specs).slice(0, 30).map(([key, value]) => [clean(key, 80), clean(value, 180)]).filter(([key]) => key))
          : {},
      }));
      let variantsToCreate = inputVariants.length ? inputVariants : [{
        name: title, sku: baseSku, price: basePrice, stock: baseStock, unitValue: null, specs: {},
      }];

      // حذف تنوع‌های با SKU خالی و اطلاع‌رسانی
      const originalCount = variantsToCreate.length;
      variantsToCreate = variantsToCreate.filter(v => v.sku);
      const removedCount = originalCount - variantsToCreate.length;
      const skuWarning = removedCount > 0 ? ` (${removedCount} تنوع بدون کد SKU نادیده گرفته شد)` : "";

      if (variantsToCreate.length === 0) {
        return JSON.stringify({ ok: false, validationError: true, error: "هیچکدام از تنوع‌ها کد SKU معتبر نداشتند." });
      }

      const invalid = variantsToCreate.flatMap((variant, index) => {
        const errors: string[] = [];
        if (!variant.price || Number(variant.price) <= 0) errors.push(`قیمت تنوع ${index + 1} (${variant.name}) معتبر نیست`);
        return errors;
      });
      if (invalid.length) return JSON.stringify({ ok: false, validationError: true, error: invalid.join("؛ ") });
      
      // بررسی یکجای SKUهای تکراری در ورودی
      const lowercasedSkus = variantsToCreate.map(item => item.sku.toLowerCase());
      if (new Set(lowercasedSkus).size !== lowercasedSkus.length) {
        return JSON.stringify({ ok: false, validationError: true, error: "یک کد SKU در چند تنوع تکرار شده است." });
      }

      const duplicateSlug = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
      if (duplicateSlug.length) return JSON.stringify({ ok: false, duplicate: true, error: `محصولی با شناسه «${slug}» قبلاً وجود دارد.` });

      // بررسی یکجای SKUهای تکراری در دیتابیس
      const existingVariants = await db.select({ sku: productVariants.sku }).from(productVariants).where(sql`${productVariants.sku} IN ${lowercasedSkus}`);
      if (existingVariants.length > 0) {
        const duplicateSkus = existingVariants.map(v => v.sku).join(", ");
        return JSON.stringify({ ok: false, duplicate: true, error: `این کدها قبلاً در فروشگاه ثبت شده‌اند: ${duplicateSkus}` });
      }

      let categoryId = Number(args.categoryId) || null;
      const categoryName = clean(args.category, 120);
      if (!categoryId && categoryName) {
        const [matchedCategory] = await db.select({ id: categories.id }).from(categories)
          .where(or(ilike(categories.title, categoryName), ilike(categories.slug, categoryName))).limit(1);
        categoryId = matchedCategory?.id || null;
      }

      const product = await db.transaction(async tx => {
        const [created] = await tx.insert(products).values({
          title,
          slug,
          subtitle: clean(args.subtitle || args.brand, 300) || null,
          description: clean(args.description, 5000) || null,
          categoryId,
          coverImage: clean(args.coverImage, 500) || null,
          isActive: false,
        }).returning();
        await tx.insert(productVariants).values(variantsToCreate.map((variant, index) => ({
          productId: created.id,
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
          unitValue: variant.unitValue,
          specSheet: variant.specs,
          isActive: true,
          sortOrder: index,
        })));
        return created;
      });

      const variantCount = variantsToCreate.length;

      return JSON.stringify({
        ok: true,
        message: `✅ محصول پیش‌نویس "${title}" با ${variantCount} تنوع ایجاد شد.${skuWarning}`,
        productId: product.id,
        slug: product.slug,
        variantCount,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در ایجاد محصول: ${e.message}` });
    }
  },

  async update_price(args) {
    try {
      const sku = String(args.sku || "");
      const newPrice = String(args.newPrice || "0");
      const [variant] = await db.select({ id: productVariants.id, name: productVariants.name, price: productVariants.price })
        .from(productVariants).where(eq(productVariants.sku, sku)).limit(1);

      if (!variant) return JSON.stringify({ ok: false, error: `محصولی با کد ${sku} یافت نشد.` });

      await db.update(productVariants).set({ price: newPrice }).where(eq(productVariants.id, variant.id));

      return JSON.stringify({
        ok: true,
        message: `✅ قیمت "${variant.name}" از ${Number(variant.price).toLocaleString("fa-IR")} به ${Number(newPrice).toLocaleString("fa-IR")} ریال تغییر کرد.`,
        sku, oldPrice: variant.price, newPrice,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در بروزرسانی قیمت: ${e.message}` });
    }
  },

  /* ─── Content Agent ─── */
  async create_blog_post(args) {
    try {
      const title = String(args.title || "");
      const slug = String(args.slug || title.replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase().slice(0, 80));
      const content = String(args.content || "");
      const status = (args.status === "published" ? "published" : "draft") as "published" | "draft";

      const [post] = await db.insert(blogPosts).values({
        title,
        slug,
        excerpt: String(args.excerpt || "").slice(0, 500) || null,
        content,
        categoryId: Number(args.categoryId) || null,
        metaTitle: String(args.metaTitle || "") || null,
        metaDesc: String(args.metaDesc || "") || null,
        status,
      }).returning();

      return JSON.stringify({
        ok: true,
        message: `✅ پست بلاگ "${title}" با وضعیت ${status === "published" ? "منتشر شده" : "پیش‌نویس"} ایجاد شد.`,
        postId: post.id, slug: post.slug, status,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در ایجاد پست: ${e.message}` });
    }
  },

  async create_slide(args) {
    try {
      const title = String(args.title || "");
      const [slide] = await db.insert(slides).values({
        title,
        subtitle: String(args.subtitle || "") || null,
        description: String(args.description || "") || null,
        buttonText: String(args.buttonText || "مشاهده") || null,
        buttonLink: String(args.buttonLink || "#") || null,
        desktopImage: String(args.desktopImage || "") || null,
        isActive: args.isActive !== false,
      }).returning();

      return JSON.stringify({
        ok: true,
        message: `✅ اسلاید "${title}" ایجاد شد.`,
        slideId: slide.id,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در ایجاد اسلاید: ${e.message}` });
    }
  },

  /* ─── Analytics Agent ─── */
  async get_sales_report(args) {
    try {
      const period = String(args.period || "all");
      const now = new Date();
      const start = new Date(now);
      if (period === "today") start.setHours(0, 0, 0, 0);
      else if (period === "week") start.setDate(start.getDate() - 7);
      else if (period === "month") start.setMonth(start.getMonth() - 1);
      else if (period === "quarter") start.setMonth(start.getMonth() - 3);
      else if (period === "year") start.setFullYear(start.getFullYear() - 1);

      const orderFilter = period === "all"
        ? ne(orders.status, "cancelled")
        : and(ne(orders.status, "cancelled"), gte(orders.createdAt, start));

      const [totalProducts] = await db.select({ value: count() }).from(products).where(eq(products.isActive, true));
      const [totalUsers] = await db.select({ value: count() }).from(users).where(eq(users.isActive, true));
      const [sales] = await db.select({
        ordersCount: count(),
        totalSales: sql<string>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
      }).from(orders).where(orderFilter);

      const topProducts = await db.select({
        title: products.title,
        totalSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      }).from(orderItems)
        .innerJoin(products, eq(orderItems.variantId, products.id))
        .groupBy(products.id)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5);

      return JSON.stringify({
        ok: true,
        totalProducts: totalProducts?.value || 0,
        totalUsers: totalUsers?.value || 0,
        ordersCount: sales?.ordersCount || 0,
        totalSalesRial: sales?.totalSales || "0",
        period,
        topProducts: topProducts.map(p => ({ title: p.title, sold: p.totalSold })),
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در گزارش: ${e.message}` });
    }
  },

  /* ─── Orders Agent ─── */
  async track_order(args, context) {
    try {
      const orderNumber = String(args.orderNumber || "").trim();
      if (!orderNumber) return JSON.stringify({ ok: false, error: "شماره سفارش را وارد کنید." });

      const [order] = await db.select({
        id: orders.id,
        userId: orders.userId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod,
        paymentRef: orders.paymentRef,
        userName: users.name,
        userPhone: users.phone,
      }).from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);

      if (!order) return JSON.stringify({ ok: false, error: `سفارش ${orderNumber} یافت نشد.` });
      if (!context.isAdmin && (!context.userId || order.userId !== context.userId)) {
        return JSON.stringify({ ok: false, error: "این سفارش متعلق به حساب شما نیست." });
      }

      const items = await db.select({
        productTitle: orderItems.productTitle,
        variantTitle: orderItems.variantTitle,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
      }).from(orderItems).where(eq(orderItems.orderId, order.id)).limit(20);

      const statusLabels: Record<string, string> = {
        pending_payment: "⏳ در انتظار پرداخت",
        paid: "✅ پرداخت شده",
        processing: "🔄 در حال پردازش",
        shipped: "📦 ارسال شده",
        delivered: "✅ تحویل شده",
        cancelled: "❌ لغو شده",
      };

      return JSON.stringify({
        ok: true,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: statusLabels[order.status] || order.status,
        total: order.totalAmount,
        date: new Date(order.createdAt).toLocaleDateString("fa-IR"),
        items: items.map(i => `${i.productTitle} - ${i.variantTitle} (${i.quantity} عدد)`),
        customer: order.userName,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در پیگیری سفارش: ${e.message}` });
    }
  },

  /* ─── Inventory Agent ─── */
  async check_inventory(args) {
    try {
      const sku = String(args.sku || "").trim();

      let results;
      if (sku) {
        results = await db.select({
          title: products.title,
          variantName: productVariants.name,
          sku: productVariants.sku,
          stock: productVariants.stock,
          price: productVariants.price,
        }).from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(and(eq(productVariants.sku, sku), eq(productVariants.isActive, true)))
          .limit(1);
      } else {
        results = await db.select({
          title: products.title,
          variantName: productVariants.name,
          sku: productVariants.sku,
          stock: productVariants.stock,
          price: productVariants.price,
        }).from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(and(eq(productVariants.isActive, true), sql`${productVariants.stock} < 5`))
          .orderBy(sql`${productVariants.stock} ASC`)
          .limit(15);
      }

      if (results.length === 0) {
        return JSON.stringify({ ok: true, message: sku ? `محصولی با کد ${sku} یافت نشد.` : "هیچ محصولی با موجودی کم یافت نشد. ✅", items: [] });
      }

      return JSON.stringify({
        ok: true,
        items: results.map(r => ({
          title: r.title,
          variant: r.variantName,
          sku: r.sku,
          stock: r.stock,
          price: r.price,
        })),
        lowStockCount: results.length,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا در بررسی موجودی: ${e.message}` });
    }
  },

  /* ─── Image Editor Agent ─── */
  async remove_background(args) {
    const source = await chatImageSource(args.imageUrl);
    const image = sharp(source).rotate().ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 240 && data[index + 1] > 240 && data[index + 2] > 240) data[index + 3] = 0;
    }
    const output = await sharp(data, { raw: info }).png().toBuffer();
    const saved = await saveChatImage(output, "png");
    return JSON.stringify({
      ok: true,
      message: "پس‌زمینه سفید تصویر حذف شد.",
      ...saved,
    });
  },

  async resize_image(args) {
    const source = await chatImageSource(args.imageUrl);
    const w = Math.min(5000, Math.max(1, Number(args.width) || 800));
    const h = Math.min(5000, Math.max(1, Number(args.height) || 600));
    const allowedFits = new Set(["cover", "contain", "fill", "inside", "outside"] as const);
    const requestedFit = String(args.fit);
    const fit: "cover" | "contain" | "fill" | "inside" | "outside" = allowedFits.has(requestedFit as any)
      ? requestedFit as "cover" | "contain" | "fill" | "inside" | "outside"
      : "cover";
    const output = await sharp(source).rotate().resize(w, h, { fit }).webp({ quality: 88 }).toBuffer();
    const saved = await saveChatImage(output, "webp");
    return JSON.stringify({
      ok: true,
      message: `تصویر واقعاً به ابعاد ${w}×${h} تغییر کرد.`,
      width: w, height: h, ...saved,
    });
  },

  async optimize_image(args) {
    const source = await chatImageSource(args.imageUrl);
    const format = ["webp", "jpeg", "png", "avif"].includes(String(args.format)) ? String(args.format) : "webp";
    const quality = Math.min(100, Math.max(20, Number(args.quality) || 80));
    const pipeline = sharp(source).rotate();
    const output = format === "jpeg" ? await pipeline.jpeg({ quality }).toBuffer()
      : format === "png" ? await pipeline.png({ quality }).toBuffer()
      : format === "avif" ? await pipeline.avif({ quality }).toBuffer()
      : await pipeline.webp({ quality }).toBuffer();
    const saved = await saveChatImage(output, format === "jpeg" ? "jpg" : format);
    return JSON.stringify({
      ok: true,
      message: `تصویر واقعاً با فرمت ${format.toUpperCase()} و کیفیت ${quality}٪ بهینه شد.`,
      format, quality, ...saved,
    });
  },

  /* ─── Image Intelligence Agent ─── */
  async search_product_image(args) {
    try {
      const productName = String(args.productName || "");
      const brand = String(args.brand || "");
      if (!productName) return JSON.stringify({ ok: false, error: "نام محصول را وارد کنید." });

      // dynamic import for image-intelligence
      const { searchProductImage } = await import("./image-intelligence");
      const results = await searchProductImage(productName, brand, { maxResults: 5 });

      return JSON.stringify({
        ok: true,
        message: `${results.length} تصویر برای "${productName}" پیدا شد.`,
        images: results.map(r => ({
          url: r.url,
          source: r.source,
          width: r.width,
          height: r.height,
          confidence: r.confidence,
        })),
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا: ${e.message}` });
    }
  },

  async process_product_image(args) {
    try {
      const imageUrl = String(args.imageUrl || "");
      const productName = String(args.productName || "");
      if (!imageUrl) return JSON.stringify({ ok: false, error: "آدرس تصویر را وارد کنید." });
      if (!productName) return JSON.stringify({ ok: false, error: "نام محصول را وارد کنید." });

      const { findAndProcessProductImage } = await import("./image-intelligence");
      const result = await findAndProcessProductImage(productName, undefined, {
        category: "product",
        productId: Number(args.productId) || undefined,
      });

      return JSON.stringify({
        ok: result.success,
        message: result.message,
        steps: result.processingSteps,
        image: result.image ? {
          url: result.image.url,
          storageId: result.image.storageId,
          width: result.image.width,
          height: result.image.height,
          format: result.image.format,
          size: result.image.size,
        } : null,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا: ${e.message}` });
    }
  },

  async find_and_set_product_image(args) {
    try {
      const productName = String(args.productName || "");
      const brand = String(args.brand || "");
      if (!productName) return JSON.stringify({ ok: false, error: "نام محصول را وارد کنید." });

      const { findAndProcessProductImage } = await import("./image-intelligence");
      const result = await findAndProcessProductImage(productName, brand || undefined, {
        category: "product",
        productId: Number(args.productId) || undefined,
      });

      return JSON.stringify({
        ok: result.success,
        message: result.message,
        steps: result.processingSteps,
        image: result.image ? {
          url: result.image.url,
          storageId: result.image.storageId,
          width: result.image.width,
          height: result.image.height,
          format: result.image.format,
          size: result.image.size,
        } : null,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا: ${e.message}` });
    }
  },

  /* ─── Blog Image Agent ─── */
  async find_blog_image(args) {
    try {
      const title = String(args.title || "");
      const keywords = Array.isArray(args.keywords) ? args.keywords.map(String) : [];
      if (!title) return JSON.stringify({ ok: false, error: "عنوان بلاگ را وارد کنید." });

      const { findBlogImage } = await import("./image-intelligence");
      const result = await findBlogImage(title, keywords, {
        blogPostId: Number(args.blogPostId) || undefined,
      });

      return JSON.stringify({
        ok: result.success,
        message: result.message,
        image: result.image ? {
          url: result.image.url,
          storageId: result.image.storageId,
          width: result.image.width,
          height: result.image.height,
          format: result.image.format,
          size: result.image.size,
        } : null,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا: ${e.message}` });
    }
  },

  /* ─── Central Brain Agent ─── */
  async analyze_and_plan(args) {
    try {
      const request = String(args.request || "");
      if (!request) return JSON.stringify({ ok: false, error: "درخواست را وارد کنید." });

      const { analyzeRequest } = await import("./central-brain");
      const analysis = await analyzeRequest(request, true, Number(args.userId) || undefined);

      return JSON.stringify({
        ok: true,
        intent: analysis.intent,
        complexity: analysis.complexity,
        requiredAgents: analysis.requiredAgents,
        plan: {
          summary: analysis.plan.summary,
          taskCount: analysis.plan.tasks.length,
          estimatedComplexity: analysis.plan.estimatedComplexity,
          requiresConfirmation: analysis.plan.requiresConfirmation,
          tasks: analysis.plan.tasks.map(t => ({
            id: t.id,
            type: t.type,
            description: t.description,
            assignedAgent: t.assignedAgent,
            priority: t.priority,
            dependsOn: t.dependsOn,
          })),
        },
        relevantMemoryCount: analysis.relevantMemories.length,
        confidence: analysis.confidence,
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا: ${e.message}` });
    }
  },

  async search_memory(args) {
    try {
      const query = String(args.query || "");
      if (!query) return JSON.stringify({ ok: false, error: "عبارت جستجو را وارد کنید." });

      const { searchMemory } = await import("./central-brain");
      const results = await searchMemory(query);

      return JSON.stringify({
        ok: true,
        shortTermCount: results.shortTerm.length,
        longTermCount: results.longTerm.length,
        memories: {
          shortTerm: results.shortTerm.map(m => ({
            key: m.key,
            content: m.content.slice(0, 200),
            category: m.category,
            confidence: m.confidence,
          })),
          longTerm: results.longTerm.map(m => ({
            key: m.key,
            content: m.content.slice(0, 200),
            category: m.category,
            confidence: m.confidence,
          })),
        },
      });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: `خطا: ${e.message}` });
    }
  },
};

/** اجرای یک tool call و برگرداندن نتیجه */
export async function executeToolCall(toolName: string, args: Record<string, unknown>, context: ToolContext): Promise<string> {
  const adminTools = new Set([
    "create_product", "update_price", "create_blog_post", "create_slide",
    "get_sales_report", "check_inventory",
    "search_product_image", "process_product_image", "find_and_set_product_image",
    "find_blog_image", "analyze_and_plan", "search_memory",
  ]);
  const mutatingTools = new Set([
    "create_product", "update_price", "create_blog_post", "create_slide",
    "find_and_set_product_image", "process_product_image", "find_blog_image",
  ]);
  if (adminTools.has(toolName) && !context.isAdmin) return JSON.stringify({ ok: false, error: "دسترسی این ابزار فقط برای مدیر مجاز است." });
  const moduleByTool: Partial<Record<string, AdminModule>> = {
    create_product: "products", update_price: "products", check_inventory: "products",
    create_blog_post: "blog", create_slide: "slides", get_sales_report: "dashboard",
    search_product_image: "products", process_product_image: "products",
    find_and_set_product_image: "products", find_blog_image: "blog",
    analyze_and_plan: "dashboard", search_memory: "dashboard",
  };
  const requiredModule = moduleByTool[toolName];
  if (requiredModule && (!context.userId || !context.adminRole || !await hasModuleAccess(context.userId, context.adminRole, requiredModule))) {
    return JSON.stringify({ ok: false, error: "شما مجوز اجرای این عملیات مدیریتی را ندارید." });
  }
  if (mutatingTools.has(toolName) && !context.confirmed) {
    return JSON.stringify({ ok: false, confirmationRequired: true, error: "قبل از انجام این تغییر، خلاصه عملیات را نمایش بده و از کاربر بخواه عبارت «تأیید نهایی» را بفرستد." });
  }
  if (toolName === "track_order" && !context.userId) return JSON.stringify({ ok: false, error: "برای پیگیری سفارش باید وارد حساب شوید." });
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) return JSON.stringify({ ok: false, error: `ابزار "${toolName}" پیاده‌سازی نشده است.` });
  try {
    return await handler(args, context);
  } catch (e: any) {
    return JSON.stringify({ ok: false, error: `خطا در اجرای ${toolName}: ${e.message}` });
  }
}

/** چک کردن آیا tool name معتبره */
export function hasToolHandler(toolName: string): boolean {
  return toolName in TOOL_HANDLERS;
}