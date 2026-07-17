import Link from "next/link";
import { Home, Search, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="relative mb-8">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-navy-900 to-petrol-700 text-white shadow-[var(--shadow-glow-petrol)]">
          <Compass className="size-12" strokeWidth={1.4} />
        </div>
      </div>

      <h1 className="text-6xl font-black text-navy-900">۴۰۴</h1>
      <p className="mt-3 text-lg font-bold text-navy-800">صفحه‌ای که دنبالش بودید پیدا نشد</p>
      <p className="mt-2 max-w-md text-sm leading-7 text-charcoal-500">
        ممکن است آدرس را اشتباه وارد کرده باشید یا این صفحه حذف یا جابه‌جا شده باشد.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Home className="size-4" /> بازگشت به خانه
        </Link>
        <Link
          href="/shop"
          className="flex items-center gap-2 rounded-xl border border-navy-900/15 px-5 py-2.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-900/[0.04]"
        >
          <Search className="size-4" /> مشاهده فروشگاه
        </Link>
      </div>
    </div>
  );
}
