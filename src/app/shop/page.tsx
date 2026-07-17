import type { Metadata } from "next";
import Link from "next/link";
import { Search, Package, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getShopProducts, getAllCategories, getFeaturedProducts } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { CardCartButton } from "@/components/commerce/CardCartButton";
import { CategoryDropdown } from "@/components/shop/CategoryDropdown";
import { MobileCarousel } from "@/components/shop/MobileCarousel";
import { HorizontalScrollFeatured } from "@/components/shop/HorizontalScrollFeatured";
import { formatRial, cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `فروشگاه | ${SITE_NAME}`,
  description: `خرید تجهیزات صنعتی و تأسیساتی از ${SITE_NAME} — پمپ، لوله، شیرآلات، مانومتر، هیتر و هزاران محصول دیگر با ضمانت اصالت.`,
};
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; page?: string }>;
}) {
  const { t } = await getI18n();
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const sessionToken = await readSessionToken();
  const [categories, wishlistedIds, result, featuredProducts] = await Promise.all([
    getAllCategories(),
    getWishlistProductIds(sessionToken),
    getShopProducts({
      categorySlug: params.cat,
      search: params.q,
      page: currentPage,
      limit: 20,
      excludeFeatured: false,
    }),
    getFeaturedProducts(12),
  ]);

  const products = result.data;
  const { total, totalPages } = result;

  // ساختن لینک صفحه بعدی/قبلی
  function buildPageUrl(page: number) {
    const sp = new URLSearchParams();
    if (params.cat) sp.set("cat", params.cat);
    if (params.q) sp.set("q", params.q);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return `/shop${qs ? "?" + qs : ""}`;
  }

  const showFeatured = featuredProducts.length > 0 && !params.cat && !params.q;

  return (
    <div className="min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        {/* محصولات ویژه — بالای همه چیز */}
        {showFeatured && (
          <div className="featured-box relative mb-8 rounded-[2rem] bg-gradient-to-br from-pearl-50 via-pearl-100/60 to-pearl-50 border border-petrol-400/20 p-5 sm:p-8 shadow-[0_0_40px_-15px_rgba(19,78,92,0.12)]">
            {/* روبان تزئینی بالای باکس */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:block">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-petrol-500 to-petrol-700 px-4 py-1 text-[10px] font-bold text-white shadow-lg">
                <Star className="size-3 fill-white" strokeWidth={2} />
                پیشنهاد ویژه
                <Star className="size-3 fill-white" strokeWidth={2} />
              </span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <span className="flex items-center justify-center size-10 rounded-full bg-gradient-to-br from-petrol-400 to-petrol-600 text-white shadow-md shadow-petrol-300/30 pulse-star">
                <Star className="size-5 fill-white" strokeWidth={1.5} />
              </span>
              <div>
                <h2 className="text-base font-black text-navy-900">محصولات ویژه</h2>
                <p className="text-[11px] text-petrol-700/70 font-medium">پیشنهادهای منتخب فروشگاه — برای مشاهده بقیه اسکرول کنید</p>
              </div>
              <div className="mr-auto hidden sm:flex items-center gap-1.5 text-[10px] text-petrol-600/60 font-medium">
                <span className="flex size-1.5 rounded-full bg-petrol-400 animate-pulse" />
                {featuredProducts.length} محصول
              </div>
            </div>
            <HorizontalScrollFeatured products={featuredProducts} wishlistedIds={wishlistedIds} />
          </div>
        )}

        {/* هدر فروشگاه */}
        <div className="mb-3 sm:mb-8">
          <h1 className="text-gradient-navy py-1 text-2xl font-black leading-[1.35] sm:text-5xl">
            {t.nav.shop}
          </h1>
          <p className="mt-1 text-xs text-charcoal-500 sm:mt-2 sm:text-sm">
            {total} محصول
            {params.cat ? ` در دسته "${categories.find((c) => c.slug === params.cat)?.title ?? params.cat}"` : ""}
            {totalPages > 1 && ` · صفحه ${currentPage} از ${totalPages}`}
          </p>
        </div>

        {/* فیلتر دسته‌بندی + جستجو */}
        <div className="flex flex-col gap-3 mb-5 sm:mb-0 sm:flex-row sm:items-center sm:justify-between">
          <CategoryDropdown categories={categories} />

          {/* جستجو */}
          <form className="flex items-center gap-2 rounded-2xl border border-navy-900/10 bg-white px-4 py-2.5 transition-all focus-within:border-petrol-400 sm:w-64">
            <Search className="size-4 shrink-0 text-charcoal-400" strokeWidth={1.6} />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={t.nav.search}
              className="w-full bg-transparent text-xs text-navy-900 placeholder-charcoal-400 outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-petrol-600 px-3 py-1 text-[10px] font-semibold text-pearl-50"
            >
              برو
            </button>
          </form>
        </div>

        {/* محصولات ویژه - اسکرول افقی (قدیمی - حذف شد) */}

        {/* شبکه محصولات */}
        {products.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center">
            <Package className="size-12 text-charcoal-400" strokeWidth={1.3} />
            <p className="text-charcoal-500">محصولی یافت نشد</p>
            <Link
              href="/shop"
              className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50"
            >
              نمایش همه
            </Link>
          </div>
        ) : (
          <div id="products">
            {/* موبایل: کاروسل با قابلیت درگ موس */}
            <MobileCarousel key={params.cat || `page-${currentPage}`} products={products} wishlistedIds={wishlistedIds} />

            {/* دسکتاپ: گرید ۴ ستونه */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((p) => (
                <article
                  key={p.id}
                  className="card group relative flex flex-col overflow-hidden rounded-[1.75rem] transition-all duration-400 hover:shadow-[0_30px_70px_-40px_rgba(19,78,92,0.6)] h-full"
                >
                  <WishlistToggleButton
                    productId={p.id}
                    initialWishlisted={wishlistedIds.includes(p.id)}
                    compact
                    className="absolute end-3 top-3 z-20 bg-pearl-100/90 backdrop-blur-md"
                  />
                  <Link href={`/shop/${p.slug}`} className="flex flex-1 flex-col" draggable={false}>
                    <div className="relative flex aspect-[10/9] items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
                      {p.coverImage ? (
                        <img src={p.coverImage} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" draggable={false} />
                      ) : (
                        <Package className="size-16 text-navy-700/30" strokeWidth={1.2} />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-5 min-h-[130px]">
                      <div>
                        <h3 className="text-sm font-bold leading-6 text-navy-900 transition-colors group-hover:text-petrol-700 line-clamp-2">
                          {p.title}
                        </h3>
                        {p.subtitle && (
                          <p className="mt-1 line-clamp-1 text-xs text-charcoal-500">{p.subtitle.replace(/<[^>]+>/g, '')}</p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-navy-900">
                          از {formatRial(p.minPrice)}
                        </span>
                        <CardCartButton
                          slug={p.slug}
                          variantCount={p.variantCount}
                          variantId={p.variantId}
                        />
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {/* دکمه صفحه قبل */}
                {currentPage > 1 && (
                  <Link href={buildPageUrl(currentPage - 1)}
                    className="flex items-center gap-1 rounded-xl border border-navy-900/10 bg-white px-4 py-2 text-xs font-semibold text-navy-900 hover:bg-navy-50 transition-colors">
                    <ChevronRight className="size-4" strokeWidth={2} />
                    قبلی
                  </Link>
                )}

                {/* شماره صفحات */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <Link key={pageNum} href={buildPageUrl(pageNum)}
                      className={cn(
                        "flex items-center justify-center min-w-[36px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                        pageNum === currentPage
                          ? "border-petrol-600 bg-petrol-600 text-white"
                          : "border-navy-900/10 bg-white text-navy-900 hover:bg-navy-50"
                      )}>
                      {pageNum}
                    </Link>
                  );
                })}

                {/* دکمه صفحه بعد */}
                {currentPage < totalPages && (
                  <Link href={buildPageUrl(currentPage + 1)}
                    className="flex items-center gap-1 rounded-xl border border-navy-900/10 bg-white px-4 py-2 text-xs font-semibold text-navy-900 hover:bg-navy-50 transition-colors">
                    بعدی
                    <ChevronLeft className="size-4" strokeWidth={2} />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}