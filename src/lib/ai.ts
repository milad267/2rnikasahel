// import OpenAI from "openai"; // Dynamic import in function
import { getSetting } from "./settings";
import { db } from "@/db";
import { products, productVariants, blogPosts, slides, orders, users } from "@/db/schema";
import { desc, sql, count, gte, and, ne } from "drizzle-orm";
import { trackedChatCompletion } from "@/lib/ai-usage";

// ─── Types ───

export type AiProvider = "openai" | "groq" | "gemini" | "custom";

/** همه نقش‌های agent که میتونن API Key جداگانه داشته باشن */
export type AiTaskRole =
  | "chat" | "seo" | "vision"
  | "product" | "content" | "analytics" | "support"
  | "data" | "marketing" | "orders" | "inventory"
  | "customer" | "translator" | "code" | "telegram" | "router"
  | "image-editor" | "central-brain" | "image-intelligence" | "blog-image";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

// ─── خواندن تنظیمات هوش مصنوعی ───

/** نقشه prefixهای تنظیمات برای هر role */
const ROLE_PREFIX_MAP: Record<string, string> = {
  chat: "ai.chat",
  seo: "ai.seo",
  vision: "ai.vision",
  product: "ai.product",
  content: "ai.content",
  analytics: "ai.analytics",
  support: "ai.support",
  data: "ai.data",
  marketing: "ai.marketing",
  orders: "ai.orders",
  inventory: "ai.inventory",
  customer: "ai.customer",
  translator: "ai.translator",
  code: "ai.code",
  telegram: "ai.telegram",
  router: "ai.router",
  "central-brain": "ai.central-brain",
  "image-intelligence": "ai.image-intelligence",
  "blog-image": "ai.blog-image",
};

export async function getAiConfig(task: string = "chat"): Promise<AiConfig | null> {
  const prefix = ROLE_PREFIX_MAP[task] || `ai.${task}`;

  const [provider, apiKey, model, baseUrl] = await Promise.all([
    getSetting<string>(`${prefix}.provider`, "ai"),
    getSetting<string>(`${prefix}.api_key`, "ai"),
    getSetting<string>(`${prefix}.model`, "ai"),
    getSetting<string>(`${prefix}.base_url`, "ai"),
  ]);

  // اگر API Key برای این role تنظیم نشده، از تنظیمات chat (عمومی) استفاده کن
  if (!apiKey && task !== "chat") {
    const chatCfg = await getAiConfig("chat");
    if (chatCfg?.apiKey) return chatCfg;
  }

  if (!apiKey) return null;

  return {
    provider: (provider as AiProvider) || "openai",
    apiKey,
    model: model || "gpt-4o-mini",
    baseUrl: baseUrl || undefined,
  };
}

// ─── ساخت客户端 OpenAI ───

async function createClient(config: AiConfig) {
  const { default: OpenAI } = await import("openai");
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
  });
}

// ─── تعریف ابزارهای قابل فراخوانی توسط هوش مصنوعی ───

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_product",
      description: "ایجاد یک محصول جدید در فروشگاه با تنوع‌های مختلف",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "نام محصول" },
          slug: { type: "string", description: "slug محصول (اختیاری، اگر ندهید از title ساخته می‌شود)" },
          subtitle: { type: "string", description: "زیرعنوان / توضیح کوتاه" },
          description: { type: "string", description: "توضیحات کامل محصول" },
          categoryId: { type: "number", description: "شناسه دسته‌بندی" },
          price: { type: "string", description: "قیمت پایه به ریال" },
          stock: { type: "string", description: "موجودی" },
          coverImage: { type: "string", description: "آدرس تصویر شاخص" },
          isActive: { type: "boolean", description: "فعال بودن محصول" },
          variants: {
            type: "array",
            description: "تنوع‌های محصول (مثلاً رنگ‌ها، سایزها)",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "نام تنوع" },
                sku: { type: "string", description: "کد SKU" },
                price: { type: "string", description: "قیمت به ریال" },
                stock: { type: "string", description: "موجودی" },
              },
              required: ["name", "price"],
            },
          },
        },
        required: ["title", "price"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_blog_post",
      description: "ایجاد یک پست بلاگ جدید با محتوای تولید شده",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان پست" },
          slug: { type: "string", description: "slug پست" },
          excerpt: { type: "string", description: "خلاصه پست" },
          content: { type: "string", description: "محتوای کامل HTML پست" },
          categoryId: { type: "number", description: "شناسه دسته بلاگ" },
          metaTitle: { type: "string", description: "عنوان SEO" },
          metaDesc: { type: "string", description: "توضیحات SEO" },
          status: { type: "string", enum: ["draft", "published"], description: "وضعیت انتشار" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_slide",
      description: "ایجاد اسلاید جدید برای اسلایدر صفحه اصلی",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان اسلاید" },
          subtitle: { type: "string", description: "زیرعنوان" },
          buttonText: { type: "string", description: "متن دکمه" },
          buttonLink: { type: "string", description: "لینک دکمه" },
          desktopImage: { type: "string", description: "آدرس تصویر دسکتاپ" },
          isActive: { type: "boolean", description: "فعال بودن اسلاید" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_sales_report",
      description: "دریافت گزارش فروش و آمار کلی فروشگاه",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "week", "month", "all"],
            description: "دوره زمانی گزارش",
          },
        },
        required: ["period"],
      },
    },
  },
];

// ─── اجرای ابزارها ───

export async function executeToolCall(toolCall: AiToolCall): Promise<string> {
  const args = toolCall.arguments;

  switch (toolCall.name) {
    case "get_sales_report": {
      const period = String(args.period || "all");
      try {
        const now = new Date();
        const start = new Date(now);
        if (period === "today") start.setHours(0, 0, 0, 0);
        else if (period === "week") start.setDate(start.getDate() - 7);
        else if (period === "month") start.setMonth(start.getMonth() - 1);
        const orderFilter = period === "all" ? ne(orders.status, "cancelled") : and(ne(orders.status, "cancelled"), gte(orders.createdAt, start));
        const [totalProducts] = await db.select({ value: count() }).from(products);
        const [totalVariants] = await db.select({ value: count() }).from(productVariants);
        const [totalUsers] = await db.select({ value: count() }).from(users);
        const [sales] = await db.select({
          ordersCount: count(),
          totalSales: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        }).from(orders).where(orderFilter);
        const recentProducts = await db.select({ id: products.id, title: products.title }).from(products).orderBy(desc(products.createdAt)).limit(5);
        return JSON.stringify({
          totalProducts: totalProducts?.value || 0,
          totalVariants: totalVariants?.value || 0,
          totalUsers: totalUsers?.value || 0,
          ordersCount: sales?.ordersCount || 0,
          totalSalesRial: sales?.totalSales || "0",
          recentProducts: recentProducts.map(p => p.title),
          period,
        });
      } catch (e) {
        return JSON.stringify({ error: "خطا در دریافت آمار" });
      }
    }

    case "create_product": {
      const user = await import("@/lib/auth").then(m => m.getCurrentUser());
      if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
        return JSON.stringify({ error: "دسترسی غیرمجاز برای ساخت محصول" });
      }
      try {
        const slug = String(args.slug || String(args.title).replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase());
        const [created] = await db.insert(products).values({
          title: String(args.title),
          slug,
          subtitle: String(args.subtitle || "") || null,
          description: String(args.description || "") || null,
          categoryId: Number(args.categoryId) || null,
          coverImage: String(args.coverImage || "") || null,
          isActive: args.isActive !== false,
        }).returning();

        // ایجاد تنوع‌ها
        if (Array.isArray(args.variants) && created) {
          for (const v of args.variants) {
            await db.insert(productVariants).values({
              productId: created.id,
              name: String(v.name),
              sku: String(v.sku || `${slug}-${v.name}`),
              price: String(v.price),
              stock: Number(v.stock) || 0,
              isActive: true,
            });
          }
        }

        return JSON.stringify({ ok: true, product: { id: created.id, title: created.title, slug: created.slug, variantsCount: Array.isArray(args.variants) ? args.variants.length : 0 } });
      } catch (e: any) {
        return JSON.stringify({ error: `خطا در ساخت محصول: ${e.message}` });
      }
    }

    case "create_blog_post": {
      const user = await import("@/lib/auth").then(m => m.getCurrentUser());
      if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
        return JSON.stringify({ error: "دسترسی غیرمجاز" });
      }
      try {
        const slug = String(args.slug || String(args.title).replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase());
        const [created] = await db.insert(blogPosts).values({
          title: String(args.title),
          slug,
          excerpt: String(args.excerpt || "") || null,
          content: String(args.content),
          categoryId: Number(args.categoryId) || null,
          metaTitle: String(args.metaTitle || "") || null,
          metaDesc: String(args.metaDesc || "") || null,
          status: args.status === "published" ? "published" : "draft",
          authorId: user.id,
        }).returning();
        return JSON.stringify({ ok: true, post: { id: created.id, title: created.title, slug: created.slug, status: created.status } });
      } catch (e: any) {
        return JSON.stringify({ error: `خطا در ساخت پست: ${e.message}` });
      }
    }

    case "create_slide": {
      const user = await import("@/lib/auth").then(m => m.getCurrentUser());
      if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
        return JSON.stringify({ error: "دسترسی غیرمجاز" });
      }
      try {
        const [created] = await db.insert(slides).values({
          title: String(args.title),
          subtitle: String(args.subtitle || "") || null,
          buttonText: String(args.buttonText || "مشاهده") || null,
          buttonLink: String(args.buttonLink || "#") || null,
          desktopImage: String(args.desktopImage || "") || null,
          isActive: args.isActive !== false,
        }).returning();
        return JSON.stringify({ ok: true, slide: { id: created.id, title: created.title } });
      } catch (e: any) {
        return JSON.stringify({ error: `خطا در ساخت اسلاید: ${e.message}` });
      }
    }

    default:
      return JSON.stringify({ error: `ابزار ناشناخته: ${toolCall.name}` });
  }
}

// ─── ارسال پیام به هوش مصنوعی ───

export async function chatWithAI(messages: { role: "user" | "assistant" | "system"; content: string }[]) {
  const config = await getAiConfig("chat");
  if (!config) {
    return {
      ok: false,
      error: "هوش مصنوعی پیکربندی نشده است. لطفاً از صفحه تنظیمات AI یک provider فعال انتخاب کنید.",
    };
  }

  try {
    const client = await createClient(config);
    const currentUser = await import("@/lib/auth").then(module => module.getCurrentUser()).catch(() => null);
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const mutationConfirmed = /(?:تأیید|تایید)\s+نهایی/.test(lastUserMessage);
    const availableTools = mutationConfirmed
      ? AI_TOOLS
      : AI_TOOLS.filter((tool) => tool.function.name === "get_sales_report");
    const systemPrompt = `تو یک دستیار هوشمند و کاملاً مستقل برای پنل مدیریت فروشگاه "درنیکا ساحل" هستی.

    وظایف و قابلیت‌های تو:
    
    ۱. **مدیریت محصولات:**
    - محصول جدید با تنوع (واحد، قیمت، موجودی، SKU) ایجاد کن
    - تحلیل لیست محصولات از متن، فایل یا تصویر
    - تشخیص خودکار تنوع‌ها از توضیحات
    
    ۲. **مدیریت بلاگ:**
    - نوشتن پست بلاگ با موضوع دلخواه
    - تولید خودکار محتوای سئو شده
    
    ۳. **مدیریت اسلایدر:**
    - ساخت اسلاید جدید برای صفحه اصلی
    
    ۴. **گزارش و آمار:**
    - گزارش فروش و آمار کلی فروشگاه
    - تعداد محصولات، سفارشات، کاربران
    
    ۵. **پشتیبانی:**
    - راهنمایی در مورد بخش‌های مختلف پنل
    - پاسخ به سوالات کاربر درباره فروشگاه
    - تحلیل پیام‌های کاربران
    
    **نحوه کار کردن با تو:**
    - هر نوع درخواست کاربر را به طور طبیعی بفهم و تحلیل کن
    - اگه کاربر چیز نامشخصی گفت، سوال بپرس تا دقیق بفهمی چی می‌خواهد
    - برای ساخت محصول، بلاگ یا اسلاید ابتدا خلاصه دقیق عملیات را نشان بده و از کاربر بخواه عبارت «تأیید نهایی» را ارسال کند
    - تا وقتی پیام فعلی کاربر شامل «تأیید نهایی» نیست هیچ عملیات تغییردهنده‌ای اجرا نکن
    - همیشه به فارسی حرفه‌ای و مختصر پاسخ بده
    - بعد از اجرای هر ابزار، نتیجه رو به کاربر اطلاع بده
    - اگه کاربر سوالی پرسید که مربوط به فروشگاه نیست، مودبانه بگو نمی‌توانی کمک کنی
    - اگه کاربر درخواست حذف یا تغییر حساس داشت، قبلش تأیید بگیر`;

    const response: any = await trackedChatCompletion(client, {
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools: availableTools,
      tool_choice: "auto",
      max_tokens: 4000,
      timeout: 60_000,
    }, { agent: "chat", task: "admin-chat", provider: config.provider, model: config.model, userId: currentUser?.id, isAdmin: true });

    const choice = response.choices[0];
    const reply = choice.message;

    // اگر هوش مصنوعی می‌خواهد ابزاری را فراخوانی کند
    if (reply.tool_calls && reply.tool_calls.length > 0) {
      const results = new Map<string, string>();

      for (const tc of reply.tool_calls) {
        if (tc.type === "function") {
          let parsedArgs: Record<string, unknown>;
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = {};
          }
          const result = await executeToolCall({ name: tc.function.name, arguments: parsedArgs });
          results.set(tc.id, `نتیجه ${tc.function.name}: ${result}`);
        }
      }

      // ارسال نتیجه به هوش مصنوعی برای پاسخ نهایی
      const toolMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...messages,
        reply,
      ];

      // افزودن نتایج ابزارها
      for (const tc of reply.tool_calls || []) {
        toolMessages.push({
          role: "tool" as any,
          tool_call_id: tc.id,
          content: results.get(tc.id) || "عملیات انجام نشد.",
        });
      }

      const finalResponse: any = await trackedChatCompletion(client, {
        model: config.model,
        messages: toolMessages,
        max_tokens: 1000,
        timeout: 30_000,
      }, { agent: "chat", task: "admin-chat:tool-result", provider: config.provider, model: config.model, userId: currentUser?.id, isAdmin: true });

      return {
        ok: true,
        reply: finalResponse.choices[0].message.content || "عملیات با موفقیت انجام شد.",
        toolResults: Array.from(results.values()),
      };
    }

    return {
      ok: true,
      reply: reply.content || "پاسخی دریافت نشد.",
    };
  } catch (error: any) {
    console.error("[AI_CHAT_ERROR]", error);
    return {
      ok: false,
      error: error.message || "خطا در ارتباط با سرویس هوش مصنوعی",
    };
  }
}
