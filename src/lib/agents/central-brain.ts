/**
 * 🧠 مغز مرکزی پیشرفته — Central Brain
 * 
 * هسته اصلی هوش مصنوعی سایت. این ماژول:
 * ۱. درخواست‌های پیچیده رو به وظایف کوچک تجزیه می‌کنه
 * ۲. بین agentهای تخصصی هماهنگی ایجاد می‌کنه
 * ۳. حافظه کوتاه‌مدت و بلندمدت رو مدیریت می‌کنه
 * ۴. از اشتباهات گذشته یاد می‌گیره
 * ۵. کیفیت خروجی رو قبل از نهایی‌سازی بررسی می‌کنه
 * ۶. برنامه عملیاتی برای انجام کارهای پیچیده میسازه
 */

import crypto from "node:crypto";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";
import type {
  AgentRole, BrainTask, MemoryItem, MemoryCategory,
  ActionPlan, BrainAnalysis, TaskType, TaskStatus, RouterIntent,
} from "./types";
import { AGENT_REGISTRY, getAgent, isPublicRole } from "./registry";
import { getAiConfig } from "@/lib/ai";
import { trackedChatCompletion } from "@/lib/ai-usage";

/* ══════════════════════════════════════════════
   حافظه پیشرفته — دو لایه
   ══════════════════════════════════════════════ */

const SHORT_TERM_TTL = 30 * 60 * 1000; // 30 دقیقه
const LONG_TERM_KEY = "central_brain_memory";
const MEMORY_GROUP = "ai";

/** حافظه کوتاه‌مدت درون حافظه (in-memory) */
const shortTermCache: Map<string, MemoryItem[]> = new Map();

/**
 * ذخیره یک آیتم در حافظه کوتاه‌مدت
 */
function storeShortTerm(key: string, content: string, category: MemoryCategory, tags: string[] = [], confidence = 1.0) {
  const now = new Date();
  const item: MemoryItem = {
    id: crypto.randomBytes(8).toString("hex"),
    type: "short_term",
    key,
    content,
    category,
    tags,
    confidence,
    createdAt: now,
    lastAccessed: now,
    accessCount: 1,
  };

  const existing = shortTermCache.get(key) || [];
  existing.push(item);
  // حداکثر ۲۰ آیتم به ازای هر کلید
  shortTermCache.set(key, existing.slice(-20));
  return item;
}

/**
 * جستجو در حافظه کوتاه‌مدت
 */
function searchShortTerm(query: string, category?: MemoryCategory): MemoryItem[] {
  const results: MemoryItem[] = [];
  const now = Date.now();
  const lowerQuery = query.toLowerCase();

  for (const [, items] of shortTermCache) {
    for (const item of items) {
      if (now - item.createdAt.getTime() > SHORT_TERM_TTL) continue;
      if (category && item.category !== category) continue;

      // تطابق ساده کلمه‌ای
      const matchesQuery = item.tags.some(t => lowerQuery.includes(t.toLowerCase()))
        || item.content.toLowerCase().includes(lowerQuery)
        || item.key.toLowerCase().includes(lowerQuery);

      if (matchesQuery) {
        item.lastAccessed = new Date();
        item.accessCount++;
        results.push(item);
      }
    }
  }

  // مرتب‌سازی بر اساس relevance (تعداد دفعات دسترسی × اطمینان)
  return results.sort((a, b) => (b.accessCount * b.confidence) - (a.accessCount * a.confidence)).slice(0, 10);
}

/**
 * ذخیره در حافظه بلندمدت (دیتابیس)
 */
async function storeLongTerm(
  key: string,
  content: string,
  category: MemoryCategory,
  tags: string[] = [],
  confidence = 1.0
): Promise<void> {
  try {
    const existing = await db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, LONG_TERM_KEY), eq(siteSettings.group, MEMORY_GROUP)))
      .limit(1);

    const memories: MemoryItem[] = (existing[0]?.value as any)?.memories || [];

    // بروزرسانی اگر قبلاً وجود داشته
    const existingIndex = memories.findIndex(m => m.key === key && m.category === category);
    const now = new Date();
    const newItem: MemoryItem = {
      id: crypto.randomBytes(8).toString("hex"),
      type: "long_term",
      key,
      content,
      category,
      tags,
      confidence,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1,
    };

    if (existingIndex >= 0) {
      // ادغام: به‌روزرسانی محتوا و افزایش دسترسی
      const old = memories[existingIndex];
      newItem.createdAt = old.createdAt;
      newItem.accessCount = old.accessCount + 1;
      newItem.confidence = Math.min(1, old.confidence + 0.05); // افزایش اطمینان با تکرار
      memories[existingIndex] = newItem;
    } else {
      memories.push(newItem);
    }

    // حداکثر ۵۰۰ آیتم حافظه بلندمدت
    const trimmed = memories.slice(-500);

    await db.insert(siteSettings)
      .values({
        key: LONG_TERM_KEY,
        group: MEMORY_GROUP,
        value: { memories: trimmed },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [siteSettings.key, siteSettings.locale],
        set: { value: { memories: trimmed }, updatedAt: now },
      });
  } catch (error) {
    console.error("خطا در ذخیره حافظه بلندمدت:", error);
  }
}

/**
 * جستجو در حافظه بلندمدت
 */
async function searchLongTerm(query: string, category?: MemoryCategory): Promise<MemoryItem[]> {
  try {
    const existing = await db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.key, LONG_TERM_KEY), eq(siteSettings.group, MEMORY_GROUP)))
      .limit(1);

    const memories: MemoryItem[] = (existing[0]?.value as any)?.memories || [];
    const lowerQuery = query.toLowerCase();

    return memories
      .filter(item => {
        if (category && item.category !== category) return false;
        return item.tags.some(t => lowerQuery.includes(t.toLowerCase()))
          || item.content.toLowerCase().includes(lowerQuery)
          || item.key.toLowerCase().includes(lowerQuery);
      })
      .sort((a, b) => (b.accessCount * b.confidence) - (a.accessCount * a.confidence))
      .slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * جستجوی یکپارچه در هر دو حافظه
 */
export async function searchMemory(query: string, category?: MemoryCategory): Promise<{
  shortTerm: MemoryItem[];
  longTerm: MemoryItem[];
}> {
  const [shortTerm, longTerm] = await Promise.all([
    Promise.resolve(searchShortTerm(query, category)),
    searchLongTerm(query, category),
  ]);
  return { shortTerm, longTerm };
}

/**
 * یادگیری از یک تعامل موفق
 */
export async function learnFromInteraction(
  input: string,
  output: string,
  success: boolean,
  category: MemoryCategory = "general",
  tags: string[] = []
): Promise<void> {
  const confidence = success ? 0.7 : 0.3;

  // ذخیره در حافظه کوتاه‌مدت
  storeShortTerm(
    `interaction:${crypto.randomBytes(4).toString("hex")}`,
    `سوال: ${input}\nپاسخ: ${output}`,
    category,
    tags,
    confidence
  );

  // اگر موفق و مهم بود، در حافظه بلندمدت هم ذخیره کن
  if (success && (input.length > 20 || tags.length > 0)) {
    await storeLongTerm(
      `learned:${input.slice(0, 50)}`,
      `[سوال]: ${input}\n[پاسخ موفق]: ${output}`,
      category,
      tags,
      confidence
    );
  }
}

/* ══════════════════════════════════════════════
   تحلیل و برنامه‌ریزی
   ══════════════════════════════════════════════ */

/**
 * تحلیل یک درخواست و تولید برنامه عملیاتی
 */
export async function analyzeRequest(
  message: string,
  isAdmin: boolean,
  userId?: number,
  attachments: any[] = [],
): Promise<BrainAnalysis> {
  // جستجو در حافظه برای زمینه مرتبط
  const memories = await searchMemory(message);

  // تشخیص پیچیدگی
  const complexity = detectComplexity(message, attachments);
  
  // تشخیص agentهای مورد نیاز
  const requiredAgents = detectRequiredAgents(message, isAdmin, attachments);

  // ساخت برنامه عملیاتی
  const plan = await createActionPlan(message, requiredAgents, complexity, isAdmin);

  return {
    intent: extractIntent(message),
    complexity,
    requiredAgents,
    plan,
    relevantMemories: [...memories.shortTerm, ...memories.longTerm],
    confidence: plan.tasks.length > 0 ? 0.85 : 0.5,
  };
}

/**
 * تشخیص پیچیدگی درخواست
 */
function detectComplexity(message: string, attachments: any[]): "simple" | "medium" | "complex" {
  const hasFile = attachments.length > 0;
  const hasImage = attachments.some(a => a.type === "image");
  const msgLen = message.length;
  const hasMultipleIntents = /و\s*همچنین|و\s*بعد|سپس|اول.*بعد|و\s*نیز|هم\s*...\s*هم/i.test(message);
  const hasProductKeywords = /محصول|ایجاد|ساخت|اضافه|قیمت|SKU|تنوع/i.test(message);
  const hasBlogKeywords = /بلاگ|مقاله|پست|بنویس/i.test(message);
  const hasImageKeyword = /عکس|تصویر|آپلود/i.test(message);

  const complexityScore = [
    hasFile, hasImage, hasMultipleIntents,
    hasProductKeywords && hasBlogKeywords,
    hasProductKeywords && hasImageKeyword,
    msgLen > 200,
  ].filter(Boolean).length;

  if (complexityScore >= 3) return "complex";
  if (complexityScore >= 1) return "medium";
  return "simple";
}

/**
 * تشخیص agentهای مورد نیاز بر اساس محتوای پیام
 */
function detectRequiredAgents(message: string, isAdmin: boolean, attachments: any[]): AgentRole[] {
  const agents: Set<AgentRole> = new Set();
  const lower = message.toLowerCase();

  // محصول + تصویر = نیاز به هوش تصویر
  if (/محصول|ایجاد|ساخت.*محصول|اضافه.*محصول/i.test(lower)) {
    agents.add("product");
    if (/عکس|تصویر|عکس.*محصول|تصویر.*محصول|عکس.*واقعی|عکس.*اینترنت/i.test(lower)) {
      agents.add("image-intelligence");
    }
  }

  // بلاگ + تصویر
  if (/بلاگ|مقاله|پست|بنویس.*بلاگ|بنویس.*مقاله/i.test(lower)) {
    agents.add("content");
    if (/عکس|تصویر|تصویر.*بلاگ|عکس.*مقاله|عکس.*اختصاصی/i.test(lower)) {
      agents.add("blog-image");
    }
  }

  // تحلیل رقبا
  if (/رقبا|رقیب|تحلیل.*رقبا|آنالیز.*رقبا|competitor/i.test(lower)) {
    agents.add("marketing");
    if (/بلاگ|مقاله|محتوا|بنویس/i.test(lower)) {
      agents.add("content");
    }
  }

  // سئو
  if (/سئو|seo|بهینه.*سازی|کلمه.*کلیدی|meta/i.test(lower)) {
    agents.add("seo");
  }

  // قیمت
  if (/قیمت|بروز.*قیمت|تغییر.*قیمت|price/i.test(lower)) {
    agents.add("product");
  }

  // فایل
  if (attachments.length > 0) {
    const hasImage = attachments.some(a => a.type === "image");
    const hasDoc = attachments.some(a => /pdf|xlsx|csv|text/i.test(a.type));
    if (hasImage) agents.add("vision");
    if (hasDoc) agents.add("data");
    if (hasImage && /محصول/i.test(lower)) agents.add("product");
  }

  // سفارش
  if (/سفارش|پیگیری|وضعیت.*سفارش|order/i.test(lower)) {
    agents.add("orders");
  }

  // پیش‌فرض
  if (agents.size === 0) {
    agents.add(isAdmin ? "chat" : "support");
  }

  // فیلتر برای کاربران عادی
  if (!isAdmin) {
    return Array.from(agents).filter(a => isPublicRole(a));
  }

  return Array.from(agents).slice(0, 4); // حداکثر ۴ agent
}

/**
 * استخراج intent اصلی از پیام
 */
function extractIntent(message: string): string {
  const lower = message;

  if (/ایجاد.*محصول|ساخت.*محصول|اضافه.*محصول/i.test(lower)) return "ایجاد محصول جدید";
  if (/بروز.*قیمت|تغییر.*قیمت|قیمت.*کن/i.test(lower)) return "بروزرسانی قیمت";
  if (/بلاگ|مقاله|پست|بنویس/i.test(lower)) return "تولید محتوا";
  if (/رقبا|رقیب|تحلیل.*رقبا/i.test(lower)) return "تحلیل رقبا";
  if (/سفارش|پیگیری|وضعیت.*سفارش/i.test(lower)) return "پیگیری سفارش";
  if (/سئو|seo|بهینه/i.test(lower)) return "بهینه‌سازی سئو";
  if (/گزارش|آمار/i.test(lower)) return "گزارش و آمار";
  if (/سلام|درود|خوبی/i.test(lower)) return "احوالپرسی";
  if (/عکس|تصویر/i.test(lower)) return "پردازش تصویر";
  if (/help|راهنما|کمک/i.test(lower)) return "راهنمایی";

  return "پاسخ به سوال";
}

/**
 * ایجاد برنامه عملیاتی
 */
async function createActionPlan(
  message: string,
  agents: AgentRole[],
  complexity: "simple" | "medium" | "complex",
  isAdmin: boolean,
): Promise<ActionPlan> {
  const tasks: BrainTask[] = [];
  const now = new Date();
  const lower = message.toLowerCase();

  // تولید ID یکتا
  const taskId = () => `task-${crypto.randomBytes(4).toString("hex")}`;

  // محصول + تصویر
  if (agents.includes("product") && agents.includes("image-intelligence")) {
    tasks.push({
      id: taskId(),
      type: "product_creation",
      description: "ایجاد محصول جدید با اطلاعات استخراج‌شده",
      status: "pending",
      assignedAgent: "product",
      instructions: "محصول را با اطلاعات داده شده ایجاد کن. همه فیلدها را پر کن: نام، SKU، برند، دسته‌بندی، قیمت، موجودی، توضیحات، تنوع‌ها. از تأیید نهایی کاربر مطمئن شو.",
      dependsOn: [],
      createdAt: now,
      priority: 8,
    });

    tasks.push({
      id: taskId(),
      type: "product_image_search",
      description: "جستجوی تصویر واقعی محصول از اینترنت",
      status: "pending",
      assignedAgent: "image-intelligence",
      instructions: "برای محصول ایجادشده، تصویر واقعی از اینترنت جستجو کن. نام محصول و برند را برای جستجو استفاده کن. تصویر با کیفیت و بدون واترمارک انتخاب کن.",
      dependsOn: [tasks[tasks.length - 1].id],
      createdAt: now,
      priority: 6,
    });

    tasks.push({
      id: taskId(),
      type: "product_image_processing",
      description: "پردازش تصویر: حذف پس‌زمینه، بهینه‌سازی، واترمارک",
      status: "pending",
      assignedAgent: "image-intelligence",
      instructions: "تصویر را پردازش کن: ۱. پس‌زمینه را حذف کن ۲. بهینه‌سازی کن (webp, 800x600) ۳. واترمارک سایت را اضافه کن ۴. تصویر را به محصول اختصاص بده",
      dependsOn: [tasks[tasks.length - 1].id],
      createdAt: now,
      priority: 5,
    });
  }
  // فقط محصول
  else if (agents.includes("product")) {
    tasks.push({
      id: taskId(),
      type: "product_creation",
      description: "ایجاد محصول جدید",
      status: "pending",
      assignedAgent: "product",
      instructions: "محصول را با اطلاعات داده شده ایجاد کن. همه فیلدهای فرم را پر کن. اگر اطلاعاتی موجود نیست از کاربر بپرس.",
      dependsOn: [],
      createdAt: now,
      priority: 7,
    });
  }

  // بلاگ + تصویر
  if (agents.includes("content") && agents.includes("blog-image")) {
    tasks.push({
      id: taskId(),
      type: "blog_creation",
      description: "نوشتن پست بلاگ",
      status: "pending",
      assignedAgent: "content",
      instructions: "پست بلاگ را با موضوع داده شده بنویس. محتوا سئو شده و حرفه‌ای باشد. عنوان، متن کامل، خلاصه، متا تایتل و متا توضیحات را آماده کن.",
      dependsOn: [],
      createdAt: now,
      priority: 7,
    });

    tasks.push({
      id: taskId(),
      type: "blog_image_generation",
      description: "ایجاد تصویر متناسب با بلاگ",
      status: "pending",
      assignedAgent: "blog-image",
      instructions: "با توجه به موضوع و محتوای بلاگ، یک تصویر مرتبط و حرفه‌ای جستجو کن. تصویر را پردازش کن و به بلاگ اختصاص بده.",
      dependsOn: [tasks[tasks.length - 1].id],
      createdAt: now,
      priority: 5,
    });
  }
  // فقط بلاگ
  else if (agents.includes("content")) {
    tasks.push({
      id: taskId(),
      type: "blog_creation",
      description: "نوشتن پست بلاگ",
      status: "pending",
      assignedAgent: "content",
      instructions: "پست بلاگ را با موضوع داده شده بنویس. حرفه‌ای، سئو شده و جذاب.",
      dependsOn: [],
      createdAt: now,
      priority: 7,
    });
  }

  // تحلیل رقبا + بلاگ
  if (agents.includes("marketing") && agents.includes("content")) {
    tasks.push({
      id: taskId(),
      type: "competitor_analysis",
      description: "تحلیل رقبا و استخراج کلمات کلیدی",
      status: "pending",
      assignedAgent: "marketing",
      instructions: "رقبای مشخص‌شده را تحلیل کن. کلمات کلیدی، عنوان‌ها و استراتژی آن‌ها را استخراج کن.",
      dependsOn: [],
      createdAt: now,
      priority: 8,
    });

    tasks.push({
      id: taskId(),
      type: "blog_creation",
      description: "ایجاد پست بلاگ بر اساس تحلیل رقبا",
      status: "pending",
      assignedAgent: "content",
      instructions: "با استفاده از نتایج تحلیل رقبا، یک پست بلاگ سئو شده و جامع بنویس. از کلمات کلیدی پیدا شده استفاده کن.",
      dependsOn: [tasks[tasks.length - 1].id],
      createdAt: now,
      priority: 7,
    });
  }

  // سایر agentها
  for (const agent of agents) {
    if (!tasks.some(t => t.assignedAgent === agent)) {
      let taskType: TaskType = "general_chat";
      if (agent === "seo") taskType = "seo_optimization";
      else if (agent === "orders") taskType = "customer_support";
      else if (agent === "analytics") taskType = "data_extraction";
      else if (agent === "support") taskType = "customer_support";
      else if (agent === "vision") taskType = "data_extraction";

      tasks.push({
        id: taskId(),
        type: taskType,
        description: `انجام وظیفه توسط ${agent}`,
        status: "pending",
        assignedAgent: agent,
        instructions: "به درخواست کاربر پاسخ بده و وظیفه خود را انجام بده.",
        dependsOn: [],
        createdAt: now,
        priority: 5,
      });
    }
  }

  // سئو برای محصولات و بلاگ‌ها
  if (agents.includes("seo") && (agents.includes("product") || agents.includes("content"))) {
    const seoDependsOn = tasks
      .filter(t => t.type === "product_creation" || t.type === "blog_creation")
      .map(t => t.id);

    tasks.push({
      id: taskId(),
      type: "seo_optimization",
      description: "بهینه‌سازی سئو برای محصول/بلاگ ایجادشده",
      status: "pending",
      assignedAgent: "seo",
      instructions: "برای آیتم ایجادشده، متا تایتل، متا توضیحات، کلمات کلیدی و اسلایمه بهینه رو ایجاد کن و اعمال کن.",
      dependsOn: seoDependsOn,
      createdAt: now,
      priority: 4,
    });
  }

  return {
    id: `plan-${crypto.randomBytes(4).toString("hex")}`,
    summary: extractIntent(message),
    tasks,
    estimatedComplexity: complexity,
    requiresConfirmation: tasks.some(t => t.type === "product_creation" || t.type === "blog_creation"),
    createdAt: now,
  };
}

/* ══════════════════════════════════════════════
   اجرای برنامه عملیاتی
   ══════════════════════════════════════════════ */

/**
 * اجرای یک برنامه عملیاتی
 * وظایف را بر اساس وابستگی‌ها به ترتیب اجرا می‌کنه
 */
export async function executePlan(
  plan: ActionPlan,
  context: {
    message: string;
    userId?: number;
    isAdmin: boolean;
    adminRole?: string;
    sessionId?: string;
    history?: any[];
    fileContent?: string;
    attachments?: any[];
  },
  onTaskComplete?: (task: BrainTask, result: string) => void,
): Promise<{ results: Map<string, string>; finalResponse: string }> {
  const results = new Map<string, string>();
  const taskMap = new Map(plan.tasks.map(t => [t.id, t]));
  
  // کپی از وظایف برای اجرا
  const remaining = [...plan.tasks];
  const maxIterations = 20;
  let iteration = 0;

  while (remaining.length > 0 && iteration < maxIterations) {
    iteration++;

    // پیدا کردن وظایفی که وابستگی‌هاشون برآورده شده
    const ready = remaining.filter(task =>
      task.dependsOn.every(depId => results.has(depId))
    );

    if (ready.length === 0) {
      // اگر وظیفه‌ای آماده نیست ولی هنوز باقی مونده، وابستگی رو نادیده می‌گیریم
      const stuck = remaining.filter(task =>
        !task.dependsOn.every(depId => results.has(depId))
      );
      for (const task of stuck) {
        console.warn(`⚠️ وظیفه ${task.id} (${task.type}) وابستگی‌های برآورده‌نشده دارد، اجباری اجرا می‌شود.`);
        ready.push(task);
      }
    }

    // اجرای وظایف آماده
    for (const task of ready) {
      try {
        task.status = "in_progress";
        
        // context مخصوص برای هر agent
        const taskContext = {
          ...context,
          priorResults: Array.from(results.entries())
            .map(([id, result]) => `[${id}]: ${result}`)
            .join("\n"),
          message: task.instructions + "\n\n" + context.message,
        };

        // اجرا از طریق executeAgent (که در router.ts تعریف شده)
        // اینجا ما مستقیماً فراخوانی می‌کنیم
        const result = await executeAgentTask(task, taskContext);
        
        results.set(task.id, result);
        task.status = "completed";
        task.completedAt = new Date();
        task.result = result;

        if (onTaskComplete) onTaskComplete(task, result);
      } catch (error: any) {
        task.status = "failed";
        results.set(task.id, `خطا: ${error.message}`);
        console.error(`❌ وظیفه ${task.id} (${task.type}) شکست خورد:`, error);
      }
    }

    // حذف وظایف انجام‌شده از لیست باقیمانده
    const completedIds = new Set(ready.map(t => t.id));
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (completedIds.has(remaining[i].id)) {
        remaining.splice(i, 1);
      }
    }
  }

  // ساخت پاسخ نهایی
  const finalResponse = buildFinalResponse(plan, results);

  return { results, finalResponse };
}

/**
 * اجرای یک وظیفه توسط agent مشخص
 */
async function executeAgentTask(
  task: BrainTask,
  context: any,
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const config = await getAiConfig(task.assignedAgent as any);
  
  if (!config?.apiKey) {
    return "⚠️ کلید API برای این agent تنظیم نشده است.";
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
    timeout: 60000,
    maxRetries: 1,
  });

  const agentDef = getAgent(task.assignedAgent);
  const systemPrompt = agentDef?.systemPrompt || `شما agent ${task.assignedAgent} هستید.`;

  const response = await trackedChatCompletion(client, {
    model: config.model || agentDef?.recommendModels[0] || "gpt-4o-mini",
    messages: [
      { role: "system", content: `${systemPrompt}\n\nوظیفه شما: ${task.description}\nدستورالعمل: ${task.instructions}\n${context.priorResults ? `نتایج قبلی:\n${context.priorResults}` : ""}` },
      { role: "user", content: `پیام کاربر: ${context.message}\n${context.fileContent ? `محتوای فایل:\n${context.fileContent}` : ""}` },
    ],
    max_tokens: 2000,
  }, {
    agent: task.assignedAgent,
    task: task.type,
    provider: config.provider,
    model: config.model,
    userId: context.userId,
    isAdmin: context.isAdmin,
  });

  return response.choices[0]?.message?.content || "بدون پاسخ";
}

/**
 * ساخت پاسخ نهایی از نتایج وظایف
 */
function buildFinalResponse(plan: ActionPlan, results: Map<string, string>): string {
  const successTasks = plan.tasks.filter(t => t.status === "completed");
  const failedTasks = plan.tasks.filter(t => t.status === "failed");

  if (successTasks.length === 0 && failedTasks.length === 0) {
    return "❌ هیچ وظیفه‌ای اجرا نشد. لطفاً دوباره تلاش کنید.";
  }

  let response = "";

  if (successTasks.length > 0) {
    response += "✅ **وظایف انجام‌شده:**\n\n";
    for (const task of successTasks) {
      const result = results.get(task.id) || "";
      response += `**${getTaskEmoji(task.type)} ${task.description}**\n`;
      // خلاصه‌سازی نتیجه (حداکثر ۲۰۰ کاراکتر)
      const summary = result.length > 200 ? result.slice(0, 200) + "..." : result;
      response += `${summary}\n\n`;
    }
  }

  if (failedTasks.length > 0) {
    response += "⚠️ **وظایف با مشکل مواجه شدند:**\n";
    for (const task of failedTasks) {
      response += `• ${task.description}: ${results.get(task.id) || "خطای نامشخص"}\n`;
    }
    response += "\n";
  }

  // راهنمایی برای مراحل بعدی
  const hasProduct = plan.tasks.some(t => t.type === "product_creation" && t.status === "completed");
  const hasBlog = plan.tasks.some(t => t.type === "blog_creation" && t.status === "completed");

  if (hasProduct || hasBlog) {
    response += "---\n💡 **مراحل بعدی پیشنهادی:**\n";
    if (hasProduct) {
      response += "• برای **بهینه‌سازی سئو** محصول بگویید: «سئو این محصول رو بهینه کن»\n";
      response += "• برای **بروزرسانی قیمت** بگویید: «قیمت این محصول رو تغییر بده»\n";
    }
    if (hasBlog) {
      response += "• برای **تصویر اختصاصی** بلاگ بگویید: «برا این بلاگ عکس بذار»\n";
    }
  }

  return response;
}

function getTaskEmoji(type: TaskType): string {
  const emojis: Record<TaskType, string> = {
    product_creation: "🛒",
    product_image_search: "🔍",
    product_image_processing: "🖼️",
    blog_creation: "📝",
    blog_image_generation: "🎨",
    competitor_analysis: "📊",
    seo_optimization: "🔎",
    price_update: "💰",
    inventory_check: "📦",
    customer_support: "🎧",
    data_extraction: "📋",
    translation: "🌐",
    content_generation: "✍️",
    general_chat: "💬",
  };
  return emojis[type] || "✅";
}

/* ══════════════════════════════════════════════
   API عمومی مغز مرکزی
   ══════════════════════════════════════════════ */

/**
 * پردازش یک پیام با مغز مرکزی
 * این تابع اصلی‌ترین نقطه ورود برای پردازش هوشمند است
 */
export async function processWithBrain(input: {
  message: string;
  userId?: number;
  isAdmin: boolean;
  adminRole?: string;
  sessionId?: string;
  history?: any[];
  fileContent?: string;
  attachments?: any[];
  fileProducts?: any[];
}): Promise<{
  analysis: BrainAnalysis;
  response: string;
  tasksResults: Map<string, string>;
}> {
  // ۱. تحلیل درخواست
  const analysis = await analyzeRequest(
    input.message,
    input.isAdmin,
    input.userId,
    input.attachments || []
  );

  // ۲. اگر ساده است، مستقیماً به روتر بسپار
  if (analysis.complexity === "simple") {
    return {
      analysis,
      response: "",
      tasksResults: new Map(),
    };
  }

  // ۳. اجرای برنامه عملیاتی
  const { results, finalResponse } = await executePlan(analysis.plan, input);

  // ۴. یادگیری از این تعامل
  await learnFromInteraction(
    input.message,
    finalResponse,
    analysis.plan.tasks.some(t => t.status === "completed"),
    "general",
    analysis.requiredAgents.map(a => `agent:${a}`)
  );

  return {
    analysis,
    response: finalResponse,
    tasksResults: results,
  };
}

/**
 * پاکسازی حافظه کوتاه‌مدت
 */
export function clearShortTermMemory() {
  shortTermCache.clear();
}

/**
 * دریافت آمار حافظه
 */
export function getMemoryStats() {
  let shortTermCount = 0;
  for (const [, items] of shortTermCache) {
    shortTermCount += items.length;
  }
  return { shortTermCount };
}
