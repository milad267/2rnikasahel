import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * لوگوی رسمی درنیکا ساحل — از فایل SVG اصلی استفاده می‌کند (بدون تغییر مسیرها).
 */
export function Logo({
  variant = "white",
  className,
  withWordmark = true,
  wordmark = "درنیکا ساحل",
}: {
  variant?: "white" | "dark";
  className?: string;
  withWordmark?: boolean;
  wordmark?: string;
}) {
  const src = variant === "white" ? "/logo/logo-white.svg" : "/logo/logo.svg";
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className="relative block size-10 shrink-0 sm:size-11">
        <Image
          src={src}
          alt="درنیکا ساحل"
          fill
          sizes="44px"
          className="object-contain"
          priority
        />
      </span>
      {withWordmark && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight text-pearl-50 md:text-base">
            {wordmark}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-petrol-300/70 md:text-[10px]">
            DORNIKA SAHEL
          </span>
        </span>
      )}
    </span>
  );
}
