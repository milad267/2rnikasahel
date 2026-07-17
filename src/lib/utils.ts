import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * قالب‌بندی مبلغ به ریال با جداکننده هزارگان و ارقام فارسی.
 * @param currencySymbol - واحد پول (پیش‌فرض "ریال")
 */
export function formatRial(value: number | string, opts?: { withUnit?: boolean; currencySymbol?: string }) {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  const formatted = new Intl.NumberFormat("fa-IR").format(Math.round(num));
  if (opts?.withUnit === false) return formatted;
  const unit = opts?.currencySymbol || "ریال";
  return `${formatted} ${unit}`;
}

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(input: string | number) {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(input).replace(/\d/g, (d) => fa[Number(d)]);
}
