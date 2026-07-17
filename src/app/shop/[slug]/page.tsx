import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Layers, Hash, Package, Eye, Tag, Building2 } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import { getProductBySlug, getShopProducts } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";
import { ProductGallery } from "@/components/commerce/ProductGallery";
import { ProductTabs } from "@/components/commerce/ProductTabs";
import { SimpleAddToCart } from "@/components/commerce/SimpleAddToCart";
import { VariantSelector } from "./VariantSelector";
import { SITE_NAME, absoluteUrl, truncate } from "@/lib/seo";
import { formatRial } from "@/lib/utils";
import { ProductReviews } from "@/components/commerce/ProductReviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "محصول یافت نشد" };
  }

  const description = truncate(
    product.subtitle || product.description || `خرید ${product.title} از ${SITE_NAME}`,
    160,
  );
  const url = absoluteUrl(`/shop/${product.slug}`);
  const image = product.coverImage ? absoluteUrl(product.coverImage) : undefined;

  return {
    title: product.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fa_IR",
      ...(image ? { images: [{ url: image, alt: product.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}


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
  
  // Check if product has real variants (more than 1, or variant name differs from product title)
  const hasRealVariants = product.variants.length > 1 || 
    (product.variants.length === 1 && product.variants[0].name !== product.title);
  
  // اگر محصول هیچ تنوع فعالی ندارد، یک پیام مناسب نشان بده
  const noActiveVariants = product.variants.length === 0;

  // محصولات مرتبط از همان دسته
  const relatedResult = await getShopProducts({ categorySlug: product.categorySlug || undefined, limit: 9 });
  const relatedProducts = relatedResult.data
    .filter(p => p.slug !== slug)
    .slice(0, 8);

  return (
    <div className="min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-44">
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
              {product.brandName && (
                <span className="flex items-center gap-1.5 rounded-lg bg-navy-900/[0.04] px-2.5 py-1.5 font-medium">
                  <Building2 className="size-3.5" strokeWidth={1.7} />
                  برند: {product.brandName}
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
                {product.subtitle.replace(/<[^>]+>/g, '')}
              </p>
            )}

            {/* جداساز */}
            <div className="border-t border-navy-900/10" />

            {/* انتخاب تنوع + افزودن به سبد */}
            {noActiveVariants ? (
              /* محصول بدون تنوع — یک تنوع پیش‌فرض خودکار ساخته می‌شود */
              <SimpleAddToCart
                productId={product.id}
                variantId={0}
                price="0"
                stock={999}
              />
            ) : hasRealVariants ? (
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
            brandName={product.brandName}
            categoryTitle={product.categoryTitle}
          />
        </div>

        {/* ─── نظرات کاربران ─── */}
        <div className="mt-10 max-w-2xl">
          <ProductReviews productId={product.id} />
        </div>

        {/* ─── محصولات مرتبط ─── */}
        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
                <Package className="size-5 text-petrol-600" strokeWidth={1.6} />
                محصولات مرتبط
              </h2>
              <Link href="/shop" className="text-xs font-medium text-petrol-600 hover:text-petrol-500">
                مشاهده همه
              </Link>
            </div>
            <div className="overflow-x-auto scroll-smooth no-scrollbar -mx-4 px-4">
              <div className="flex gap-4" style={{ width: `${relatedProducts.length * 280}px` }}>
                {relatedProducts.map((rp) => (
                  <Link key={rp.id} href={`/shop/${rp.slug}`} draggable={false}
                    className="card group w-[260px] shrink-0 overflow-hidden rounded-[1.5rem] transition-all hover:shadow-[0_20px_60px_-30px_rgba(19,78,92,0.5)]">
                    <div className="aspect-[4/3] bg-gradient-to-br from-navy-900/5 to-petrol-100">
                      {rp.coverImage ? (
                        <img src={rp.coverImage} alt={rp.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" draggable={false} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-navy-700/30"><Package className="size-10" strokeWidth={1.2} /></div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xs font-bold leading-5 text-navy-900 group-hover:text-petrol-700 line-clamp-1">{rp.title}</h3>
                      {rp.subtitle && <p className="mt-0.5 text-[10px] text-charcoal-500 line-clamp-1">{rp.subtitle}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-navy-900">{formatRial(rp.minPrice)}</span>
                        <Eye className="size-3.5 text-charcoal-400" strokeWidth={1.5} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// کامپوننت SimpleAddToCart به فایل جدا منتقل شد: src/components/commerce/SimpleAddToCart.tsx
