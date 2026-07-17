import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  decimal,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ==========================================================================
   فاز ۰ — جداول بنیادین
   ========================================================================== */

/** کاربران ادمین */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 40 }).notNull().default("admin"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_email_idx").on(table.email)],
);

/** جلسات ادمین برای احراز هویت */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 200 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** تنظیمات و محتوای قابل‌ویرایش سایت */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    group: varchar("group", { length: 80 }).notNull().default("general"),
    locale: varchar("locale", { length: 5 }).notNull().default("fa"),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_settings_key_locale_idx").on(table.key, table.locale)],
);

/** ۵۰ پالت رنگی */
export const colorPalettes = pgTable(
  "color_palettes",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    colors: jsonb("colors").$type<string[]>().notNull(),
    isActive: boolean("is_active").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("color_palettes_slug_idx").on(table.slug)],
);

/* ==========================================================================
   فاز ۱ — محصولات، تنوع، واحدها، دسته‌بندی درختی
   ========================================================================== */

/** دسته‌بندی درختی — روابط با parent_id */
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id").references((): any => categories.id, {
      onDelete: "restrict",
    }),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    image: varchar("image", { length: 500 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

/** واحدهای اندازه‌گیری */
export const units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 60 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }),
    symbol: varchar("symbol", { length: 20 }),
    category: varchar("category", { length: 60 }).notNull().default("general"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("units_slug_idx").on(table.slug)],
);

/** محصولات */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    brandId: integer("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    subtitle: varchar("subtitle", { length: 300 }),
    description: text("description"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    coverImage: varchar("cover_image", { length: 500 }),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    metaTitle: varchar("meta_title", { length: 300 }),
    metaDesc: text("meta_desc"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("products_slug_idx").on(table.slug)],
);

/** تنوع‌های محصول */
export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    unitId: integer("unit_id").references(() => units.id, { onDelete: "restrict" }),
    sku: varchar("sku", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }),
    /** قیمت به ریال */
    price: decimal("price", { precision: 14, scale: 0 }).notNull().default("0"),
    /** تخفیف */
    hasDiscount: boolean("has_discount").notNull().default(false),
    discountType: varchar("discount_type", { length: 10 }).default("percent"),
    discountValue: decimal("discount_value", { precision: 14, scale: 0 }).default("0"),
    discountPrice: decimal("discount_price", { precision: 14, scale: 0 }).default("0"),
    /** مقدار واحد (مثلاً ۵ متر، ۲ شاخه) */
    unitValue: varchar("unit_value", { length: 60 }),
    stock: integer("stock").notNull().default(0),
    /** مشخصات فنی (key: value) */
    specSheet: jsonb("spec_sheet").$type<Record<string, string>>().default({}),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("variants_sku_idx").on(table.sku)],
);

/** سبدهای خرید مهمان/کاربر */
export const carts = pgTable(
  "carts",
  {
    id: serial("id").primaryKey(),
    sessionToken: varchar("session_token", { length: 80 }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("carts_session_token_idx").on(table.sessionToken),
    index("carts_user_id_idx").on(table.userId),
  ],
);

/** آیتم‌های سبد خرید — با snapshot از نام و قیمت هنگام افزودن */
export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    priceSnapshot: decimal("price_snapshot", { precision: 14, scale: 0 }).notNull().default("0"),
    productTitleSnapshot: varchar("product_title_snapshot", { length: 300 }).notNull(),
    variantTitleSnapshot: varchar("variant_title_snapshot", { length: 200 }).notNull(),
    unitLabelSnapshot: varchar("unit_label_snapshot", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cart_items_cart_variant_idx").on(table.cartId, table.variantId)],
);

/** علاقه‌مندی‌ها */
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    sessionToken: varchar("session_token", { length: 80 }).notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wishlist_session_product_idx").on(table.sessionToken, table.productId)],
);

/* ==========================================================================
   فاز ۱+ — اسلایدر لندینگ و ویژگی‌ها (قابل ویرایش از پنل ادمین)
   ========================================================================== */

/** اسلایدهای لندینگ — متن/دکمه/تصویر هر اسلاید از ادمین مدیریت می‌شود */
export const landingSlides = pgTable("landing_slides", {
  id: serial("id").primaryKey(),
  badge: varchar("badge", { length: 200 }),
  title: varchar("title", { length: 300 }).notNull(),
  subtitle: text("subtitle"),
  ctaText: varchar("cta_text", { length: 120 }),
  ctaHref: varchar("cta_href", { length: 300 }),
  cta2Text: varchar("cta2_text", { length: 120 }),
  cta2Href: varchar("cta2_href", { length: 300 }),
  /** رنگ تأکید هر اسلاید (HEX) — اختیاری */
  accentColor: varchar("accent_color", { length: 20 }),
  /** تصویر پس‌زمینه اسلاید — اختیاری */
  image: varchar("image", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** ویژگی‌های بخش «چرا درنیکا ساحل» — قابل ویرایش در ادمین */
export const landingFeatures = pgTable("landing_features", {
  id: serial("id").primaryKey(),
  icon: varchar("icon", { length: 60 }).notNull().default("ShieldCheck"),
  title: varchar("title", { length: 200 }).notNull(),
  desc: text("desc").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type ColorPalette = typeof colorPalettes.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
/* ==========================================================================
   فاز ۳ — احراز هویت، کاربران، آدرس‌ها و تاریخچه سفارش‌ها
   ========================================================================== */

/** کاربران فروشگاه (مشتریان، پیمانکاران B2B) */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 200 }),
    name: varchar("name", { length: 160 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 40 }).notNull().default("customer"), // customer, contractor
    companyName: varchar("company_name", { length: 200 }),
    economicCode: varchar("economic_code", { length: 80 }),
    avatar: varchar("avatar", { length: 500 }),
    birthDate: date("birth_date"),
    isActive: boolean("is_active").notNull().default(true),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_phone_idx").on(table.phone)],
);

/** آدرس‌های کاربران */
export const userAddresses = pgTable(
  "user_addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 100 }).notNull(), // مثلا دفتر مرکزی، کارخانه، خانه
    province: varchar("province", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    postalAddress: text("postal_address").notNull(),
    postalCode: varchar("postal_code", { length: 20 }),
    receiverName: varchar("receiver_name", { length: 160 }),
    receiverPhone: varchar("receiver_phone", { length: 30 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** سفارش‌ها */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 60 }).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 60 }).notNull().default("pending_payment"), // pending_payment, paid, processing, shipped, delivered, cancelled
    totalAmount: decimal("total_amount", { precision: 14, scale: 0 }).notNull().default("0"),
    shippingCost: decimal("shipping_cost", { precision: 14, scale: 0 }).notNull().default("0"),
    shippingAddress: text("shipping_address").notNull(),
    province: varchar("province", { length: 100 }).notNull().default(""),
    city: varchar("city", { length: 100 }).notNull().default(""),
    postalCode: varchar("postal_code", { length: 20 }),
    receiverName: varchar("receiver_name", { length: 160 }),
    receiverPhone: varchar("receiver_phone", { length: 30 }),
    paymentMethod: varchar("payment_method", { length: 80 }).default("zarinpal"),
    paymentRef: varchar("payment_ref", { length: 120 }),
    shippingMethodId: integer("shipping_method_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("orders_number_idx").on(table.orderNumber)],
);

/** اقلام سفارش */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    sku: varchar("sku", { length: 100 }).notNull(),
    productTitle: varchar("product_title", { length: 300 }).notNull(),
    variantTitle: varchar("variant_title", { length: 200 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 14, scale: 0 }).notNull().default("0"),
    lineTotal: decimal("line_total", { precision: 14, scale: 0 }).notNull().default("0"),
  },
);

export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type LandingSlide = typeof landingSlides.$inferSelect;
export type LandingFeature = typeof landingFeatures.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserAddress = typeof userAddresses.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

/* ==========================================================================
   فاز ۵ — آپلود فایل و تنظیمات ادمین
   ========================================================================== */

/** فایل‌های آپلودی (تصاویر اسلایدر، محصولات و غیره) */
export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  /** مسیر عمومی فایل (مثل /uploads/abc.jpg) */
  url: varchar("url", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  /** دسته‌بندی فایل برای تفکیک (slide, product, blog, general) */
  category: varchar("category", { length: 40 }).notNull().default("general"),
  altText: varchar("alt_text", { length: 255 }),
  /** visibility: public یا private */
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"),
  /** ownerUserId: کاربری که فایل را آپلود کرده (برای فایل‌های خصوصی) */
  ownerUserId: integer("owner_user_id"),
  /** ownerType: admin یا user */
  ownerType: varchar("owner_type", { length: 20 }).notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** درخواست‌های استعلام قیمت */
export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 200 }),
  company: varchar("company", { length: 200 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 40 }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** لیست ارائه‌دهندگان SMS (کانفیگ از ادمین) */
export const smsProviders = pgTable(
  "sms_providers",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 40 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    apiKey: text("api_key"),
    senderNumber: varchar("sender_number", { length: 40 }),
    isActive: boolean("is_active").notNull().default(false),
    config: jsonb("config").$type<Record<string, string>>().default({}),
  },
  (table) => [uniqueIndex("sms_providers_slug_idx").on(table.slug)],
);

/* ==========================================================================
   فاز ۶ — هوش مصنوعی و اتوماسیون قیمت
   ========================================================================== */

/** گزارش اجرای آپدیت قیمت از اکسل */
export const aiPriceUpdateJobs = pgTable("ai_price_update_jobs", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mode: varchar("mode", { length: 20 }).notNull().default("dry_run"), // dry_run | apply
  totalRows: integer("total_rows").notNull().default(0),
  matchedRows: integer("matched_rows").notNull().default(0),
  updatedRows: integer("updated_rows").notNull().default(0),
  errorRows: integer("error_rows").notNull().default(0),
  report: jsonb("report").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** رخداد مصرف مدل‌های هوش مصنوعی؛ متن prompt ذخیره نمی‌شود تا حریم خصوصی حفظ شود. */
export const aiUsageEvents = pgTable("ai_usage_events", {
  id: serial("id").primaryKey(),
  agent: varchar("agent", { length: 80 }).notNull().default("chat"),
  task: varchar("task", { length: 80 }).notNull().default("chat"),
  provider: varchar("provider", { length: 80 }).notNull(),
  model: varchar("model", { length: 160 }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  isAdmin: boolean("is_admin").notNull().default(false),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCostUsd: decimal("estimated_cost_usd", { precision: 14, scale: 8 }).notNull().default("0"),
  usageSource: varchar("usage_source", { length: 30 }).notNull().default("provider"),
  latencyMs: integer("latency_ms").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("success"),
  errorCode: varchar("error_code", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** حافظه (تاریخچه) مکالمات دستیار هوشمند */
export const assistantSessions = pgTable(
  "assistant_sessions",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 128 }).notNull(), // شناسه کاربر یا توکن مهمان
    messages: jsonb("messages").$type<any[]>().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("assistant_sessions_session_id_idx").on(table.sessionId)],
);

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type SmsProvider = typeof smsProviders.$inferSelect;
export type AiPriceUpdateJob = typeof aiPriceUpdateJobs.$inferSelect;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type AssistantSession = typeof assistantSessions.$inferSelect;

/* ==========================================================================
   فاز ۶ — برندها، تگ‌ها و ارتباط محصول-تگ
   ========================================================================== */

/** برندهای محصولات */
export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brands_slug_idx").on(table.slug)],
);

/** تگ‌های محصولات */
export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tags_slug_idx").on(table.slug)],
);

/** جدول میانی محصول-تگ */
export const productTags = pgTable(
  "product_tags",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("product_tags_unique_idx").on(table.productId, table.tagId)],
);

export type Brand = typeof brands.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ProductTag = typeof productTags.$inferSelect;

/* ==========================================================================
   فاز ۷ — بلاگ، اسلایدر، پیام‌های تماس و تاریخچه سفارشات
   ========================================================================== */

/** دسته‌بندی بلاگ */
export const blogCategories = pgTable(
  "blog_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("blog_categories_slug_idx").on(table.slug)],
);

/** پست‌های بلاگ */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    excerpt: text("excerpt"),
    content: text("content"),
    featuredImage: varchar("featured_image", { length: 500 }),
    mediaType: varchar("media_type", { length: 20 }).notNull().default("image"),
    categoryId: integer("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    views: integer("views").notNull().default(0),
    metaTitle: varchar("meta_title", { length: 300 }),
    metaDesc: text("meta_desc"),
    allowComments: boolean("allow_comments").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("blog_posts_slug_idx").on(table.slug)],
);

/** ارتباط پست بلاگ و تگ */
export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("blog_post_tags_unique_idx").on(table.postId, table.tagId)],
);

/** اسلایدهای لندینگ (جدید) */
export const slides = pgTable(
  "slides",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }),
    subtitle: varchar("subtitle", { length: 300 }),
    description: text("description"),
    mediaType: varchar("media_type", { length: 20 }).notNull().default("image"),
    desktopImage: varchar("desktop_image", { length: 500 }),
    mobileImage: varchar("mobile_image", { length: 500 }),
    buttonText: varchar("button_text", { length: 100 }),
    buttonLink: varchar("button_link", { length: 300 }),
    buttonColor: varchar("button_color", { length: 20 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** پیام‌های تماس با ما */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }),
    phone: varchar("phone", { length: 30 }),
    subject: varchar("subject", { length: 200 }),
    message: text("message").notNull(),
    type: varchar("type", { length: 40 }).notNull().default("contact"),
    status: varchar("status", { length: 30 }).notNull().default("unread"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** تاریخچه سفارشات */
export const orderHistory = pgTable(
  "order_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** روش‌های حمل و نقل */
export const shippingMethods = pgTable(
  "shipping_methods",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    /** هزینه به ریال */
    cost: decimal("cost", { precision: 14, scale: 0 }).notNull().default("0"),
    /** حداقل مبلغ سبد خرید برای ارسال رایگان (0 = غیرفعال) */
    freeThreshold: decimal("free_threshold", { precision: 14, scale: 0 }).notNull().default("0"),
    /** تعداد روزهای تحویل (مثلاً "۲ تا ۴ روز کاری") */
    deliveryDays: varchar("delivery_days", { length: 100 }),
    /** آیا رایگان است (override هزینه) */
    isFree: boolean("is_free").notNull().default(false),
    /** آیکون/لوگو (مثلاً emoji یا نام فایل) */
    logo: varchar("logo", { length: 50 }),
    /** آدرس پایه رهگیری (مثلاً https://tracking.post.ir/) */
    trackingBaseUrl: varchar("tracking_base_url", { length: 500 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** رویدادهای رهگیری سفارش */
export const orderTracking = pgTable(
  "order_tracking",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    /** وضعیت رهگیری: picked_up, in_transit, out_for_delivery, delivered, failed_attempt, returned, customs, warehouse */
    status: varchar("status", { length: 60 }).notNull(),
    /** عنوان قابل نمایش (مثلاً "مرسوله تحویل پست شد") */
    title: varchar("title", { length: 300 }).notNull(),
    /** توضیحات کامل */
    description: text("description"),
    /** کد رهگیری پستی/تیپاکس/… */
    trackingCode: varchar("tracking_code", { length: 200 }),
    /** تاریخ تخمینی تحویل */
    estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
    /** مکان فعلی (اختیاری) */
    location: varchar("location", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_tracking_order_idx").on(table.orderId)],
);

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type OrderTracking = typeof orderTracking.$inferSelect;
export type OrderHistory = typeof orderHistory.$inferSelect;

/* ==========================================================================
   فاز ۸ — اینستاگرام
   ========================================================================== */

/** اکانت‌های اینستاگرام */
export const instagramAccounts = pgTable(
  "instagram_accounts",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 200 }).notNull(),
    password: text("password").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    /** لینک V2Ray برای اتصال به اینستاگرام (vless://, vmess://, trojan://, ss://) */
    v2rayLink: text("v2ray_link"),
    /** نوع پروکسی: v2ray | http | socks5 | none */
    proxyType: varchar("proxy_type", { length: 20 }).notNull().default("v2ray"),
    /** کانفیگ پروکسی دلخواه (host, port, username, password, ...) */
    proxyConfig: jsonb("proxy_config").$type<Record<string, string>>().default({}),
    /** آیا پروکسی فعال باشد */
    useProxy: boolean("use_proxy").notNull().default(true),
    /** وضعیت VPN */
    vpnStatus: varchar("vpn_status", { length: 30 }).notNull().default("unknown"),
    /** آخرین پینگ موفق VPN */
    lastPingAt: timestamp("last_ping_at", { withTimezone: true }),
    /** هشدار قطعی VPN */
    vpnAlertEnabled: boolean("vpn_alert_enabled").notNull().default(true),
    /** وضعیت تایید دو مرحله‌ای */
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    /** روش تایید دو مرحله‌ای: app | sms */
    twoFactorMethod: varchar("two_factor_method", { length: 10 }).default("app"),
    /** کد پشتیبان یا سکرات 2FA */
    twoFactorSecret: text("two_factor_secret"),
    /** وضعیت اتصال */
    loginStatus: varchar("login_status", { length: 40 }).notNull().default("not_connected"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    cookieData: text("cookie_data"),
    errorMessage: text("error_message"),
    /** آمار اکانت */
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    mediaCount: integer("media_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** صف پست‌های اینستاگرام (برنامه‌ریزی شده / منتشر شده) */
export const instagramPosts = pgTable(
  "instagram_posts",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id").notNull().references(() => instagramAccounts.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    /** image | video | carousel */
    mediaType: varchar("media_type", { length: 30 }).notNull().default("image"),
    caption: text("caption"),
    hashtags: text("hashtags"),
    /** مسیر فایل‌های رسانه در سرور */
    mediaPaths: jsonb("media_paths").$type<string[]>().notNull().default([]),
    /** شناسه پست در اینستاگرام بعد از انتشار */
    instagramPostId: varchar("instagram_post_id", { length: 100 }),
    instagramPermalink: varchar("instagram_permalink", { length: 500 }),
    /** draft | scheduled | published | failed */
    status: varchar("status", { length: 30 }).notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    aiPrompt: text("ai_prompt"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("instagram_posts_account_idx").on(table.accountId),
    index("instagram_posts_status_idx").on(table.status),
    index("instagram_posts_scheduled_idx").on(table.scheduledAt),
  ],
);

/** قوانین پاسخگویی خودکار به دایرکت‌ها */
export const instagramDmRules = pgTable(
  "instagram_dm_rules",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id").notNull().references(() => instagramAccounts.id, { onDelete: "cascade" }),
    /** کلمات کلیدی ماشه */
    triggerKeywords: jsonb("trigger_keywords").$type<string[]>().notNull().default([]),
    /** text | product_link | ai */
    responseType: varchar("response_type", { length: 30 }).notNull().default("text"),
    responseText: text("response_text"),
    aiPrompt: text("ai_prompt"),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("instagram_dm_rules_account_idx").on(table.accountId)],
);

/** تاریخچه مکالمات دایرکت */
export const instagramConversations = pgTable(
  "instagram_conversations",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id").notNull().references(() => instagramAccounts.id, { onDelete: "cascade" }),
    /** شناسه کاربر اینستاگرام */
    senderId: varchar("sender_id", { length: 100 }).notNull(),
    senderUsername: varchar("sender_username", { length: 200 }),
    message: text("message").notNull(),
    /** received | sent | auto_replied */
    direction: varchar("direction", { length: 30 }).notNull().default("received"),
    repliedWithRule: integer("replied_with_rule"),
    repliedPostId: integer("replied_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("instagram_conversations_account_idx").on(table.accountId),
    index("instagram_conversations_sender_idx").on(table.senderId),
  ],
);

export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type InstagramPost = typeof instagramPosts.$inferSelect;
export type InstagramDmRule = typeof instagramDmRules.$inferSelect;
export type InstagramConversation = typeof instagramConversations.$inferSelect;