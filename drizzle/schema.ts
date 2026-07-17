import { pgTable, serial, integer, varchar, timestamp, jsonb, uniqueIndex, boolean, text, foreignKey, numeric, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const adminSessions = pgTable("admin_sessions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: varchar({ length: 200 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const aiPriceUpdateJobs = pgTable("ai_price_update_jobs", {
	id: serial().primaryKey().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	mode: varchar({ length: 20 }).default('dry_run').notNull(),
	totalRows: integer("total_rows").default(0).notNull(),
	matchedRows: integer("matched_rows").default(0).notNull(),
	updatedRows: integer("updated_rows").default(0).notNull(),
	errorRows: integer("error_rows").default(0).notNull(),
	report: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const brands = pgTable("brands", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	slug: varchar({ length: 200 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("brands_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const colorPalettes = pgTable("color_palettes", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 80 }).notNull(),
	name: varchar({ length: 120 }).notNull(),
	colors: jsonb().notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("color_palettes_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const contactMessages = pgTable("contact_messages", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 160 }).notNull(),
	email: varchar({ length: 200 }),
	phone: varchar({ length: 30 }),
	subject: varchar({ length: 200 }),
	message: text().notNull(),
	type: varchar({ length: 40 }).default('contact').notNull(),
	status: varchar({ length: 30 }).default('unread').notNull(),
	repliedAt: timestamp("replied_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const landingFeatures = pgTable("landing_features", {
	id: serial().primaryKey().notNull(),
	icon: varchar({ length: 60 }).default('ShieldCheck').notNull(),
	title: varchar({ length: 200 }).notNull(),
	desc: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
});

export const landingSlides = pgTable("landing_slides", {
	id: serial().primaryKey().notNull(),
	badge: varchar({ length: 200 }),
	title: varchar({ length: 300 }).notNull(),
	subtitle: text(),
	ctaText: varchar("cta_text", { length: 120 }),
	ctaHref: varchar("cta_href", { length: 300 }),
	cta2Text: varchar("cta2_text", { length: 120 }),
	cta2Href: varchar("cta2_href", { length: 300 }),
	accentColor: varchar("accent_color", { length: 20 }),
	image: varchar({ length: 500 }),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
	id: serial().primaryKey().notNull(),
	key: varchar({ length: 120 }).notNull(),
	group: varchar({ length: 80 }).default('general').notNull(),
	locale: varchar({ length: 5 }).default('fa').notNull(),
	value: jsonb().notNull(),
	description: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("site_settings_key_locale_idx").using("btree", table.key.asc().nullsLast().op("text_ops"), table.locale.asc().nullsLast().op("text_ops")),
]);

export const slides = pgTable("slides", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }),
	subtitle: varchar({ length: 300 }),
	description: text(),
	mediaType: varchar("media_type", { length: 20 }).default('image').notNull(),
	desktopImage: varchar("desktop_image", { length: 500 }),
	mobileImage: varchar("mobile_image", { length: 500 }),
	buttonText: varchar("button_text", { length: 100 }),
	buttonLink: varchar("button_link", { length: 300 }),
	buttonColor: varchar("button_color", { length: 20 }),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const smsProviders = pgTable("sms_providers", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 40 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	apiKey: text("api_key"),
	senderNumber: varchar("sender_number", { length: 40 }),
	isActive: boolean("is_active").default(false).notNull(),
	config: jsonb().default({}),
}, (table) => [
	uniqueIndex("sms_providers_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const aiUsageEvents = pgTable("ai_usage_events", {
	id: serial().primaryKey().notNull(),
	agent: varchar({ length: 80 }).default('chat').notNull(),
	task: varchar({ length: 80 }).default('chat').notNull(),
	provider: varchar({ length: 80 }).notNull(),
	model: varchar({ length: 160 }).notNull(),
	userId: integer("user_id"),
	isAdmin: boolean("is_admin").default(false).notNull(),
	promptTokens: integer("prompt_tokens").default(0).notNull(),
	completionTokens: integer("completion_tokens").default(0).notNull(),
	totalTokens: integer("total_tokens").default(0).notNull(),
	estimatedCostUsd: numeric("estimated_cost_usd", { precision: 14, scale:  8 }).default('0').notNull(),
	usageSource: varchar("usage_source", { length: 30 }).default('provider').notNull(),
	latencyMs: integer("latency_ms").default(0).notNull(),
	status: varchar({ length: 20 }).default('success').notNull(),
	errorCode: varchar("error_code", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_usage_events_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const blogPosts = pgTable("blog_posts", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 300 }).notNull(),
	slug: varchar({ length: 200 }).notNull(),
	excerpt: text(),
	content: text(),
	featuredImage: varchar("featured_image", { length: 500 }),
	mediaType: varchar("media_type", { length: 20 }).default('image').notNull(),
	categoryId: integer("category_id"),
	authorId: integer("author_id"),
	status: varchar({ length: 20 }).default('draft').notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	views: integer().default(0).notNull(),
	metaTitle: varchar("meta_title", { length: 300 }),
	metaDesc: text("meta_desc"),
	allowComments: boolean("allow_comments").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("blog_posts_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [blogCategories.id],
			name: "blog_posts_category_id_blog_categories_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "blog_posts_author_id_users_id_fk"
		}).onDelete("set null"),
]);

export const blogPostTags = pgTable("blog_post_tags", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	tagId: integer("tag_id").notNull(),
}, (table) => [
	uniqueIndex("blog_post_tags_unique_idx").using("btree", table.postId.asc().nullsLast().op("int4_ops"), table.tagId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [blogPosts.id],
			name: "blog_post_tags_post_id_blog_posts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "blog_post_tags_tag_id_tags_id_fk"
		}).onDelete("cascade"),
]);

export const tags = pgTable("tags", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("tags_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const blogCategories = pgTable("blog_categories", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("blog_categories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const carts = pgTable("carts", {
	id: serial().primaryKey().notNull(),
	sessionToken: varchar("session_token", { length: 80 }).notNull(),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("carts_session_token_idx").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	index("carts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "carts_user_id_users_id_fk"
	}).onDelete("set null"),
]);

export const cartItems = pgTable("cart_items", {
	id: serial().primaryKey().notNull(),
	cartId: integer("cart_id").notNull(),
	variantId: integer("variant_id").notNull(),
	quantity: integer().default(1).notNull(),
	priceSnapshot: numeric("price_snapshot", { precision: 14, scale:  0 }).default('0').notNull(),
	productTitleSnapshot: varchar("product_title_snapshot", { length: 300 }).notNull(),
	variantTitleSnapshot: varchar("variant_title_snapshot", { length: 200 }).notNull(),
	unitLabelSnapshot: varchar("unit_label_snapshot", { length: 80 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("cart_items_cart_variant_idx").using("btree", table.cartId.asc().nullsLast().op("int4_ops"), table.variantId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [carts.id],
			name: "cart_items_cart_id_carts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "cart_items_variant_id_product_variants_id_fk"
		}).onDelete("restrict"),
]);

export const productVariants = pgTable("product_variants", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	unitId: integer("unit_id"),
	sku: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	nameEn: varchar("name_en", { length: 200 }),
	price: numeric({ precision: 14, scale:  0 }).default('0').notNull(),
	unitValue: varchar("unit_value", { length: 60 }),
	stock: integer().default(0).notNull(),
	specSheet: jsonb("spec_sheet").default({}),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("variants_sku_idx").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_variants_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "product_variants_unit_id_units_id_fk"
		}).onDelete("restrict"),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	parentId: integer("parent_id"),
	slug: varchar({ length: 120 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	image: varchar({ length: 500 }),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("categories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}).onDelete("restrict"),
]);

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
	orderNumber: varchar("order_number", { length: 60 }).notNull(),
	userId: integer("user_id").notNull(),
	status: varchar({ length: 60 }).default('pending_payment').notNull(),
	totalAmount: numeric("total_amount", { precision: 14, scale:  0 }).default('0').notNull(),
	shippingAddress: text("shipping_address").notNull(),
	paymentMethod: varchar("payment_method", { length: 80 }).default('zarinpal'),
	paymentRef: varchar("payment_ref", { length: 120 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("orders_number_idx").using("btree", table.orderNumber.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_users_id_fk"
		}).onDelete("restrict"),
]);

export const orderHistory = pgTable("order_history", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	userId: integer("user_id"),
	action: varchar({ length: 100 }).notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_history_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "order_history_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const orderItems = pgTable("order_items", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	variantId: integer("variant_id"),
	sku: varchar({ length: 100 }).notNull(),
	productTitle: varchar("product_title", { length: 300 }).notNull(),
	variantTitle: varchar("variant_title", { length: 200 }).notNull(),
	quantity: integer().default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 14, scale:  0 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 14, scale:  0 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "order_items_variant_id_product_variants_id_fk"
		}).onDelete("set null"),
]);

export const productTags = pgTable("product_tags", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	tagId: integer("tag_id").notNull(),
}, (table) => [
	uniqueIndex("product_tags_unique_idx").using("btree", table.productId.asc().nullsLast().op("int4_ops"), table.tagId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_tags_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "product_tags_tag_id_tags_id_fk"
		}).onDelete("cascade"),
]);

export const units = pgTable("units", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 60 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameEn: varchar("name_en", { length: 100 }),
	symbol: varchar({ length: 20 }),
	category: varchar({ length: 60 }).default('general').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	uniqueIndex("units_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const quoteRequests = pgTable("quote_requests", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	name: varchar({ length: 160 }).notNull(),
	phone: varchar({ length: 30 }).notNull(),
	email: varchar({ length: 200 }),
	company: varchar({ length: 200 }),
	message: text().notNull(),
	status: varchar({ length: 40 }).default('new').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "quote_requests_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const userAddresses = pgTable("user_addresses", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: varchar({ length: 100 }).notNull(),
	province: varchar({ length: 100 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	postalAddress: text("postal_address").notNull(),
	postalCode: varchar("postal_code", { length: 20 }),
	receiverName: varchar("receiver_name", { length: 160 }),
	receiverPhone: varchar("receiver_phone", { length: 30 }),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_addresses_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const wishlistItems = pgTable("wishlist_items", {
	id: serial().primaryKey().notNull(),
	sessionToken: varchar("session_token", { length: 80 }).notNull(),
	productId: integer("product_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("wishlist_session_product_idx").using("btree", table.sessionToken.asc().nullsLast().op("int4_ops"), table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlist_items_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	categoryId: integer("category_id"),
	slug: varchar({ length: 200 }).notNull(),
	title: varchar({ length: 300 }).notNull(),
	subtitle: varchar({ length: 300 }),
	description: text(),
	images: jsonb().default([]).notNull(),
	coverImage: varchar("cover_image", { length: 500 }),
	isActive: boolean("is_active").default(true).notNull(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	metaTitle: varchar("meta_title", { length: 300 }),
	metaDesc: text("meta_desc"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	brandId: integer("brand_id"),
}, (table) => [
	uniqueIndex("products_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_categories_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [brands.id],
			name: "products_brand_id_fkey"
		}).onDelete("set null"),
]);

export const uploadedFiles = pgTable("uploaded_files", {
	id: serial().primaryKey().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	url: varchar({ length: 500 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	size: integer().notNull(),
	category: varchar({ length: 40 }).default('general').notNull(),
	altText: varchar("alt_text", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	visibility: varchar({ length: 20 }).default('public').notNull(),
	ownerUserId: integer("owner_user_id"),
	ownerType: varchar("owner_type", { length: 20 }).default('admin').notNull(),
}, (table) => [
	index("uploaded_files_visibility_owner_idx").using("btree", table.visibility.asc().nullsLast().op("int4_ops"), table.ownerUserId.asc().nullsLast().op("int4_ops")),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	phone: varchar({ length: 30 }).notNull(),
	email: varchar({ length: 200 }),
	name: varchar({ length: 160 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	role: varchar({ length: 40 }).default('customer').notNull(),
	companyName: varchar("company_name", { length: 200 }),
	economicCode: varchar("economic_code", { length: 80 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	avatar: varchar({ length: 500 }),
}, (table) => [
	uniqueIndex("users_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
]);

export const adminUsers = pgTable("admin_users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 160 }).notNull(),
	email: varchar({ length: 200 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	role: varchar({ length: 40 }).default('admin').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	setupState: varchar("setup_state", { length: 20 }).default('completed'),
}, (table) => [
	uniqueIndex("admin_users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("admin_users_superadmin_unique_idx").using("btree", sql`(
CASE
    WHEN ((role)::text = 'superadmin'::text) THEN 1
    `).where(sql`((role)::text = 'superadmin'::text)`),
]);
