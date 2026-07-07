import type { Locale } from "./config";

/**
 * فرهنگ واژگان دوزبانه. در فازهای بعد این محتوا از پنل ادمین قابل ویرایش می‌شود.
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
          title: "سیستم تنوع پیشرفته",
          desc: "مدیریت واحد، قیمت، موجودی و مشخصات فنی برای هر تنوع محصول.",
        },
        ai: {
          title: "هوش مصنوعی یکپارچه",
          desc: "به‌روزرسانی قیمت از اکسل، خواندن PDF و مشاور تصویری هوشمند.",
        },
        b2b: {
          title: "پرتال پیمانکاران",
          desc: "استعلام قیمت، قیمت‌گذاری اختصاصی و پیگیری بصری سفارش‌ها.",
        },
        secure: {
          title: "امنیت در بالاترین سطح",
          desc: "معماری آماده تولید، رمزنگاری و کنترل دسترسی دقیق.",
        },
      },
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
  en: {
    brand: {
      name: "Dornika Sahel",
      tagline: "Specialized hub for industrial equipment",
    },
    nav: {
      home: "Home",
      shop: "Shop",
      categories: "Categories",
      finder: "Product Finder",
      quote: "Request Quote",
      contractors: "Contractors",
      blog: "Blog",
      contact: "Contact",
      admin: "Admin Login",
      cart: "Cart",
      wishlist: "Wishlist",
      search: "Search products…",
    },
    hero: {
      badge: "Next-gen luxury industrial platform",
      title: "Industrial equipment, world-class",
      subtitle:
        "Dornika Sahel redefines how you buy industrial and HVAC equipment — smart selection, unmatched variety, and AI-driven guidance.",
      ctaPrimary: "Enter the shop",
      ctaSecondary: "Product finder",
    },
    stats: {
      products: "Active SKUs",
      brands: "Trusted brands",
      contractors: "Partner contractors",
      support: "Expert support",
    },
    features: {
      title: "Why Dornika Sahel?",
      subtitle: "Infrastructure built for industrial scale",
      items: {
        variants: {
          title: "Advanced variants",
          desc: "Manage unit, price, stock and specs for every product variant.",
        },
        ai: {
          title: "Integrated AI",
          desc: "Excel price sync, PDF ingestion and a smart visual advisor.",
        },
        b2b: {
          title: "Contractor portal",
          desc: "Quotes, custom pricing and visual order tracking.",
        },
        secure: {
          title: "Top-tier security",
          desc: "Production-ready architecture, encryption and strict access control.",
        },
      },
    },
    footer: {
      rights: "All rights reserved.",
      explore: "Explore",
      support: "Support",
      legal: "Legal",
      social: "Follow us",
      enamad: "Trust Certificate",
      enamadNote: "Officially certified",
    },
    common: {
      soon: "Soon",
      language: "Language",
      theme: "Theme",
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
