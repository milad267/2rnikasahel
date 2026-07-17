/**
 * متادیتا و ثابت‌های درگاه‌های پرداخت ایرانی
 */

export type PaymentGateway =
  | "zarinpal" | "zibal" | "idpay" | "payir" | "sep" | "saman" | "pasargad"
  | "mellat" | "saderat" | "tejarat" | "parsian" | "sarmayeh" | "tourism"
  | "dejpas" | "etebari" | "asanpardakht" | "payping" | "bitpay"
  | "novin" | "mehr" | "keshavarzi" | "refah" | "sina" | "karafarin"
  | "day" | "iranian" | "aghah" | "saba" | "bsi" | "hekmat"
  | "gardeshgari" | "sadaad" | "sandbox"
  | "usdt" | "bitcoin";

export type GatewayCategory = "iranian";

export interface GatewayMeta {
  slug: PaymentGateway;
  name: string;
  desc: string;
  category: GatewayCategory;
  fields: { key: string; label: string; type: "text" | "password" | "checkbox" | "textarea" }[];
}

/** درگاه‌هایی که اتصال و تأیید پرداخت آن‌ها در این نسخه واقعاً پیاده‌سازی شده است. */
export const LIVE_GATEWAY_SLUGS: PaymentGateway[] = ["zarinpal", "zibal", "idpay", "payir", "sep"];

export const ALL_GATEWAYS: GatewayMeta[] = [
  { slug: "zarinpal", name: "زرین‌پال", desc: "درگاه واسط زرین‌پال (محبوب‌ترین)", category: "iranian", fields: [{ key: "merchant_id", label: "کد بازرگانی (Merchant ID)", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "zibal", name: "زیبال", desc: "درگاه واسط زیبال (Zibal)", category: "iranian", fields: [{ key: "merchant_id", label: "کد بازرگانی", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "idpay", name: "آیدی پی", desc: "درگاه واسط IDPay", category: "iranian", fields: [{ key: "api_key", label: "API Key", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "payir", name: "پی‌آر", desc: "درگاه واسط Pay.ir", category: "iranian", fields: [{ key: "api_key", label: "API Key", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "sep", name: "سامان", desc: "درگاه بانک سامان (SEP)", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده (Terminal ID)", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "saman", name: "سامان الکترونیک", desc: "درگاه جدید بانک سامان", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "pasargad", name: "بانک پاسارگاد", desc: "درگاه بانک پاسارگاد", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }, { key: "api_key", label: "کلید API", type: "text" }] },
  { slug: "mellat", name: "بانک ملت", desc: "درگاه بانک ملت (توسط به پرداخت)", category: "iranian", fields: [{ key: "terminal_id", label: "کد ترمینال", type: "text" }, { key: "username", label: "نام کاربری", type: "text" }, { key: "password", label: "رمز عبور", type: "password" }] },
  { slug: "saderat", name: "بانک صادرات", desc: "درگاه بانک صادرات", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }, { key: "terminal_id", label: "کد ترمینال", type: "text" }, { key: "api_key", label: "کلید API", type: "text" }] },
  { slug: "tejarat", name: "بانک تجارت", desc: "درگاه بانک تجارت", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }, { key: "api_key", label: "کلید API", type: "text" }] },
  { slug: "parsian", name: "بانک پارسیان", desc: "درگاه بانک پارسیان", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }, { key: "api_key", label: "کلید API", type: "text" }] },
  { slug: "sarmayeh", name: "بانک سرمایه", desc: "درگاه بانک سرمایه", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "tourism", name: "بانک گردشگری", desc: "درگاه بانک گردشگری", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "dejpas", name: "بانک دی", desc: "درگاه بانک دی", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "etebari", name: "بانک قرض‌الحسنه رسالت", desc: "درگاه بانک رسالت", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "asanpardakht", name: "آسان پرداخت", desc: "درگاه آسان پرداخت (ملی)", category: "iranian", fields: [{ key: "api_key", label: "API Key", type: "text" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "payping", name: "پی پینگ", desc: "درگاه PayPing", category: "iranian", fields: [{ key: "api_key", label: "API Key", type: "text" }] },
  { slug: "bitpay", name: "بیت پی", desc: "درگاه BitPay", category: "iranian", fields: [{ key: "api_key", label: "API Key", type: "text" }] },
  { slug: "novin", name: "نوین الکترونیک", desc: "درگاه بانک اقتصادنوین", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "mehr", name: "بانک مهرایران", desc: "درگاه بانک مهر اقتصاد", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "keshavarzi", name: "بانک کشاورزی", desc: "درگاه بانک کشاورزی", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "refah", name: "بانک رفاه", desc: "درگاه بانک رفاه کارگران", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "sina", name: "بانک سینا", desc: "درگاه بانک سینا", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "karafarin", name: "بانک کارآفرین", desc: "درگاه بانک کارآفرین", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "day", name: "بانک روز (مهر)", desc: "درگاه بانک مهر", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "sadaad", name: "سداد", desc: "درگاه سداد (سامان سداد)", category: "iranian", fields: [{ key: "terminal_id", label: "کد ترمینال (Terminal ID)", type: "text" }, { key: "merchant_id", label: "کد پذیرنده (Merchant ID)", type: "text" }, { key: "api_key", label: "کلید API (Transaction Key)", type: "password" }, { key: "sandbox", label: "حالت تست", type: "checkbox" }] },
  { slug: "hekmat", name: "بانک حکمت ایرانیان", desc: "درگاه بانک حکمت", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "gardeshgari", name: "بانک گردشگری", desc: "درگاه بانک گردشگری", category: "iranian", fields: [{ key: "merchant_id", label: "کد پذیرنده", type: "text" }] },
  { slug: "sandbox", name: "درگاه تست (Sandbox)", desc: "برای تست و توسعه", category: "iranian", fields: [] },
];
