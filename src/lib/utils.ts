import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * قالب‌بندی مبلغ به ریال با جداکننده هزارگان و ارقام فارسی.
 */
export function formatRial(value: number | string, opts?: { withUnit?: boolean }) {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  const formatted = new Intl.NumberFormat("fa-IR").format(Math.round(num));
  return opts?.withUnit === false ? formatted : `${formatted} ریال`;
}

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(input: string | number) {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(input).replace(/\d/g, (d) => fa[Number(d)]);
}
