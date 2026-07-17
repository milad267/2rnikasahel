"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * محتوای عمومی سایت (مثل «درباره ما» و فوتر) را در مسیرهای پنل مدیریت پنهان می‌کند.
 * از رندر شدن این بخش‌ها روی صفحات /admin جلوگیری می‌کند.
 */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
