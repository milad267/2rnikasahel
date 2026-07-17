import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { Package } from "lucide-react";

export default async function CategoriesPage() {
  const { t } = await getI18n();
  const cats = await db
    .select({ id: categories.id, title: categories.title, slug: categories.slug, description: categories.description, image: categories.image })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">دسته‌بندی محصولات</h1>
        <p className="mt-2 text-sm text-charcoal-500">محصولات را بر اساس دسته‌بندی مرور کنید</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?cat=${cat.slug}`}
              className="card group relative overflow-hidden rounded-[1.75rem] transition-all hover:shadow-[0_20px_60px_-30px_rgba(19,78,92,0.5)]"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
                {cat.image ? (
                  <img src={cat.image} alt={cat.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Package className="size-20 text-navy-700/20" strokeWidth={1.1} />
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-navy-900 group-hover:text-petrol-700 transition-colors">{cat.title}</h3>
                {cat.description && <p className="mt-1 text-xs text-charcoal-500">{cat.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
