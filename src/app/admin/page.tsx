import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { products, productVariants, units, orders, users, landingSlides, landingFeatures, categories, uploadedFiles } from "@/db/schema";
import { sql } from "drizzle-orm";
import { AdminDashboard } from "./AdminDashboard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ShieldCheck, ArrowLeft, Database } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // فعلاً: هر کاربر لاگین‌شده (customer/contractor) می‌تواند پنل ادمین را ببیند
  // (دکمه تستی؛ در فاز ۹ با نقش admin قفل می‌شود)
  const counts = await getDashboardCounts();

  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* هدر پنل */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-navy-900/10 bg-gradient-to-r from-navy-900/[0.04] via-pearl-100 to-petrol-600/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-navy-900 text-pearl-50 shadow-lg sm:size-20">
              <ShieldCheck className="size-8 sm:size-10" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">پنل مدیریت درنیکا ساحل</h1>
              <p className="mt-1 text-xs text-charcoal-500 sm:text-sm">
                خوش آمدید {user.name} ({user.role}) — ساخته شده توسط میلاد قلی‌پور
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-900/10 bg-white px-4 py-2 text-xs font-semibold text-navy-900"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.8} />
              بازگشت به سایت
            </Link>
            <LogoutButton />
          </div>
        </div>

        <AdminDashboard counts={counts} />
      </div>
    </div>
  );
}

async function getDashboardCounts() {
  const [prod] = await db.select({ c: sql<number>`count(*)::int` }).from(products);
  const [varCount] = await db.select({ c: sql<number>`count(*)::int` }).from(productVariants);
  const [unitCount] = await db.select({ c: sql<number>`count(*)::int` }).from(units);
  const [orderCount] = await db.select({ c: sql<number>`count(*)::int` }).from(orders);
  const [userCount] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  const [catCount] = await db.select({ c: sql<number>`count(*)::int` }).from(categories);
  const [slideCount] = await db.select({ c: sql<number>`count(*)::int` }).from(landingSlides);
  const [featureCount] = await db.select({ c: sql<number>`count(*)::int` }).from(landingFeatures);
  const [fileCount] = await db.select({ c: sql<number>`count(*)::int` }).from(uploadedFiles);

  const recentOrders = await db.select().from(orders).orderBy(sql`created_at desc`).limit(5);

  return {
    products: prod?.c ?? 0,
    variants: varCount?.c ?? 0,
    units: unitCount?.c ?? 0,
    orders: orderCount?.c ?? 0,
    users: userCount?.c ?? 0,
    categories: catCount?.c ?? 0,
    slides: slideCount?.c ?? 0,
    features: featureCount?.c ?? 0,
    files: fileCount?.c ?? 0,
    recentOrders,
  };
}
