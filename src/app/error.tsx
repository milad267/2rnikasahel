"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-lg">
        <AlertTriangle className="size-12" strokeWidth={1.4} />
      </div>

      <h1 className="text-2xl font-black text-navy-900">مشکلی پیش آمد!</h1>
      <p className="mt-2 max-w-md text-sm leading-7 text-charcoal-500">
        متأسفانه در نمایش این بخش خطایی رخ داد. می‌توانید دوباره تلاش کنید یا به صفحه‌ی اصلی بازگردید.
      </p>
      {error?.digest && (
        <p className="mt-2 font-mono text-[11px] text-charcoal-400">کد خطا: {error.digest}</p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="size-4" /> تلاش دوباره
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-navy-900/15 px-5 py-2.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-900/[0.04]"
        >
          <Home className="size-4" /> صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
