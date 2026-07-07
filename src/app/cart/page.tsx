import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCartPageData, readSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { formatRial } from "@/lib/utils";
import { CartItemRow } from "@/components/commerce/CartItemRow";

export default async function CartPage() {
  const { t } = await getI18n();
  const sessionToken = await readSessionToken();
  const [cart, user] = await Promise.all([getCartPageData(sessionToken), getCurrentUser()]);

  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">{t.nav.cart}</h1>
            <p className="mt-2 text-sm text-charcoal-500">
              {cart.count > 0 ? `${cart.count} آیتم در سبد خرید` : "سبد خرید شما خالی است"}
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-pearl-50"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} />
            ادامه خرید
          </Link>
        </div>

        {cart.items.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center">
            <ShoppingBag className="size-14 text-charcoal-400" strokeWidth={1.4} />
            <p className="text-charcoal-500">هنوز چیزی به سبد خرید اضافه نشده است.</p>
            <Link
              href="/shop"
              className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50"
            >
              رفتن به فروشگاه
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={{
                    id: item.id,
                    quantity: item.quantity,
                    priceSnapshot: item.priceSnapshot,
                    productTitleSnapshot: item.productTitleSnapshot,
                    variantTitleSnapshot: item.variantTitleSnapshot,
                    unitLabelSnapshot: item.unitLabelSnapshot,
                    variantId: item.variantId,
                    productSlug: item.productSlug,
                    coverImage: item.coverImage,
                    categoryTitle: item.categoryTitle,
                    stock: item.stock,
                  }}
                />
              ))}
            </div>

            <aside className="card h-fit rounded-[2rem] p-6">
              <h2 className="text-lg font-bold text-navy-900">خلاصه سفارش</h2>
              <div className="mt-5 space-y-3 border-t border-navy-900/5 pt-5 text-sm">
                <div className="flex items-center justify-between text-charcoal-500">
                  <span>تعداد کالا</span>
                  <span className="font-medium text-navy-900">{cart.count}</span>
                </div>
                <div className="flex items-center justify-between text-charcoal-500">
                  <span>جمع کل</span>
                  <span className="font-bold text-navy-900">{formatRial(cart.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-charcoal-500">
                  <span>ارسال</span>
                  <span className="font-medium text-navy-900">پس از ثبت آدرس</span>
                </div>
              </div>
              <Link
                href={user ? "/checkout" : "/login?next=/cart"}
                className="mt-6 flex w-full items-center justify-center rounded-full bg-petrol-600 px-5 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500"
              >
                {user ? "تأیید و پرداخت نهایی" : "ورود جهت ادامه و پرداخت"}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
