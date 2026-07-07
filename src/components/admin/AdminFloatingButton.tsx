import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AdminFloatingButton() {
  return (
    <Link
      href="/admin"
      className="fixed bottom-5 left-5 z-40 hidden items-center gap-2 rounded-full bg-navy-900 px-4 py-2.5 text-xs font-bold text-pearl-50 shadow-[0_20px_60px_-25px_rgba(5,16,29,0.9)] transition-all hover:-translate-y-0.5 hover:bg-petrol-700 md:flex"
      title="دسترسی موقت پنل مدیریت"
    >
      <ShieldCheck className="size-4" strokeWidth={1.8} />
      پنل مدیریت
    </Link>
  );
}
