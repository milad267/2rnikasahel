/**
 * 🧠 سیستم Multi-Agent — انواع و تعاریف نسخه پیشرفته
 * 
 * روتر (Router) درخواست کاربر رو تحلیل میکنه و بین agentهای تخصصی تقسیم میکنه.
 * مغز مرکزی (Central Brain) هماهنگی بین agentها رو انجام میده.
 * هر agent نقش مشخص و API Key مخصوص خودش رو داره.
 */

/** نقش‌های تخصصی agentها */
export type AgentRole =
  | "router"           // مغز مرکزی — مسیریابی و هماهنگی
  | "central-brain"    // مغز مرکزی پیشرفته — برنامه‌ریزی، تجزیه وظایف، حافظه، هماهنگی
  | "chat"             // دستیار عمومی fallback
  | "product"          // مدیریت محصولات و تنوع‌ها
  | "content"          // تولید محتوا، بلاگ، سئو
  | "analytics"        // آمار، گزارش، تحلیل فروش
  | "support"          // پشتیبانی کاربران، راهنمایی
  | "vision"           // تحلیل تصاویر، OCR، تشخیص
  | "image-intelligence" // هوش تصویر — جستجوی اینترنتی تصویر، حذف پس‌زمینه، واترمارک
  | "blog-image"       // تولید تصویر برای بلاگ هماهنگ با محتوا
  | "data"             // پردازش Excel, PDF, داده‌های حجیم
  | "marketing"        // بازاریابی، تحلیل رقبا، کمپین
  | "orders"           // مدیریت سفارشات، پیگیری، فاکتور
  | "seo"              // بهینه‌سازی موتور جستجو
  | "inventory"        // مدیریت انبار، موجودی، هشدار
  | "customer"         // تحلیل مشتری، پیشنهاد محصول
  | "translator"       // ترجمه تخصصی اصطلاحات صنعتی
  | "code"             // تولید کد، CSS, SQL, اسکریپت
  | "telegram"         // مدیریت ربات تلگرام و اعلان‌ها
  | "image-editor";    // ویرایش تصویر با AI (remove bg, resize, optimize)

/** تعریف یک Agent تخصصی */
export interface AgentDefinition {
  role: AgentRole;
  name: string;
  desc: string;
  icon: string;
  /** فقط ادمین میتونه استفاده کنه */
  adminOnly: boolean;
  /** ابزارهایی که این agent توی function calling داره */
  tools: AgentTool[];
  /** system prompt اختصاصی */
  systemPrompt: string;
  /** مدل‌های پیشنهادی */
  recommendModels: string[];
  /** provider پیشنهادی */
  recommendProvider: string;
}

/** تعریف یک ابزار (function) برای agent */
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** تابع اجرایی روی سرور */
  handler?: (args: Record<string, unknown>) => Promise<string>;
}

/** نتیجه اجرای یک agent */
export interface AgentResult {
  role: AgentRole;
  success: boolean;
  result: string;
  error?: string;
  latencyMs: number;
  attachments?: AgentAttachment[];
}

/** پیوست agent (فایل، تصویر و ...) */
export interface AgentAttachment {
  name: string;
  type: string;
  mimeType: string;
  size: number;
  storageId: string;
  url: string;
}

/** intent تشخیص‌داده‌شده توسط روتر */
export interface RouterIntent {
  /** agentهایی که باید فراخوانی بشن */
  agents: AgentRole[];
  /** اولویت: sequential (پشت سر هم) یا parallel (همزمان) */
  mode: "sequential" | "parallel";
  /** دستورالعمل اختصاصی برای هر agent */
  instructions: Record<AgentRole, string>;
  /** خلاصه‌ای از intent برای user */
  summary: string;
  /** آیا نیاز به تأیید نهایی هست؟ */
  needsConfirmation?: boolean;
}

/** تنظیمات یک agent خاص */
export interface AgentConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

/* ──────────────────────────────────────────────
   انواع جدید برای مغز مرکزی پیشرفته
   ────────────────────────────────────────────── */

/** وظیفه‌ای که مغز مرکزی تعریف می‌کنه */
export interface BrainTask {
  id: string;
  type: TaskType;
  description: string;
  status: TaskStatus;
  assignedAgent: AgentRole;
  instructions: string;
  dependsOn: string[];
  result?: string;
  createdAt: Date;
  completedAt?: Date;
  priority: number;
}

export type TaskType =
  | "product_creation"
  | "product_image_search"
  | "product_image_processing"
  | "blog_creation"
  | "blog_image_generation"
  | "competitor_analysis"
  | "seo_optimization"
  | "price_update"
  | "inventory_check"
  | "customer_support"
  | "data_extraction"
  | "translation"
  | "content_generation"
  | "general_chat";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "blocked";

/** آیتم حافظه برای مغز مرکزی */
export interface MemoryItem {
  id: string;
  type: "short_term" | "long_term" | "learned";
  key: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  confidence: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export type MemoryCategory =
  | "product_knowledge"
  | "user_preference"
  | "competitor_info"
  | "seo_strategy"
  | "pricing_rule"
  | "common_issue"
  | "success_pattern"
  | "failure_pattern"
  | "general";

/** برنامه عملیاتی که مغز مرکزی میسازه */
export interface ActionPlan {
  id: string;
  summary: string;
  tasks: BrainTask[];
  estimatedComplexity: "simple" | "medium" | "complex";
  requiresConfirmation: boolean;
  createdAt: Date;
}

/** نتیجه تحلیل درخواست توسط مغز مرکزی */
export interface BrainAnalysis {
  intent: string;
  complexity: "simple" | "medium" | "complex";
  requiredAgents: AgentRole[];
  plan: ActionPlan;
  relevantMemories: MemoryItem[];
  confidence: number;
}

/* ──────────────────────────────────────────────
   انواع برای هوش تصویر
   ────────────────────────────────────────────── */

export interface ImageSearchResult {
  url: string;
  source: string;
  width: number;
  height: number;
  format: string;
  description?: string;
  confidence: number;
}

export interface ProcessedImage {
  originalUrl: string;
  storageId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
  processingSteps: string[];
  hasWatermark: boolean;
}
