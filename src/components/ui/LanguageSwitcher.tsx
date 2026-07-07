"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleLocale() {
    const next = current === "fa" ? "en" : "fa";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label="تغییر زبان"
      aria-busy={pending}
      title={current === "fa" ? "Switch to English" : "تغییر به فارسی"}
      className="flex size-9 items-center justify-center rounded-full bg-pearl-50 text-navy-900 shadow-md transition-all hover:bg-pearl-100 hover:scale-105 disabled:opacity-60"
      disabled={pending}
    >
      <Languages className="size-4 text-petrol-700" strokeWidth={1.8} />
    </button>
  );
}
