import { notFound } from "next/navigation";
import { Layers, Hash } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import { getProductBySlug } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";
import { ProductGallery } from "@/components/commerce/ProductGallery";
import { ProductTabs } from "@/components/commerce/ProductTabs";
import { SimpleAddToCart } from "@/components/commerce/SimpleAddToCart";
import { VariantSelector } from "./VariantSelector";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const sessionToken = await readSessionToken();
  const wishlistedIds = await getWishlistProductIds(sessionToken);
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const allImages = product.coverImage
    ? [product.coverImage, ...(product.images || [])]
    : [];
  const hasVariants = product.variants.length > 0;

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        {/* مسیر ناوبری */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-charcoal-500">
          <a href="/shop" className="transition-colors hover:text-petrol-600">{t.nav.shop}</a>
          <span>/</span>
          <span className="text-navy-900">{product.title}</span>
        </nav>

        {/* ─── بخش اصلی: گالری + اطلاعات ─── */}
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* گالری تصاویر */}
          <ProductGallery images={allImages} title={product.title} />

          {/* اطلاعات محصول */}
          <div className="flex flex-col gap-5">
            {/* دسته‌بندی */}
            {product.categoryTitle && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-petrol-600/10 px-3 py-1 text-[11px] font-medium text-petrol-700">
                {product.categoryTitle}
              </span>
            )}

            {/* نام محصول */}
            <h1 className="text-2xl font-black text-navy-900 sm:text-3xl lg:text-4xl leading-tight">
              {product.title}
            </h1>

            {/* کد محصول و اطلاعات پایه */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500">
              {product.variants[0]?.sku && (
                <span className="flex items-center gap-1.5 rounded-lg bg-navy-900/[0.04] px-2.5 py-1.5 font-medium">
                  <Hash className="size-3.5" strokeWidth={1.7} />
                  کد محصول: {product.variants[0].sku}
                </span>
              )}
              {product.variants.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5" strokeWidth={1.7} />
                  {product.variants.length} تنوع
                </span>
              )}
            </div>

            {/* توضیح کوتاه */}
            {product.subtitle && (
              <p className="text-sm leading-7 text-charcoal-600 border-r-2 border-petrol-400 pr-4 py-1 bg-navy-900/[0.02] rounded-lg">
                {product.subtitle}
              </p>
            )}

            {/* جداساز */}
            <div className="border-t border-navy-900/10" />

            {/* انتخاب تنوع + افزودن به سبد */}
            {hasVariants ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-navy-700">
                  <Layers className="size-4" strokeWidth={1.7} />
                  تنوع را انتخاب کنید:
                </div>
                <VariantSelector
                  variants={product.variants.map((v) => ({
                    id: v.id,
                    name: v.name,
                    nameEn: v.nameEn,
                    price: v.price,
                    unitValue: v.unitValue,
                    stock: v.stock,
                    sku: v.sku,
                    unitName: v.unitName,
                    unitSymbol: v.unitSymbol,
                    specSheet: v.specSheet,
                  }))}
                  locale={locale}
                />
              </div>
            ) : (

              /* محصول بدون تنوع — دکمه ساده افزودن به سبد */
              <SimpleAddToCart
                productId={product.id}
                variantId={product.variants[0]?.id || 0}
                price={product.variants[0]?.price || "0"}
                stock={product.variants[0]?.stock || 0}
              />
            )}

            {/* دکمه علاقه‌مندی */}
            <div className="mt-2">
              <WishlistToggleButton
                productId={product.id}
                initialWishlisted={wishlistedIds.includes(product.id)}
              />
            </div>
          </div>
        </div>

        {/* ─── تب‌های پایین ─── */}
        <div className="mt-10">
          <ProductTabs
            description={product.description}
            specSheet={product.variants[0]?.specSheet || null}
            categoryTitle={product.categoryTitle}
          />
        </div>
      </div>
    </div>
  );
}

// کامپوننت SimpleAddToCart به فایل جدا منتقل شد: src/components/commerce/SimpleAddToCart.tsx
