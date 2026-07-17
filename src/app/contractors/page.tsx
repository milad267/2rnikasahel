import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { Handshake, FileText, BarChart3, Users, ArrowLeft } from "lucide-react";

export default async function ContractorsPage() {
  const user = await getCurrentUser();
  const { t } = await getI18n();

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-[2rem] bg-petrol-600/10">
            <Handshake className="size-10 text-petrol-600" strokeWidth={1.4} />
          </div>
        </div>
        <div className="mt-6 text-center">
          <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">پنل پیمانکاران</h1>
          <p className="mt-2 text-sm text-charcoal-500">پرتال اختصاصی پیمانکاران و فعالان صنعت تأسیسات</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          <div className="card rounded-[1.75rem] p-6">
            <FileText className="size-8 text-petrol-600" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-bold text-navy-900">استعلام قیمت</h3>
            <p className="mt-2 text-xs leading-6 text-charcoal-500">درخواست قیمت عمده برای پروژه‌های خود ثبت کنید و بهترین پیشنهاد را دریافت نمایید.</p>
            <Link href="/quote" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-petrol-600 hover:text-petrol-500">ثبت درخواست <ArrowLeft className="size-3" /></Link>
          </div>
          <div className="card rounded-[1.75rem] p-6">
            <BarChart3 className="size-8 text-petrol-600" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-bold text-navy-900">داشبورد پروژه</h3>
            <p className="mt-2 text-xs leading-6 text-charcoal-500">مدیریت پروژه‌ها، پیگیری سفارشات و مشاهده تاریخچه خرید.</p>
            <Link href={user ? "/profile" : "/login?next=/profile"} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-petrol-600 hover:text-petrol-500">ورود به پنل <ArrowLeft className="size-3" /></Link>
          </div>
          <div className="card rounded-[1.75rem] p-6">
            <Users className="size-8 text-petrol-600" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-bold text-navy-900">تخفیف اختصاصی</h3>
            <p className="mt-2 text-xs leading-6 text-charcoal-500">پیمانکاران ثبت‌نام شده از تخفیف‌های ویژه و قیمت‌های اختصاصی بهره‌مند می‌شوند.</p>
          </div>
        </div>

        {!user && (
          <div className="mt-12 text-center">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500 transition-all">
              ثبت‌نام به عنوان پیمانکار
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
