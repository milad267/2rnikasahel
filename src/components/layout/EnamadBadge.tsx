"use client";

/**
 * نماد اعتماد الکترونیکی (اناماد).
 * کد HTML دریافتی از enamad.ir را مستقیماً با dangerouslySetInnerHTML
 * در یک کانتینر شیشه‌ای نمایش می‌دهد.
 *
 * نحوه استفاده:
 * ۱. از سایت enamad.ir کد HTML مخصوص خود را دریافت کنید
 * ۲. در پنل ادمین > تنظیمات > بخش فوتر، کد را در فیلد "کد HTML اناماد" قرار دهید
 * ۳. کد به صورت خودکار در فوتر نمایش داده می‌شود
 *
 * نکته: تصویر اینماد فقط روی دامنه ثبت‌شده (نه localhost) نمایش داده می‌شود
 */
export function EnamadBadge({ code, className = "" }: { code: string; className?: string }) {
  if (!code || !code.trim()) return null;

  return (
    <div
      className={`
        glass flex items-center justify-center rounded-2xl p-3
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg
        ${className}
      `}
      aria-label="نماد اعتماد الکترونیکی"
    >
      <div
        className="enamad-badge"
        dangerouslySetInnerHTML={{ __html: code }}
      />
    </div>
  );
}
