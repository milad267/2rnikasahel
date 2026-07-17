import { relations } from "drizzle-orm/relations";
import { users, aiUsageEvents, blogCategories, blogPosts, blogPostTags, tags, carts, cartItems, productVariants, products, units, categories, orders, orderHistory, orderItems, productTags, quoteRequests, userAddresses, wishlistItems, brands } from "./schema";

export const aiUsageEventsRelations = relations(aiUsageEvents, ({one}) => ({
	user: one(users, {
		fields: [aiUsageEvents.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	aiUsageEvents: many(aiUsageEvents),
	blogPosts: many(blogPosts),
	orders: many(orders),
	orderHistories: many(orderHistory),
	quoteRequests: many(quoteRequests),
	userAddresses: many(userAddresses),
}));

export const blogPostsRelations = relations(blogPosts, ({one, many}) => ({
	blogCategory: one(blogCategories, {
		fields: [blogPosts.categoryId],
		references: [blogCategories.id]
	}),
	user: one(users, {
		fields: [blogPosts.authorId],
		references: [users.id]
	}),
	blogPostTags: many(blogPostTags),
}));

export const blogCategoriesRelations = relations(blogCategories, ({many}) => ({
	blogPosts: many(blogPosts),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({one}) => ({
	blogPost: one(blogPosts, {
		fields: [blogPostTags.postId],
		references: [blogPosts.id]
	}),
	tag: one(tags, {
		fields: [blogPostTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	blogPostTags: many(blogPostTags),
	productTags: many(productTags),
}));

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	cart: one(carts, {
		fields: [cartItems.cartId],
		references: [carts.id]
	}),
	productVariant: one(productVariants, {
		fields: [cartItems.variantId],
		references: [productVariants.id]
	}),
}));

export const cartsRelations = relations(carts, ({one, many}) => ({
	cartItems: many(cartItems),
	user: one(users, {
		fields: [carts.userId],
		references: [users.id],
	}),
}));

export const productVariantsRelations = relations(productVariants, ({one, many}) => ({
	cartItems: many(cartItems),
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
	unit: one(units, {
		fields: [productVariants.unitId],
		references: [units.id]
	}),
	orderItems: many(orderItems),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	productVariants: many(productVariants),
	productTags: many(productTags),
	wishlistItems: many(wishlistItems),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	brand: one(brands, {
		fields: [products.brandId],
		references: [brands.id]
	}),
}));

export const unitsRelations = relations(units, ({many}) => ({
	productVariants: many(productVariants),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
	products: many(products),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	orderHistories: many(orderHistory),
	orderItems: many(orderItems),
}));

export const orderHistoryRelations = relations(orderHistory, ({one}) => ({
	order: one(orders, {
		fields: [orderHistory.orderId],
		references: [orders.id]
	}),
	user: one(users, {
		fields: [orderHistory.userId],
		references: [users.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	productVariant: one(productVariants, {
		fields: [orderItems.variantId],
		references: [productVariants.id]
	}),
}));

export const productTagsRelations = relations(productTags, ({one}) => ({
	product: one(products, {
		fields: [productTags.productId],
		references: [products.id]
	}),
	tag: one(tags, {
		fields: [productTags.tagId],
		references: [tags.id]
	}),
}));

export const quoteRequestsRelations = relations(quoteRequests, ({one}) => ({
	user: one(users, {
		fields: [quoteRequests.userId],
		references: [users.id]
	}),
}));

export const userAddressesRelations = relations(userAddresses, ({one}) => ({
	user: one(users, {
		fields: [userAddresses.userId],
		references: [users.id]
	}),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({one}) => ({
	product: one(products, {
		fields: [wishlistItems.productId],
		references: [products.id]
	}),
}));

export const brandsRelations = relations(brands, ({many}) => ({
	products: many(products),
}));