import Link from "next/link";
import { Heart } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getWishlistPageData, readSessionToken } from "@/lib/commerce";
import { formatRial } from "@/lib/utils";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";

export default async function WishlistPage() {
  const { t } = await getI18n();
  const sessionToken = await readSessionToken();
  const items = await getWishlistPageData(sessionToken);

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-8">
          <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">{t.nav.wishlist}</h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {items.length > 0 ? `${items.length} محصول ذخیره شده` : "لیست علاقه‌مندی‌ها خالی است"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center">
            <Heart className="size-14 text-charcoal-400" strokeWidth={1.4} />
            <p className="text-charcoal-500">هنوز محصولی به علاقه‌مندی‌ها اضافه نشده است.</p>
            <Link
              href="/shop"
              className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50"
            >
              رفتن به فروشگاه
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <article key={item.id} className="card overflow-hidden rounded-[1.75rem]">
                <Link href={`/shop/${item.slug}`} className="block">
                  <div className="flex aspect-[10/9] items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="size-full object-cover transition-transform duration-500 hover:scale-105" />
                    ) : (
                      <Heart className="size-14 text-navy-700/20" strokeWidth={1.2} />
                    )}
                  </div>
                  <div className="p-5">
                    <span className="mb-2 inline-block rounded-full bg-petrol-600/10 px-2.5 py-0.5 text-[10px] font-medium text-petrol-700">
                      {item.categoryTitle}
                    </span>
                    <h3 className="text-sm font-bold leading-6 text-navy-900 transition-colors hover:text-petrol-700">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="mt-1 line-clamp-1 text-xs text-charcoal-500">{item.subtitle}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-900">
                        از {formatRial(item.minPrice)}
                      </span>
                      <span className="rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[10px] text-charcoal-500">
                        {item.variantCount} تنوع
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="px-5 pb-5">
                  <WishlistToggleButton productId={item.productId} initialWishlisted className="w-full justify-center" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
