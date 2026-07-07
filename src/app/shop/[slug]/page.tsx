import { notFound } from "next/navigation";
import { Package, Ruler, Layers } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getProductBySlug } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";
import { VariantSelector } from "./VariantSelector";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const sessionToken = await readSessionToken();
  const wishlistedIds = await getWishlistProductIds(sessionToken);
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* مسیر ناوبری ساده */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-charcoal-500">
          <a href="/shop" className="hover:text-petrol-600 transition-colors">
            {t.nav.shop}
          </a>
          <span>/</span>
          <span className="text-navy-900">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* گالری تصویر — placeholder تصویر */}
          <div className="card relative overflow-hidden rounded-[2rem]">
            {/* واترمارک */}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-[0.06]">
              <span className="rotate-[-22deg] text-6xl font-black tracking-widest text-navy-900 select-none">
                درنیکا ساحل
              </span>
            </div>
            <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
              <Package className="size-28 text-navy-700/25" strokeWidth={1.1} />
            </div>
          </div>

          {/* اطلاعات محصول */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-petrol-600/10 px-3 py-1 text-xs font-medium text-petrol-700">
                {product.categoryTitle}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-navy-900 sm:text-4xl">{product.title}</h1>
            {product.subtitle && (
              <p className="mt-3 text-sm leading-7 text-charcoal-500">{product.subtitle}</p>
            )}
            {product.description && (
              <p className="mt-4 text-sm leading-7 text-charcoal-500">{product.description}</p>
            )}

            {/* انتخاب واریانت (کامپوننت کلاینت) */}
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-navy-700">
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
              <div className="mt-3 flex flex-wrap gap-2">
                <WishlistToggleButton
                  productId={product.id}
                  initialWishlisted={wishlistedIds.includes(product.id)}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>

            {/* مشخصات فنی */}
            {product.variants.length > 0 && product.variants[0].specSheet && Object.keys(product.variants[0].specSheet ?? {}).length > 0 ? (
              <div className="mt-8">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-medium text-navy-700">
                  <Ruler className="size-4" strokeWidth={1.7} />
                  مشخصات فنی
                </h3>
                <div className="card grid grid-cols-2 gap-px overflow-hidden rounded-2xl text-xs">
                  {Object.entries(product.variants[0].specSheet ?? {}).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-navy-900/[0.02] px-4 py-2.5 flex justify-between"
                    >
                      <span className="text-charcoal-500">{key}</span>
                      <span className="font-medium text-navy-900">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
