import OpenAI from "openai";
import { getSetting } from "./settings";
import { db } from "@/db";
import { products, productVariants, blogPosts, slides } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";

// ─── Types ───

export type AiProvider = "openai" | "groq" | "gemini" | "custom";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // برای APIهای سازگار با OpenAI
}

export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

// ─── خواندن تنظیمات هوش مصنوعی ───

export async function getAiConfig(task: "chat" | "seo" | "vision" = "chat"): Promise<AiConfig | null> {
  const prefix = task === "chat" ? "ai.chat" : task === "seo" ? "ai.seo" : "ai.vision";
  const provider = await getSetting<string>(`${prefix}.provider`, "ai");
  const apiKey = await getSetting<string>(`${prefix}.api_key`, "ai");
  const model = await getSetting<string>(`${prefix}.model`, "ai");
  const baseUrl = await getSetting<string>(`${prefix}.base_url`, "ai");

  if (!apiKey) return null;

  return {
    provider: (provider as AiProvider) || "openai",
    apiKey,
    model: model || "gpt-4o-mini",
    baseUrl: baseUrl || undefined,
  };
}

// ─── ساخت客户端 OpenAI ───

function createClient(config: AiConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
  });
}

// ─── تعریف ابزارهای قابل فراخوانی توسط هوش مصنوعی ───

export const AI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
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
    type: "function",
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
    type: "function",
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
    type: "function",
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
        const [totalProducts] = await db.select({ value: count() }).from(products);
        const [totalVariants] = await db.select({ value: count() }).from(productVariants);
        const recentProducts = await db.select({ id: products.id, title: products.title }).from(products).orderBy(desc(products.createdAt)).limit(5);
        return JSON.stringify({
          totalProducts: totalProducts?.value || 0,
          totalVariants: totalVariants?.value || 0,
          recentProducts: recentProducts.map(p => p.title),
          period,
          note: "گزارش کامل فروش در داشبورد قابل مشاهده است",
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
    const client = createClient(config);
    const systemPrompt = `تو یک دستیار هوشمند برای پنل مدیریت فروشگاه "درنیکا ساحل" هستی.
    تو می‌توانی:
    - محصول جدید با تنوع‌های مختلف ایجاد کنی (create_product)
    - پست بلاگ بنویسی (create_blog_post)
    - اسلاید برای صفحه اصلی بسازی (create_slide)
    - گزارش فروش بدهی (get_sales_report)

    همیشه به فارسی صحبت کن و پاسخ‌های حرفه‌ای و مختصر بده.
    اگر کاربر درخواست ساخت چیزی را داشت، از ابزار مربوطه استفاده کن.
    قبل از اجرای هر ابزار، خلاصه‌ای از کاری که می‌خواهی انجام بده به کاربر بگو.`;

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools: AI_TOOLS,
      tool_choice: "auto",
      max_tokens: 2000,
    });

    const choice = response.choices[0];
    const reply = choice.message;

    // اگر هوش مصنوعی می‌خواهد ابزاری را فراخوانی کند
    if (reply.tool_calls && reply.tool_calls.length > 0) {
      const results: string[] = [];

      for (const tc of reply.tool_calls) {
        if (tc.type === "function") {
          let parsedArgs: Record<string, unknown>;
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = {};
          }
          const result = await executeToolCall({ name: tc.function.name, arguments: parsedArgs });
          results.push(`نتیجه ${tc.function.name}: ${result}`);
        }
      }

      // ارسال نتیجه به هوش مصنوعی برای پاسخ نهایی
      const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages,
        reply as OpenAI.Chat.Completions.ChatCompletionMessageParam,
      ];

      // افزودن نتایج ابزارها
      for (const tc of reply.tool_calls) {
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: results.join("\n") || "عملیات انجام شد.",
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
      }

      const finalResponse = await client.chat.completions.create({
        model: config.model,
        messages: toolMessages,
        max_tokens: 1000,
      });

      return {
        ok: true,
        reply: finalResponse.choices[0].message.content || "عملیات با موفقیت انجام شد.",
        toolResults: results,
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
