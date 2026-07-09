import Link from "next/link";
import { Search, SlidersHorizontal, Package } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getShopProducts, getAllCategories } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { formatRial, cn } from "@/lib/utils";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { t } = await getI18n();
  const params = await searchParams;
  const sessionToken = await readSessionToken();
  const [categories, wishlistedIds, products] = await Promise.all([
    getAllCategories(),
    getWishlistProductIds(sessionToken),
    getShopProducts({
      categorySlug: params.cat,
      search: params.q,
    }),
  ]);

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        {/* هدر فروشگاه */}
        <div className="mb-8">
          <h1 className="text-gradient-navy py-1 text-3xl font-black leading-[1.35] sm:text-5xl">
            {t.nav.shop}
          </h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {products.length} محصول
            {params.cat ? ` در دسته "${categories.find((c) => c.slug === params.cat)?.title ?? params.cat}"` : ""}
          </p>
        </div>

        {/* فیلترها */}
        <div className="card mb-8 flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <SlidersHorizontal className="size-4 text-charcoal-400" strokeWidth={1.6} />
          <Link
            href="/shop"
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
              !params.cat
                ? "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)]"
                : "bg-navy-900/5 text-charcoal-500 hover:bg-navy-900/10",
            )}
          >
            همه
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?cat=${cat.slug}`}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                params.cat === cat.slug
                  ? "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)]"
                  : "bg-navy-900/5 text-charcoal-500 hover:bg-navy-900/10",
              )}
            >
              {cat.title} ({cat.productCount})
            </Link>
          ))}

          {/* جستجو */}
          <form className="ms-auto flex items-center gap-2 rounded-full bg-navy-900/5 px-3 py-1.5 sm:px-4">
            <Search className="size-4 shrink-0 text-charcoal-400" strokeWidth={1.6} />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={t.nav.search}
              className="w-28 bg-transparent text-xs text-navy-900 placeholder-charcoal-400 outline-none sm:w-40"
            />
            <button
              type="submit"
              className="rounded-full bg-petrol-600 px-3 py-1 text-[10px] font-semibold text-pearl-50"
            >
              برو
            </button>
          </form>
        </div>

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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <article
                key={p.id}
                className="card group relative overflow-hidden rounded-[1.75rem] transition-all duration-400 hover:shadow-[0_30px_70px_-40px_rgba(19,78,92,0.6)]"
              >
                <WishlistToggleButton
                  productId={p.id}
                  initialWishlisted={wishlistedIds.includes(p.id)}
                  compact
                  className="absolute end-3 top-3 z-20 bg-pearl-100/90 backdrop-blur-md"
                />
                <Link href={`/shop/${p.slug}`} className="block">
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
                    {p.coverImage ? (
                      <img src={p.coverImage} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <Package className="size-16 text-navy-700/30" strokeWidth={1.2} />
                    )}
                  </div>
                  <div className="p-5">
                    <span className="mb-2 inline-block rounded-full bg-petrol-600/10 px-2.5 py-0.5 text-[10px] font-medium text-petrol-700">
                      {p.categoryTitle}
                    </span>
                    <h3 className="text-sm font-bold leading-6 text-navy-900 transition-colors group-hover:text-petrol-700">
                      {p.title}
                    </h3>
                    {p.subtitle && (
                      <p className="mt-1 line-clamp-1 text-xs text-charcoal-500">{p.subtitle}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-900">
                        از {formatRial(p.minPrice)}
                      </span>
                      <span className="rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[10px] text-charcoal-500">
                        {p.variantCount} تنوع
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
