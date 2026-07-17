import type { Locale } from "./config";

/**
 * فرهنگ واژگان فارسی (تک‌زبانه)
 * سایت فقط به زبان فارسی ارائه می‌شود.
 */
export const dictionaries = {
  fa: {
    brand: {
      name: "درنیکا ساحل",
      tagline: "مرجع تخصصی تجهیزات صنعتی و تأسیسات",
    },
    nav: {
      home: "خانه",
      shop: "فروشگاه",
      categories: "دسته‌بندی‌ها",
      finder: "راهنمای انتخاب محصول",
      quote: "استعلام قیمت",
      contractors: "پنل پیمانکاران",
      blog: "بلاگ",
      about: "درباره ما",
      contact: "تماس با ما",
      admin: "ورود ادمین",

      cart: "سبد خرید",
      wishlist: "علاقه‌مندی‌ها",
      search: "جستجوی محصولات…",
    },
    hero: {
      badge: "پلتفرم لوکس صنعتی نسل جدید",
      title: "تجهیزات صنعتی، در تراز جهانی",
      subtitle:
        "درنیکا ساحل تجربه‌ای متفاوت از خرید تجهیزات صنعتی و تأسیساتی می‌سازد؛ با انتخاب هوشمند، تنوع بی‌نظیر و مشاوره مبتنی بر هوش مصنوعی.",
      ctaPrimary: "ورود به فروشگاه",
      ctaSecondary: "راهنمای انتخاب محصول",
    },
    stats: {
      products: "کد کالای فعال",
      brands: "برند معتبر",
      contractors: "پیمانکار همکار",
      support: "پشتیبانی تخصصی",
    },
    features: {
      title: "چرا درنیکا ساحل؟",
      subtitle: "زیرساختی که برای مقیاس صنعتی ساخته شده است",
      items: {
        variants: {
          icon: "Layers",
          title: "سیستم تنوع پیشرفته",
          desc: "مدیریت واحد، قیمت، موجودی و مشخصات فنی برای هر تنوع محصول.",
        },
        ai: {
          icon: "Cpu",
          title: "هوش مصنوعی یکپارچه",
          desc: "به‌روزرسانی قیمت از اکسل، خواندن PDF و مشاور تصویری هوشمند.",
        },
        b2b: {
          icon: "Handshake",
          title: "پرتال پیمانکاران",
          desc: "استعلام قیمت، قیمت‌گذاری اختصاصی و پیگیری بصری سفارش‌ها.",
        },
        secure: {
          icon: "ShieldCheck",
          title: "امنیت در بالاترین سطح",
          desc: "معماری آماده تولید، رمزنگاری و کنترل دسترسی دقیق.",
        },
      },
    },
    trust: {
      icon1: "BadgeCheck",
      title1: "اصالت کالا تضمینی",
      desc1: "تأمین مستقیم از نمایندگی‌های رسمی",
      icon2: "Truck",
      title2: "ارسال سراسری",
      desc2: "تحویل سریع به تمام نقاط ایران",
      icon3: "Headset",
      title3: "مشاوره تخصصی",
      desc3: "پشتیبانی مهندسان مجرب تأسیسات",
      icon4: "ShieldCheck",
      title4: "پرداخت امن",
      desc4: "درگاه‌های معتبر و نماد اعتماد",
    },
    footer: {
      rights: "تمامی حقوق محفوظ است.",
      explore: "کاوش",
      support: "پشتیبانی",
      legal: "قوانین",
      social: "ما را دنبال کنید",
      enamad: "نماد اعتماد الکترونیکی",
      enamadNote: "دارای نماد اعتماد رسمی",
    },
    common: {
      soon: "به‌زودی",
      language: "زبان",
      theme: "پوسته",
    },
  },
} as const;

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Dictionary = DeepString<(typeof dictionaries)["fa"]>;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as Dictionary;
}
