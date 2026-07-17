/**
 * 🔀 ROUTER — مغز مرکزی سیستم Multi-Agent
 *
 * وظایف:
 * ۱. تحلیل intent کاربر (با AI یا keyword-based fallback)
 * ۲. انتخاب agentهای مناسب
 * ۳. نوشتن prompt دقیق برای هر agent
 * ۴. اجرای موازی یا ترتیبی agentها
 * ۵. جمع‌آوری نتایج و پاسخ نهایی
 * ۶. مدیریت حافظه و یادگیری
 * ۷. کنترل سطح دسترسی (admin vs user)
 */
import { getAiConfig } from "@/lib/ai";
import { getAgent, isPublicRole, AGENT_REGISTRY } from "./registry";
import { executeToolCall } from "./tool-handlers";
import { db } from "@/db";
import { siteSettings, assistantSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { AgentRole, AgentResult, RouterIntent } from "./types";
import { trackedChatCompletion } from "@/lib/ai-usage";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CHAT_STORAGE } from "@/lib/storage-paths";
import { hasModuleAccess } from "@/lib/admin-permissions-server";

export type RouterAttachment = {
  name: string;
  type: string;
  mimeType: string;
  size: number;
  storageId: string;
  url: string;
};

/** چک پرمیژن agent برای یه ادمین خاص (سوپرادمین همیشه همه رو داره) */
async function checkAgentPermission(userId: number | undefined, role: AgentRole, isAdmin: boolean): Promise<boolean> {
  if (!userId) return isPublicRole(role); // کاربر مهمان
  if (!isAdmin) return isPublicRole(role); // کاربر عادی
  try {
    const [row] = await db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, `ai.agent_permissions.${userId}`), eq(siteSettings.group, "ai")))
      .limit(1);
    if (row?.value) {
      const perms = row.value as Record<string, boolean>;
      return perms[role] !== false;
    }
    return true; // پرمیژنی تنظیم نشده = همه مجاز
  } catch { return true; }
}

/* ──────────────────────────────────────────────
   حافظه مبتنی بر دیتابیس
   ────────────────────────────────────────────── */

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 ساعت

function getSessionKey(userId?: number, sessionId?: string): string {
  // شناسه کاربر اولویت دارد، در غیر این صورت از شناسه سشن استفاده می‌شود.
  // اگر هیچکدام نبود، یک شناسه برای کاربر مهمان در نظر گرفته می‌شود.
  if (userId) return `user:${userId}`;
  if (sessionId) return `session:${sessionId}`;
  return "anon:default";
}

async function remember(key: string, messages: { role: string; content: string }[], intent?: RouterIntent) {
  try {
    const sessionData = {
      messages: messages.slice(-20), // همیشه ۲۰ پیام آخر را نگه دار
      lastIntent: intent,
      updatedAt: new Date(),
    };

    await db
      .insert(assistantSessions)
      .values({
        sessionId: key,
        messages: sessionData.messages,
        updatedAt: sessionData.updatedAt,
      })
      .onConflictDoUpdate({
        target: assistantSessions.sessionId,
        set: {
          messages: sessionData.messages,
          updatedAt: sessionData.updatedAt,
        },
      });
  } catch (error) {
    console.error("Error in remember():", error);
  }
}

async function recall(key: string): Promise<{ messages: any[]; lastIntent?: any; updatedAt: Date } | undefined> {
  try {
    const [session] = await db
      .select()
      .from(assistantSessions)
      .where(eq(assistantSessions.sessionId, key))
      .limit(1);

    if (session && Date.now() - new Date(session.updatedAt).getTime() <= SESSION_TTL) {
      return {
        messages: session.messages || [],
        // `lastIntent` در این نسخه در دیتابیس ذخیره نمی‌شود، اما ساختار تابع حفظ شده
        updatedAt: session.updatedAt,
      };
    }
    // اگر سشن منقضی شده، حذفش کن
    if (session) {
      await db.delete(assistantSessions).where(eq(assistantSessions.sessionId, key));
    }
    return undefined;
  } catch (error) {
    console.error("Error in recall():", error);
    return undefined;
  }
}

/* ──────────────────────────────────────────────
   Intent Analysis (تحلیل نیت کاربر)
   ────────────────────────────────────────────── */

interface IntentResult {
  agents: AgentRole[];
  mode: "sequential" | "parallel";
  instructions: Record<string, string>;
  summary: string;
}

/**
 * تحلیل intent با AI (در صورت موجود بودن API Key)
 * یا fallback به keyword matching
 */
async function analyzeIntent(
  message: string,
  isAdmin: boolean,
  userId?: number,
  sessionId?: string,
  attachments: RouterAttachment[] = [],
): Promise<IntentResult> {
  const key = getSessionKey(userId, sessionId);

  // تلاش با AI برای تشخیص intent
  try {
    const config = await getAiConfig("router");
    if (config?.apiKey) {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl || undefined, timeout: 30_000, maxRetries: 1 });

      const agentList = AGENT_REGISTRY
        .filter(a => a.role !== "router" && (isAdmin || isPublicRole(a.role)))
        .map(a => `- **${a.role}**: ${a.desc}`).join("\n");

      const history = (await recall(key))?.messages || [];

      const routerModel = config.model || "gpt-4o-mini";
      const response: any = await trackedChatCompletion(client, {
        model: routerModel,
        messages: [
          {
            role: "system",
            content: `تو تحلیلگر intent یک فروشگاه صنعتی هستی. پیام کاربر رو تحلیل کن و تعیین کن کدام agentهای تخصصی باید پاسخ بدن.

agentهای موجود${isAdmin ? " (همه در دسترس)" : " (فقط عمومی‌ها)"}:
${agentList}

**قوانین:**
۱. فقط agentهایی رو انتخاب کن که واقعاً نیازن. برای سوالات ساده ۱ agent کافیه.
۲. برای هر agent یه دستورالعمل دقیق به فارسی بنویس — دقیقاً بگو چه چیزی رو باید استخراج/انجام بده.
۳. اگه کاربر عکس یا فایل فرستاده، vision یا data agent رو حتماً صدا بزن.
۴. mode: "parallel" برای agentهای مستقل، "sequential" برای وابسته.

**خروجی فقط JSON با این ساختار:**
{
  "agents": ["support"],
  "mode": "sequential",
  "instructions": {
    "support": "دستورالعمل دقیق به فارسی..."
  },
  "summary": "خلاصه یک خطی از intent کاربر"
}`,
          },
          ...history.slice(-8),
          { role: "user", content: `پیام کاربر: ${message}\nپیوست‌ها: ${attachments.map(file => `${file.name} (${file.type})`).join("، ") || "ندارد"}` },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }, { agent: "router", task: "intent", provider: config.provider, model: routerModel, userId, isAdmin });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      if (result.agents?.length) {
        // فیلتر agentهای غیرمجاز برای کاربران عادی
        const allowedAgents = isAdmin
          ? result.agents
          : result.agents.filter((r: string) => isPublicRole(r));

        const isSimpleConversation = /^(سلام|درود|خوبی|چه خبر|hello|hi|hey)[\s؟?!,.،]*$/i.test(message.trim());
        const boundedAgents = (allowedAgents.length > 0 ? allowedAgents : ["support"])
          .slice(0, isSimpleConversation ? 1 : (isAdmin ? 3 : 2));

        return {
          agents: boundedAgents,
          mode: result.mode || "sequential",
          instructions: result.instructions || {},
          summary: result.summary || "پاسخ به سوال کاربر",
        };
      }
    }
  } catch { /* fallback to keyword matching */ }

  // Fallback: keyword-based intent detection
  return keywordIntent(message, isAdmin);
}

/** Fallback keyword-based intent detection */
function keywordIntent(message: string, isAdmin: boolean): IntentResult {
  const lower = message;
  const agents: AgentRole[] = [];
  const instructions: Record<string, string> = {};

  if (/آپدیت قیمت|بروزرسانی قیمت|قیمت.*اکسل|price update|update price|آپدیت.*اکسل/i.test(lower)) {
    agents.push("product");
    instructions.product = "کاربر می‌خواهد قیمت‌ها را به صورت فله از طریق فایل اکسل به‌روزرسانی کند. به ادمین بگو: به صفحه مدیریت محصولات برود و روی دکمه «آپدیت قیمت (اکسل)» کلیک کند. فایل باید ستون‌های CODE/SKU و PRICE/قیمت داشته باشد. همچنین می‌تواند درصد افزایش/کاهش کلی اعمال کند.";
  }
  if (/محصول|ایجاد|ساخت|اضافه|import|واردات|لیست قیمت|اکسل|excel/i.test(lower)) {
    agents.push("product");
    instructions.product = "محصولات جدید را از اطلاعات داده شده ایجاد کن. نام، قیمت، تنوع‌ها و SKU را استخراج کن.";
  }
  if (/بلاگ|مقاله|پست|بنویس|محتوا|توضیح/i.test(lower)) {
    agents.push("content");
    instructions.content = "محتوای درخواستی را به فارسی حرفه‌ای و سئو شده بنویس.";
  }
  if (/گزارش|آمار|فروش|نمودار|تحلیل/i.test(lower)) {
    agents.push("analytics");
    instructions.analytics = "گزارش آماری درخواستی را تهیه کن.";
  }
  if (/عکس|تصویر|فاکتور|عکس فاکتور|ببین|نگاه|ocr|خواندن/i.test(lower) && !/حذف پس‌زمینه|remove.bg|resize|تغییر سایز|فشرده|webp|optimize|ویرایش عکس/i.test(lower)) {
    agents.push("vision");
    instructions.vision = `این تصویر را تحلیل کن و هر اطلاعات قابل مشاهده را استخراج کن:
- اگر فاکتور است: نام محصولات، قیمت، تعداد، تاریخ، شماره فاکتور
- اگر محصول است: نام، برند، مشخصات فنی قابل مشاهده
- هر عدد یا متن خوانا را دقیقاً ثبت کن`;
  }
  if (/حذف پس‌زمینه|remove.bg|removebg|تغییر سایز|resize|فشرده|webp|optimize|ویرایش عکس|edit.*image|برش عکس|کادر/i.test(lower)) {
    agents.push("image-editor");
    instructions["image-editor"] = "تصویر مورد نظر کاربر را با ابزار مناسب ویرایش کن. اگر نیاز به حذف پس‌زمینه است از remove_background، برای تغییر سایز از resize_image و برای بهینه‌سازی از optimize_image استفاده کن.";
  }
  if (/pdf|داده|data|جدول|ستون|اکسل|فایل/i.test(lower)) {
    agents.push("data");
    instructions.data = "داده‌های دریافتی را تحلیل کن، ساختار را تشخیص بده و برای import آماده کن.";
  }
  if (/رقبا|بازاریابی|کمپین|تبلیغ|تخفیف|استراتژی/i.test(lower)) {
    agents.push("marketing");
    instructions.marketing = "تحلیل بازاریابی و پیشنهادات استراتژیک را ارائه بده.";
  }
  if (/سفارش|پیگیری|فاکتور سفارش|وضعیت سفارش|پرداخت/i.test(lower)) {
    agents.push("orders");
    instructions.orders = "وضعیت سفارش را پیگیری کن و اطلاعات کامل را ارائه بده.";
  }
  if (/سئو|seo|کلمه کلیدی|متا|رتبه|گوگل/i.test(lower)) {
    agents.push("seo");
    instructions.seo = "تحلیل و پیشنهادات سئو را ارائه بده.";
  }
  if (/موجودی|انبار|کمبود|موجود|stock/i.test(lower)) {
    agents.push("inventory");
    instructions.inventory = "وضعیت موجودی را بررسی کن و گزارش بده.";
  }
  if (/ترجمه|translate|انگلیسی|فارسی|معنی/i.test(lower)) {
    agents.push("translator");
    instructions.translator = "متن را به فارسی/انگلیسی ترجمه کن با حفظ اصطلاحات تخصصی.";
  }
  if (/کد|css|html|sql|اسکریپت|برنامه/i.test(lower) && isAdmin) {
    agents.push("code");
    instructions.code = "کد درخواستی را تولید کن.";
  }
  if (/تلگرام|ربات|webhook|bot/i.test(lower) && isAdmin) {
    agents.push("telegram");
    instructions.telegram = "تنظیمات و راهنمایی ربات تلگرام را ارائه بده.";
  }

  // Default: one conversational agent is enough; product tools are available to support when needed.
  if (agents.length === 0) {
    agents.push("support");
    instructions.support = "به سوال کاربر پاسخ بده و راهنمایی کن.";
  }

  return {
    agents: agents.filter(a => isAdmin || isPublicRole(a)),
    mode: agents.length > 2 ? "parallel" : "sequential",
    instructions,
    summary: "پاسخ به سوال کاربر",
  };
}

/* ──────────────────────────────────────────────
   اجرای Agent تخصصی
   ────────────────────────────────────────────── */

async function executeAgent(
  role: AgentRole,
  instruction: string,
  context: { message: string; history?: { role: string; content: string }[]; fileContent?: string; attachments?: RouterAttachment[]; priorResults?: string; userId?: number; isAdmin: boolean; adminRole?: string },
): Promise<AgentResult> {
  const agentDef = getAgent(role);
  if (!agentDef) return { role, success: false, result: "", error: "agent نامعتبر", latencyMs: 0 };

  const started = Date.now();

  try {
    const config = await getAiConfig(role as any);
    if (config?.apiKey) {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || undefined,
        timeout: 60_000,
        maxRetries: 1,
      });

      const systemMsg = `${agentDef.systemPrompt}\n\nکاربر ${context.fileContent ? "فایلی آپلود کرده" : "پیامی فرستاده"} با این دستورالعمل دقیق از طرف روتر:\n"${instruction}"\n\nفقط وظیفه‌ای که بهت محول شده رو انجام بده. اگه نیاز به عملیات واقعی (مثل ساخت محصول) داری، از ابزارهات استفاده کن. خروجی نهایی رو به فارسی و مختصر بنویس.`;

      const fileLimit = role === "product" || role === "data" ? 30_000 : 5_000;
      const textPrompt = `پیام کاربر: ${context.message}\n${context.fileContent ? `محتوای فایل:\n${context.fileContent.slice(0, fileLimit)}` : ""}${context.priorResults ? `\nنتیجه ایجنت‌های قبلی:\n${context.priorResults}` : ""}`;
      let userContent: any = textPrompt;
      const imageAttachments = (context.attachments || []).filter(file => file.type === "image" && /^[a-f0-9]{48}\.[a-z0-9]{1,10}$/.test(file.storageId));
      if ((role === "vision" || role === "image-editor") && imageAttachments.length > 0) {
        const imageParts: any[] = [];
        for (const attachment of imageAttachments.slice(0, 5)) {
          const source = await readFile(path.join(CHAT_STORAGE, attachment.storageId));
          const sharp = (await import("sharp")).default;
          const optimized = await sharp(source, { animated: false }).rotate().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
          imageParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${optimized.toString("base64")}`, detail: "high" } });
        }
        userContent = [{ type: "text", text: textPrompt }, ...imageParts];
      }

      const messages: any[] = [
        { role: "system", content: systemMsg },
        ...(context.history || []).slice(-10).map(item => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content.slice(0, 4000) })),
        { role: "user", content: userContent },
      ];

      // درخواست اول
      const model = config.model || agentDef.recommendModels[0];
      let response: any = await trackedChatCompletion(client, {
        model,
        messages: messages as any,
        tools: agentDef.tools.length > 0
          ? agentDef.tools.map(t => ({ type: "function" as const, function: t }))
          : undefined,
        tool_choice: agentDef.tools.length > 0 ? "auto" as const : undefined,
        max_tokens: 2000,
      }, { agent: role, task: role, provider: config.provider, model, userId: context.userId, isAdmin: context.isAdmin });

      let choice = response.choices[0];
      let finalReply = choice?.message?.content || "";
      const generatedAttachments: RouterAttachment[] = [];

      // اگر AI خواست tool اجرا کنه، واقعاً اجراش کن
      let loopCount = 0;
      while (choice?.message?.tool_calls && choice.message.tool_calls.length > 0 && loopCount < 5) {
        loopCount++;
        const toolCalls = choice.message.tool_calls;

        // اضافه کردن پاسخ AI با tool_calls به messages
        messages.push(choice.message);

        // اجرای واقعی هر tool و اضافه کردن نتیجه
        for (const tc of toolCalls) {
          if (tc.type !== "function") continue;
          let parsedArgs: Record<string, unknown> = {};
          try { parsedArgs = JSON.parse(tc.function.arguments); } catch { parsedArgs = {}; }
          if (role === "image-editor" && imageAttachments[0]) {
            parsedArgs.imageUrl = imageAttachments[0].storageId;
          }
          const result = await executeToolCall(tc.function.name, parsedArgs, {
            userId: context.userId,
            isAdmin: context.isAdmin,
            adminRole: context.adminRole,
            confirmed: /(?:تأیید|تایید)\s+نهایی/.test(context.message),
          });
          try {
            const generated = JSON.parse(result);
            if (generated?.storageId && generated?.url) {
              const ext = String(generated.storageId).split(".").pop()?.toLowerCase() || "png";
              generatedAttachments.push({
                name: `edited.${ext}`,
                type: "image",
                mimeType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
                size: Math.max(0, Number(generated.size) || 0),
                storageId: generated.storageId,
                url: generated.url,
              });
            }
          } catch { /* ابزارهای غیر فایلی خروجی تصویری ندارند. */ }
          messages.push({
            role: "tool" as const,
            tool_call_id: tc.id,
            content: result,
          });
        }

        // ارسال نتایج به AI برای پاسخ نهایی
        response = await trackedChatCompletion(client, {
          model,
          messages: messages as any,
          max_tokens: 1500,
        }, { agent: role, task: `${role}:tool-result`, provider: config.provider, model, userId: context.userId, isAdmin: context.isAdmin });

        choice = response.choices[0];
        finalReply = choice?.message?.content || finalReply;
      }

      return {
        role,
        success: true,
        result: finalReply,
        latencyMs: Date.now() - started,
        attachments: generatedAttachments.length ? generatedAttachments : undefined,
      };
    }

    return {
      role,
      success: true,
      result: getFallbackResponse(role, context.message),
      latencyMs: Date.now() - started,
    };
  } catch (error: any) {
    return {
      role,
      success: false,
      result: "",
      error: error.message || "خطا در اجرای agent",
      latencyMs: Date.now() - started,
    };
  }
}

function getFallbackResponse(role: AgentRole, message: string): string {
  const responses: Record<string, string> = {
    support: "برای راهنمایی دقیق‌تر، لطفاً سوال خود را واضح‌تر بپرسید. می‌توانید درباره محصولات، سفارشات، ارسال و پرداخت سوال کنید.",
    product: "برای مدیریت محصولات، لطفاً اطلاعات دقیق شامل نام محصول، قیمت و تنوع‌ها را وارد کنید.",
    orders: "برای پیگیری سفارش، لطفاً شماره سفارش خود را وارد کنید.",
    customer: "برای پیشنهاد محصول، لطفاً بگویید چه نوع محصولی نیاز دارید (پمپ، لوله، شیرآلات، تأسیسات و...).",
    vision: "برای تحلیل تصویر، لطفاً یک عکس واضح آپلود کنید. من فاکتورها، محصولات و اطلاعات فنی را تشخیص می‌دهم.",
  };
  return responses[role] || "این قابلیت در حال حاضر بدون API Key در دسترس نیست. لطفاً از پنل مدیریت یک کلید API تنظیم کنید.";
}

/* ──────────────────────────────────────────────
   Router اصلی — ورودی اصلی سیستم
   ────────────────────────────────────────────── */

export interface RouterInput {
  message: string;
  userId?: number;
  isAdmin: boolean;
  adminRole?: string;
  sessionId?: string;
  history?: { role: string; content: string }[];
  fileContent?: string;
  fileProducts?: any[];
  attachments?: RouterAttachment[];
}

export interface RouterOutput {
  response: string;
  intent: string;
  agentsCalled: string[];
  results: AgentResult[];
  totalLatencyMs: number;
  source: "ai" | "brain" | "mixed";
  attachments?: RouterAttachment[];
}

export async function routeRequest(input: RouterInput): Promise<RouterOutput> {
  const started = Date.now();
  const key = getSessionKey(input.userId, input.sessionId);
  const isFinalConfirmation = /(?:تأیید|تایید)\s+نهایی/.test(input.message);

  // ایجاد محصولات استخراج‌شده پس از تأیید صریح مدیر، بدون اینکه مدل کد یا قیمت را دوباره بازنویسی کند.
  if (input.isAdmin && isFinalConfirmation && input.fileProducts?.length) {
    const productAgentAllowed = await checkAgentPermission(input.userId, "product", true);
    const productModuleAllowed = !!input.userId && !!input.adminRole && await hasModuleAccess(input.userId, input.adminRole, "products");
    if (!productAgentAllowed || !productModuleAllowed) {
      return { response: "شما مجوز ایجنت محصول یا مدیریت محصولات را ندارید.", intent: "رد عملیات به دلیل سطح دسترسی", agentsCalled: [], results: [], totalLatencyMs: Date.now() - started, source: "brain" };
    }
    const creationResults: AgentResult[] = [];
    for (const product of input.fileProducts.slice(0, 100)) {
      const raw = await executeToolCall("create_product", product && typeof product === "object" ? product : {}, {
        userId: input.userId,
        isAdmin: true,
        adminRole: input.adminRole,
        confirmed: true,
      });
      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { ok: false, error: raw }; }
      creationResults.push({
        role: "product",
        success: parsed.ok === true,
        result: parsed.message || parsed.error || "نتیجه نامشخص",
        error: parsed.ok === true ? undefined : parsed.error,
        latencyMs: Date.now() - started,
      });
    }
    const created = creationResults.filter(item => item.success);
    const failed = creationResults.filter(item => !item.success);
    const response = [
      created.length ? `✅ ${created.length} محصول به‌صورت پیش‌نویس ساخته شد:\n${created.map(item => `• ${item.result}`).join("\n")}` : "",
      failed.length ? `⚠️ ${failed.length} مورد ساخته نشد و نیاز به اصلاح دارد:\n${failed.map(item => `• ${item.error}`).join("\n")}` : "",
      created.length ? "برای کنترل نهایی قیمت، کد و تصاویر، پیش‌نویس‌ها را در بخش محصولات بازبینی کنید." : "",
    ].filter(Boolean).join("\n\n");
    await remember(key, [{ role: "user", content: input.message }, { role: "assistant", content: response }]);
    return {
      response,
      intent: "ساخت محصولات استخراج‌شده پس از تأیید نهایی",
      agentsCalled: ["product"],
      results: creationResults,
      totalLatencyMs: Date.now() - started,
      source: "mixed",
    };
  }

  // ۱. تحلیل intent
  const intent = await analyzeIntent(input.message, input.isAdmin, input.userId, input.sessionId, input.attachments || []);

  // ۲. اگر محصولات از فایل استخراج شدن، product agent رو اضافه کن
  if (input.fileProducts?.length && !intent.agents.includes("product")) {
    intent.agents.unshift("product");
    intent.instructions.product = `${input.fileProducts.length} محصول از فایل استخراج شده. آنها را بررسی کن و برای ایجاد/بروزرسانی در فروشگاه راهنمایی کن.`;
  }

  const hasImage = input.attachments?.some(file => file.type === "image") || false;
  const wantsImageEdit = /حذف پس.?زمینه|remove\.?bg|removebg|تغییر سایز|اندازه|resize|فشرده|webp|optimize|بهینه|ویرایش عکس|ویرایش تصویر|edit.*image|برش عکس|کادر/i.test(input.message);
  if (hasImage && wantsImageEdit) {
    intent.agents = ["image-editor"];
    intent.instructions["image-editor"] = "تصویر واقعی پیوست‌شده را دقیقاً مطابق دستور کاربر ویرایش کن و فایل خروجی را تحویل بده.";
    intent.mode = "sequential";
  }
  if (hasImage && !wantsImageEdit && !intent.agents.includes("vision")) {
    intent.agents.unshift("vision");
    intent.instructions.vision = "تصویر واقعی پیوست‌شده را دقیق بررسی کن و اطلاعات قابل مشاهده را استخراج کن. چیزی را حدس نزن.";
  }
  if (hasImage && intent.agents.includes("product")) intent.mode = "sequential";

  // ─── تشخیص نیاز به مغز مرکزی ───
  // اگر چند agent هماهنگ نیاز است (محصول+تصویر، بلاگ+تصویر، رقبا+بلاگ)، مغز مرکزی را فعال کن
  const needsCentralBrain = (
    (intent.agents.includes("product") && intent.agents.includes("image-intelligence")) ||
    (intent.agents.includes("content") && intent.agents.includes("blog-image")) ||
    (intent.agents.includes("marketing") && intent.agents.includes("content")) ||
    (intent.agents.includes("seo") && (intent.agents.includes("product") || intent.agents.includes("content"))) ||
    intent.agents.length >= 3
  );

  if (needsCentralBrain && input.isAdmin) {
    try {
      const { processWithBrain } = await import("./central-brain");
      const brainResult = await processWithBrain({
        message: input.message,
        userId: input.userId,
        isAdmin: input.isAdmin,
        adminRole: input.adminRole,
        sessionId: input.sessionId,
        history: input.history,
        fileContent: input.fileContent,
        attachments: input.attachments,
        fileProducts: input.fileProducts,
      });

      if (brainResult.response) {
        const allResults: AgentResult[] = [];
        for (const [taskId, result] of brainResult.tasksResults) {
          const task = brainResult.analysis.plan.tasks.find(t => t.id === taskId);
          allResults.push({
            role: task?.assignedAgent || "central-brain",
            success: task?.status === "completed",
            result: result || "",
            error: task?.status === "failed" ? result : undefined,
            latencyMs: 0,
          });
        }

        const response = brainResult.response;

        await remember(key, [
          { role: "user", content: input.message },
          { role: "assistant", content: response },
        ], intent);

        return {
          response,
          intent: intent.summary,
          agentsCalled: brainResult.analysis.requiredAgents,
          results: allResults,
          totalLatencyMs: Date.now() - started,
          source: "ai",
        };
      }
    } catch (error) {
      console.error("⚠️ Central brain failed, falling back to direct agent execution:", error);
    }
  }

  // ۳. اجرای agentها (با چک پرمیژن)
  const results: AgentResult[] = [];
  const extractedProductContext = input.fileProducts?.length
    ? `\n\nمحصولات ساختاریافته استخراج‌شده (این مقادیر را تغییر نده):\n${JSON.stringify(input.fileProducts).slice(0, 30_000)}`
    : "";
  const context = {
    message: input.message,
    history: input.history,
    fileContent: `${input.fileContent || ""}${extractedProductContext}` || undefined,
    attachments: input.attachments,
    userId: input.userId,
    isAdmin: input.isAdmin,
    adminRole: input.adminRole,
  };

  // فیلتر agentها بر اساس پرمیژن
  const allowedAgents: AgentRole[] = [];
  for (const role of intent.agents) {
    const permitted = await checkAgentPermission(input.userId, role, input.isAdmin);
    if (permitted) allowedAgents.push(role);
  }
  const agentsToRun: AgentRole[] = allowedAgents.length > 0 ? allowedAgents : (input.isAdmin ? ["chat" as AgentRole] : ["support" as AgentRole]);

  if (intent.mode === "parallel") {
    const promises = agentsToRun.map(role =>
      executeAgent(role, intent.instructions[role] || `به سوال کاربر پاسخ بده: ${input.message}`, context)
    );
    const all = await Promise.all(promises);
    results.push(...all);
  } else {
    for (const role of agentsToRun) {
      const r = await executeAgent(
        role,
        intent.instructions[role] || `به سوال کاربر پاسخ بده: ${input.message}`,
        { ...context, priorResults: results.filter(item => item.success).map(item => `${item.role}: ${item.result}`).join("\n") },
      );
      results.push(r);
    }
  }

  // ۴. ساخت پاسخ نهایی
  const response = formatFinalResponse(intent, results, input.isAdmin);

  // ۵. ذخیره در حافظه
  await remember(key, [
    { role: "user", content: input.message },
    { role: "assistant", content: response },
  ], intent);

  return {
    response,
    intent: intent.summary,
    agentsCalled: agentsToRun,
    results,
    totalLatencyMs: Date.now() - started,
    source: results.some(r => r.success && r.result.length > 30) ? "ai" : "brain",
    attachments: results.flatMap(result => result.attachments || []),
  };
}

/** فرمت‌بندی پاسخ نهایی از نتایج agentها */
function formatFinalResponse(intent: IntentResult, results: AgentResult[], isAdmin: boolean): string {
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  if (successfulResults.length === 0) {
    return "متأسفانه هیچ‌کدام از سرویس‌های هوش مصنوعی در حال حاضر پاسخگو نیستند. لطفاً API Keyهای مربوطه را در پنل مدیریت تنظیم کنید یا بعداً تلاش کنید.";
  }

  // اگر فقط یک agent جواب داده، مستقیم نمایش بده
  if (successfulResults.length === 1) {
    return successfulResults[0].result;
  }

  // چند agent — پاسخ ترکیبی
  let response = "";
  for (const r of successfulResults) {
    const agent = getAgent(r.role);
    const icon = agent?.icon || "📌";
    const name = agent?.name || r.role;
    response += `### ${icon} ${name}\n${r.result}\n\n`;
  }

  if (failedResults.length > 0 && isAdmin) {
    response += `\n⚠️ ${failedResults.length} agent با خطا مواجه شد: ${failedResults.map(r => r.role).join(", ")}`;
  }

  return response.trim();
}