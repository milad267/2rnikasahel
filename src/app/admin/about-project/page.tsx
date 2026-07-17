"use client";

import { useRef, useState } from "react";
import {
  BookOpen, Download, ExternalLink, Calendar, Code2, Server, Database,
  Shield, Smartphone, Palette, CreditCard, Bot, Sparkles, ShoppingBag,
  Package, Users, FileText, Settings, LayoutDashboard, Sliders, Truck,
  Tag, Tags, MessageSquare, Inbox, Camera, Globe, Lock, Zap, GitBranch,
  Layers, Cpu, Boxes, Image, CheckCircle, ArrowLeft,
  BarChart3, PieChart, Activity, Star, Award, User, Mail, Phone,
} from "lucide-react";
import {
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ───
type SectionItem = {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  howToUse: string[];
  imageLabel: string;
  gradient: string;
  badge?: string;
};

type TechItem = {
  name: string;
  category: string;
  icon: string;
  usage: string;
  importance: number;
};

type StatItem = {
  label: string;
  value: string;
  icon: any;
  color: string;
};

// ─── Data ───
const STATS: StatItem[] = [
  { label: "صفحات و کامپوننت‌ها", value: "۱۵۰+", icon: Layers, color: "#1c6a7c" },
  { label: "جدول دیتابیس", value: "۳۸", icon: Database, color: "#3b82f6" },
  { label: "درگاه پرداخت", value: "۸", icon: CreditCard, color: "#8b5cf6" },
  { label: "رویداد تلگرام", value: "۶", icon: Bot, color: "#f59e0b" },
  { label: "خط کد (تخمین)", value: "۳۵,۰۰۰+", icon: Code2, color: "#10b981" },
  { label: "نسخه پروژه", value: "۲.۰", icon: GitBranch, color: "#ef4444" },
];

const TECH_STACK: TechItem[] = [
  { name: "Next.js 16.2", category: "فریم‌ورک", icon: "▲", usage: "App Router, Server Components, Turbopack", importance: 100 },
  { name: "React 19.2", category: "UI Library", icon: "⚛", usage: "Hooks, Context, Client Components", importance: 98 },
  { name: "TypeScript 5.9", category: "زبان", icon: "TS", usage: "Strict Mode, Type Safety", importance: 95 },
  { name: "PostgreSQL", category: "دیتابیس", icon: "🐘", usage: "Relational Database, 38 Tables", importance: 90 },
  { name: "Drizzle ORM 0.45", category: "ORM", icon: "🌧", usage: "Schema, Migrations, Queries", importance: 88 },
  { name: "Tailwind CSS 4.1", category: "CSS", icon: "🎨", usage: "Utility-First, Responsive Design", importance: 85 },
  { name: "OpenAI SDK", category: "AI", icon: "🤖", usage: "Chat Completions, Image Generation", importance: 80 },
  { name: "Recharts", category: "چارت", icon: "📊", usage: "Dashboard Charts & Graphs", importance: 70 },
  { name: "TipTap", category: "ادیتور", icon: "✍", usage: "Rich Text Editor (Blog & Forms)", importance: 65 },
  { name: "Swiper 14", category: "اسلایدر", icon: "🔄", usage: "Product Sliders & Carousels", importance: 60 },
  { name: "Framer Motion", category: "انیمیشن", icon: "🎬", usage: "Page Transitions, Animations", importance: 55 },
  { name: "Nodemailer", category: "ایمیل", icon: "📧", usage: "Transactional Emails", importance: 50 },
  { name: "Sharp", category: "تصویر", icon: "🖼", usage: "Image Optimization, Watermark", importance: 45 },
  { name: "Drizzle Kit", category: "ابزار", icon: "🔧", usage: "Migration Generation & Push", importance: 75 },
];

const PIE_DATA = [
  { name: "فروشگاه", value: 25, color: "#1c6a7c" },
  { name: "ادمین پنل", value: 30, color: "#3b82f6" },
  { name: "زیرساخت", value: 15, color: "#8b5cf6" },
  { name: "پرداخت", value: 12, color: "#f59e0b" },
  { name: "AI & هوشمند", value: 10, color: "#10b981" },
  { name: "بلاگ & محتوا", value: 8, color: "#ef4444" },
];

const SECTIONS: SectionItem[] = [
  {
    id: "shop",
    icon: ShoppingBag,
    title: "فروشگاه اینترنتی",
    subtitle: "سیستم کامل فروش محصولات صنعتی و تأسیساتی",
    gradient: "from-petrol-600 to-cyan-700",
    badge: "Core",
    description: "فروشگاه اینترنتی درنیکا ساحل با طراحی کاملاً واکنش‌گرا و بهینه‌شده برای موبایل و دسکتاپ. سیستم دارای نمایش محصولات با تنوع‌های متعدد (رنگ، سایز، واحد اندازه‌گیری)، گالری تصاویر، فیلتر پیشرفته بر اساس دسته‌بندی و برند، جستجوی هوشمند، و صفحه جزئیات محصول با مشخصات کامل است. نمای موبایل با کارت‌های ۲×۲ و کاروسل افقی با قابلیت اسکرول لمسی طراحی شده است.",
    features: [
      "نمایش محصولات با تنوع‌های متعدد (قیمت، موجودی، واحد اندازه‌گیری)",
      "گالری تصاویر با زوم و نمای بزرگ",
      "فیلتر پیشرفته بر اساس دسته‌بندی، برند، قیمت",
      "جستجوی هوشمند با پیشنهادات خودکار",
      "نمای واکنش‌گرا (موبایل ۲×۲، دسکتاپ ۳×۳)",
      "صفحات دسته‌بندی مجزا با توضیحات کامل",
      "سیستم تخفیف و قیمت‌گذاری ویژه",
    ],
    howToUse: [
      "از مسیر Admin Panel > فروشگاه > محصولات می‌توانید محصول جدید اضافه کنید",
      "برای هر محصول می‌توانید چندین تنوع (قیمت/موجودی متفاوت) تعریف کنید",
      "تصاویر محصولات از طریق آپلودر اختصاصی با قابلیت بهینه‌سازی خودکار",
      "دسته‌بندی‌ها و برندها به صورت سلسله‌مراتبی قابل مدیریت هستند",
      "کاربران در بخش فروشگاه (لینک /shop) محصولات را مرور و خرید می‌کنند",
    ],
    imageLabel: "🏪 صفحه فروشگاه با کارت‌های محصول و فیلترهای پیشرفته",
  },
  {
    id: "cart-checkout",
    icon: Package,
    title: "سبد خرید و تسویه حساب",
    subtitle: "تجربه خرید روان و بدون دردسر",
    gradient: "from-amber-600 to-orange-600",
    badge: "Core",
    description: "سیستم سبد خرید کامل با پشتیبانی از نشست‌های مهمان (قبل از ورود) و ادغام خودکار با حساب کاربری پس از ورود. فرآیند تسویه حساب در چند مرحله طراحی شده: انتخاب آدرس (ذخیره‌شده یا جدید)، انتخاب روش ارسال، انتخاب درگاه پرداخت، و نهایی‌سازی سفارش. سبد خرید دارای پاپ‌آپ سریع برای افزودن کالا و صفحه کامل برای مدیریت تعداد و حذف آیتم‌ها است.",
    features: [
      "سبد خرید برای کاربران مهمان (بدون نیاز به ورود)",
      "ادغام هوشمند سبد مهمان با حساب کاربری پس از ورود",
      "پاپ‌آپ افزودن به سبد خرید با بازخورد آنی",
      "مدیریت تعداد کالا با دکمه‌های + و -",
      "انتخاب از بین آدرس‌های ذخیره‌شده یا ثبت آدرس جدید",
      "انتخاب روش ارسال (پیشتاز، عادی، فوری)",
      "ذخیره خودکار آدرس برای خریدهای بعدی",
    ],
    howToUse: [
      "کاربران می‌توانند بدون ورود به سایت کالا به سبد اضافه کنند",
      "پس از ورود، سبد خرید مهمان به‌صورت خودکار به حساب کاربر متصل می‌شود",
      "در صفحه تسویه حساب (/checkout) آدرس و روش ارسال انتخاب می‌شود",
      "پس از ثبت سفارش، کاربر به درگاه پرداخت هدایت می‌شود",
      "وضعیت سفارش در پنل کاربری (صفحه سفارشات) قابل پیگیری است",
    ],
    imageLabel: "🛒 صفحه تسویه حساب با فرم آدرس و انتخاب درگاه پرداخت",
  },
  {
    id: "payment",
    icon: CreditCard,
    title: "سیستم پرداخت (۸ درگاه)",
    subtitle: "پشتیبانی از ۶ درگاه ایرانی + ۲ رمزارز",
    gradient: "from-purple-600 to-indigo-600",
    badge: "پیشرفته",
    description: "سیستم پرداخت یکپارچه با ۸ درگاه شامل زرین‌پال، زیبال، آیدی‌پی، پی‌آی‌آر، سامان، ساندباکس (تست)، USDT/TRC20 و بیت‌کوین. معماری مبتنی بر الگوی Factory با کلاس‌های مستقل برای هر درگاه. قابلیت فعال/غیرفعال کردن هر درگاه از پنل ادمین. سیستم کش هوشمند با زمان ۱ دقیقه برای کاهش درخواست‌های تکراری. مدیریت خطا و بازگشت از درگاه به صورت خودکار.",
    features: [
      "پشتیبانی از ۸ درگاه پرداخت (۶ ایرانی + ۲ رمزارز)",
      "معماری Factory با کلاس‌های مجزا برای هر درگاه",
      "سیستم کش ۱ دقیقه‌ای برای تنظیمات درگاه‌ها",
      "فعال/غیرفعال کردن مستقل هر درگاه از ادمین",
      "تست با درگاه Sandbox (بدون نیاز به درگاه واقعی)",
      "پشتیبانی از رمزارزهای USDT/TRC20 و بیت‌کوین",
      "بازگشت خودکار به صفحه سفارش پس از پرداخت",
    ],
    howToUse: [
      "از مسیر Admin Panel > ارتباطات و درگاه‌ها > درگاه‌های پرداخت",
      "برای هر درگاه کلید API یا کد بازرگانی مربوطه را وارد کنید",
      "هر درگاه را می‌توانید به صورت جداگانه فعال یا غیرفعال کنید",
      "حالت Sandbox برای تست بدون هزینه در دسترس است",
      "درگاه‌های رمزارز (USDT/BTC) در نسخه فعلی فقط در ادمین نمایش داده می‌شوند",
    ],
    imageLabel: "💳 صفحه مدیریت درگاه‌های پرداخت با دو تب ایرانی و رمزارز",
  },
  {
    id: "telegram",
    icon: Bot,
    title: "ربات تلگرام",
    subtitle: "اعلان‌های هوشمند و مدیریت فروشگاه از تلگرام",
    gradient: "from-blue-500 to-blue-700",
    badge: "ویژه",
    description: "ربات تلگرام پیشرفته با قابلیت Webhook و ۶ رویداد اعلان: سفارش جدید، پرداخت موفق، کاربر جدید، تماس با ما، تغییر وضعیت سفارش، و موجودی کم انبار. هر رویداد دارای قالب پیام HTML/CSS اختصاصی است. پشتیبانی از دستورات /start، /help، /status، /order. پنل ادمین مجزا با ۵ بخش: تنظیمات اتصال، مدیریت رویدادها، قالب پیام‌ها، دستورات، و لاگ آخرین ارسال‌ها.",
    features: [
      "Webhook با اندپوینت API اختصاصی",
      "۶ رویداد اعلان (سفارش جدید، پرداخت، کاربر جدید و...)",
      "قالب پیام‌های HTML/CSS اختصاصی برای هر رویداد",
      "دستورات تعاملی: /start, /help, /status, /order",
      "پنل ادمین کامل با ۵ بخش مجزا",
      "فعال/غیرفعال کردن هر رویداد به صورت مستقل",
      "نمایش لاگ آخرین ارسال‌ها با وضعیت موفقیت/خطا",
    ],
    howToUse: [
      "از مسیر Admin Panel > ارتباطات و درگاه‌ها > ربات تلگرام",
      "ابتدا توکن ربات و Chat ID را در بخش تنظیمات اتصال وارد کنید",
      "سپس رویدادهای مورد نظر را فعال کنید",
      "قالب هر پیام را می‌توانید به صورت دستی ویرایش کنید",
      "ربات به صورت خودکار اعلان‌ها را به تلگرام شما ارسال می‌کند",
      "کاربران می‌توانند از دستور /order برای پیگیری استفاده کنند",
    ],
    imageLabel: "🤖 پنل مدیریت ربات تلگرام با ۵ بخش مجزا",
  },
  {
    id: "admin",
    icon: LayoutDashboard,
    title: "پنل مدیریت (ادمین)",
    subtitle: "داشبورد جامع با تمام ابزارهای مدیریتی",
    gradient: "from-slate-800 to-slate-900",
    badge: "Core",
    description: "پنل ادمین کامل و حرفه‌ای با داشبورد تحلیلی شامل ۱۲ نوع آمار و نمودار مختلف: خلاصه کلی، روند فروش، وضعیت سفارشات، فروش ماهانه، پرفروش‌ترین محصولات، دسته‌بندی‌های پرفروش، کاربران جدید، نرخ تبدیل، منابع ترافیک، مقایسه هفتگی، و ترافیک ساعتی. سایدبار هوشمند با قابلیت جمع‌شدگی و ذخیره وضعیت در localStorage.",
    features: [
      "داشبورد تحلیلی با ۱۲ نوع نمودار و آمار",
      "مدیریت کامل محصولات، دسته‌بندی‌ها و برندها",
      "مدیریت سفارشات با امکان تغییر وضعیت",
      "مدیریت کاربران با سطوح دسترسی مختلف",
      "مدیریت بلاگ با ادیتور Rich Text و AI",
      "مدیریت اسلایدر صفحه اصلی",
      "مدیریت پیام‌های تماس با قابلیت پاسخگویی",
      "مدیریت درگاه‌های پرداخت و ربات تلگرام",
      "سیستم بکاپ‌گیری و بازیابی",
      "تنظیمات کامل سایت (ظاهر، سئو، امنیت)",
      "مدیریت سرور و اطلاعات سیستمی",
    ],
    howToUse: [
      "دسترسی به پنل ادمین از طریق لینک /admin (فقط مدیران و سوپرادمین‌ها)",
      "سایدبار به صورت گروه‌بندی شده دسترسی سریع به همه بخش‌ها را فراهم می‌کند",
      "داشبورد اصلی خلاصه‌ای از وضعیت کلی فروشگاه را نمایش می‌دهد",
      "هر بخش دارای فرم‌های افزودن، ویرایش، حذف و جستجو است",
      "برای مدیریت کاربران و سطح دسترسی به بخش ادمین > کاربران مراجعه کنید",
    ],
    imageLabel: "📊 داشبورد ادمین با نمودارهای تحلیلی و آمار لحظه‌ای",
  },
  {
    id: "auth",
    icon: Users,
    title: "احراز هویت و کاربران",
    subtitle: "سیستم ورود/ثبت‌نام با OTP و رمز عبور",
    gradient: "from-emerald-600 to-teal-600",
    badge: "امن",
    description: "سیستم احراز هویت دوگانه با پشتیبانی از ورود با رمز عبور و کد OTP (یک‌بار مصرف). فرآیند ثبت‌نام با اعتبارسنجی شماره موبایل و رمز عبور حداقل ۸ کاراکتر. امکان بازیابی رمز عبور از طریق کد تأیید. سطوح دسترسی: کاربر عادی (customer)، پیمانکار (contractor)، مدیر (admin)، سوپرادمین (superadmin). سیستم نرخ‌گیری (Rate Limiting) برای جلوگیری از درخواست‌های مکرر.",
    features: [
      "ورود با رمز عبور یا کد OTP",
      "ثبت‌نام با اعتبارسنجی شماره موبایل",
      "بازیابی رمز عبور با کد تأیید",
      "۴ سطح دسترسی: کاربر، پیمانکار، مدیر، سوپرادمین",
      "سیستم نرخ‌گیری برای امنیت بیشتر",
      "ذخیره نشست (Session) با توکن امن",
      "ادغام خودکار سبد خرید مهمان پس از ورود",
      "قابلیت «مرا به خاطر بسپار»",
    ],
    howToUse: [
      "ثبت‌نام: صفحه /register یا از طریق دکمه ثبت‌نام در صفحه ورود",
      "ورود: صفحه /login با شماره موبایل و رمز عبور",
      "بازیابی رمز: صفحه /forgot-password → دریافت کد → تنظیم رمز جدید",
      "پروفایل کاربری: صفحه /profile برای مشاهده اطلاعات و سفارشات",
      "مدیریت کاربران در ادمین: Admin Panel > مدیریت سیستم > کاربران",
    ],
    imageLabel: "🔐 صفحه ورود با قابلیت ثبت‌نام و بازیابی رمز عبور",
  },
  {
    id: "ai",
    icon: Sparkles,
    title: "هوش مصنوعی و سئو",
    subtitle: "AI یکپارچه در سراسر فروشگاه",
    gradient: "from-violet-600 to-purple-600",
    badge: "هوشمند",
    description: "سیستم هوش مصنوعی یکپارچه با ۲۱ عامل (Agent) تخصصی برای بخش‌های مختلف فروشگاه: چت، سئو، بینایی، محصول، محتوا، تحلیل، پشتیبانی، داده، بازاریابی، سفارشات، موجودی، مشتری، مترجم، کد، تلگرام، روتر، مغز مرکزی، ویرایشگر تصویر، هوش تصویر، و تصویر بلاگ. هر عامل دارای System Prompt و ابزارهای اختصاصی است. ردیابی مصرف توکن برای هر عامل به صورت جداگانه.",
    features: [
      "۲۱ عامل تخصصی هوش مصنوعی برای بخش‌های مختلف",
      "تولید محتوای سئو با AI (عنوان، توضیحات، تگ)",
      "تولید تصویر با هوش مصنوعی (DALL-E و Midjourney)",
      "دستیار هوشمند در پنل ادمین (کامپوننت AdminAssistant)",
      "ردیابی مصرف توکن به تفکیک هر عامل",
      "سیستم Chat با AI برای پشتیبانی مشتریان",
      "تولید خودکار توضیحات محصول و بلاگ",
    ],
    howToUse: [
      "تنظیمات AI: Admin Panel > هوشمند > هوش مصنوعی و سئو",
      "کلید API اوپن‌ای را در بخش تنظیمات AI وارد کنید",
      "برای هر عامل می‌توانید مدل و تنظیمات را شخصی‌سازی کنید",
      "دستیار هوشمند (دکمه 🤖 در پایین صفحه ادمین) در همه صفحات قابل دسترسی است",
      "مصرف توکن هر عامل به تفکیک در صفحه AI قابل مشاهده است",
    ],
    imageLabel: "🧠 صفحه مدیریت هوش مصنوعی با ۲۱ عامل تخصصی",
  },
  {
    id: "blog",
    icon: FileText,
    title: "سیستم بلاگ",
    subtitle: "مدیریت محتوا با ادیتور پیشرفته و AI",
    gradient: "from-rose-600 to-pink-600",
    badge: "محتوا",
    description: "سیستم بلاگ کامل با ادیتور Rich Text (TipTap)، امکان افزودن تصویر شاخص، ویدیو، دسته‌بندی، برچسب‌ها، و تنظیمات سئو. تولید خودکار تگ‌ها و متادیتای سئو با هوش مصنوعی. مدیریت وضعیت‌های انتشار (منتشر شده، پیش‌نویس). صفحه بلاگ در فرانت با نمایش مقاله‌ها به صورت مرتب.",
    features: [
      "ادیتور Rich Text با TipTap (پشتیبانی از HTML)",
      "آپلود تصویر شاخص و ویدیو",
      "دسته‌بندی مقالات",
      "برچسب‌ها (تگ) با قابلیت تولید AI",
      "تنظیمات سئوی اختصاصی (Meta Title, Meta Description)",
      "تولید خودکار تگ و سئو با هوش مصنوعی",
      "مدیریت وضعیت: پیش‌نویس / منتشر شده",
      "فعال/غیرفعال کردن نظرات",
    ],
    howToUse: [
      "مدیریت بلاگ: Admin Panel > محتوا > بلاگ",
      "برای نوشتن مقاله جدید دکمه «پست جدید» را بزنید",
      "در تب محتوا عنوان، خلاصه و متن اصلی را وارد کنید",
      "در تب رسانه و دسته‌بندی تصویر، ویدیو و دسته را انتخاب کنید",
      "در تب برچسب و سئو می‌توانید تگ‌ها را با AI تولید کنید",
      "پس از ذخیره، مقاله در لینک /blog در دسترس کاربران است",
    ],
    imageLabel: "✍️ ویرایشگر بلاگ با سه تب محتوا، رسانه و سئو",
  },
  {
    id: "settings",
    icon: Settings,
    title: "تنظیمات سایت",
    subtitle: "مدیریت کامل ظاهر، محتوا و امنیت",
    gradient: "from-gray-600 to-gray-800",
    badge: "سیستمی",
    description: "سیستم تنظیمات پیشرفته مبتنی بر کلید-مقدار با گروه‌بندی موضوعی: اطلاعات عمومی، ظاهر و پالت رنگی، صفحه اصلی (لندینگ)، درباره ما، فوتر، اطلاعات تماس، سئو، و امنیت. قابلیت تغییر پالت رنگی در لحظه از بین ۸ پالت از پیش تعریف‌شده. مدیریت شبکه‌های اجتماعی، ساعات کاری، شماره‌های تماس، و آدرس‌ها.",
    features: [
      "تنظیمات گروه‌بندی شده با ۹ تب موضوعی",
      "۸ پالت رنگی قابل انتخاب و تغییر در لحظه",
      "مدیریت اطلاعات تماس، شبکه‌های اجتماعی، آدرس‌ها",
      "تنظیمات سئوی سراسری (Google Analytics, Google Search Console)",
      "تنظیمات امنیتی (فعال/غیرفعال کردن ثبت‌نام)",
      "مدیریت محتوای صفحه اصلی (بخش‌های لندینگ)",
      "مدیریت فوتر و لینک‌های مفید",
      "ذخیره خودکار تنظیمات در دیتابیس",
    ],
    howToUse: [
      "تنظیمات سایت: Admin Panel > مدیریت سیستم > تنظیمات سایت",
      "تب‌ها در بالای صفحه دسته‌بندی شده‌اند",
      "برای تغییر پالت رنگی به تب «پالت رنگی» مراجعه کنید",
      "تغییرات به صورت لحظه‌ای در سایت اعمال می‌شوند",
      "تنظیمات سئو در تب «سئو» برای بهینه‌سازی موتور جستجو",
    ],
    imageLabel: "⚙️ صفحه تنظیمات سایت با ۹ تب تخصصی",
  },
  {
    id: "orders-management",
    icon: Truck,
    title: "مدیریت سفارشات",
    subtitle: "پیگیری و مدیریت کامل فرآیند سفارشات",
    gradient: "from-orange-600 to-red-600",
    badge: "Core",
    description: "سیستم مدیریت سفارشات کامل با قابلیت مشاهده لیست سفارشات، تغییر وضعیت (در انتظار پرداخت، پرداخت شده، آماده‌سازی، ارسال شده، تحویل شده، لغو شده)، سیستم رهگیری با رویدادهای چندمرحله‌ای (پردازش، تحویل به پیک، در مسیر، خارج از مرکز توزیع، تحویل شده)، و دانلود فاکتور PDF. امکان جستجو و فیلتر بر اساس وضعیت.",
    features: [
      "لیست سفارشات با قابلیت جستجو و فیلتر",
      "۶ وضعیت برای هر سفارش",
      "سیستم رهگیری با رویدادهای زمانی",
      "ثبت کد رهگیری و موقعیت مکانی",
      "تخمین زمان تحویل",
      "دانلود فاکتور PDF",
      "مشاهده جزئیات کامل سفارش در مودال",
      "صفحه پیگیری سفارش برای کاربران",
    ],
    howToUse: [
      "مدیریت سفارشات: Admin Panel > اصلی > سفارشات",
      "برای تغییر وضعیت روی وضعیت فعلی کلیک کنید",
      "برای افزودن رهگیری، روی دکمه «➕ افزودن رهگیری» در مودال سفارش کلیک کنید",
      "کاربران می‌توانند از صفحه /orders سفارشات خود را پیگیری کنند",
      "فاکتور PDF از طریق دکمه دانلود در جزئیات سفارش قابل دریافت است",
    ],
    imageLabel: "📦 صفحه مدیریت سفارشات با مودال جزئیات و سیستم رهگیری",
  },
  {
    id: "instagram",
    icon: Camera,
    title: "مدیریت اینستاگرام",
    subtitle: "تولید محتوای هوشمند برای اینستاگرام",
    gradient: "from-pink-600 to-purple-600",
    badge: "ویژه",
    description: "سیستم مدیریت اینستاگرام با قابلیت تولید خودکار پست‌های تبلیغاتی و محتوایی با استفاده از هوش مصنوعی. قابلیت اتصال به حساب اینستاگرام، زمان‌بندی انتشار، و مدیریت کمپین‌های تبلیغاتی. پست‌ها با رعایت اصول سئو و بازاریابی محتوا تولید می‌شوند.",
    features: [
      "تولید محتوای پست با AI",
      "اتصال به حساب اینستاگرام",
      "زمان‌بندی انتشار خودکار",
      "مدیریت کمپین‌های تبلیغاتی",
      "تولید هشتگ‌های مرتبط با AI",
      "برنامه‌ریزی محتوایی هفتگی",
    ],
    howToUse: [
      "مدیریت اینستاگرام: Admin Panel > ارتباطات و درگاه‌ها > مدیریت اینستاگرام",
      "برای تولید پست جدید از قابلیت AI استفاده کنید",
      "پست‌ها را می‌توانید زمان‌بندی کنید تا در زمان مشخص منتشر شوند",
    ],
    imageLabel: "📸 صفحه مدیریت اینستاگرام با تولید محتوای AI",
  },
  {
    id: "contact",
    icon: MessageSquare,
    title: "پیام‌های تماس و ارتباطات",
    subtitle: "مدیریت ارتباط با مشتریان",
    gradient: "from-teal-500 to-emerald-600",
    badge: "ارتباطات",
    description: "سیستم دریافت و مدیریت پیام‌های ارسالی از فرم تماس با ما. قابلیت مشاهده پیام‌های دریافتی، علامت‌گذاری به عنوان خوانده/نخوانده، پاسخگویی مستقیم، و حذف. نمایش تعداد پیام‌های نخوانده در سایدبار ادمین.",
    features: [
      "دریافت خودکار پیام‌های فرم تماس",
      "نمایش تعداد پیام‌های نخوانده در سایدبار",
      "علامت‌گذاری به عنوان خوانده/نخوانده",
      "پاسخگویی مستقیم به پیام‌ها",
      "حذف پیام‌های قدیمی",
    ],
    howToUse: [
      "مشاهده پیام‌ها: Admin Panel > ارتباطات و درگاه‌ها > پیام‌های تماس",
      "تعداد پیام‌های نخوانده در سایدبار نمایش داده می‌شود",
      "برای پاسخگویی روی دکمه پاسخ در کنار هر پیام کلیک کنید",
    ],
    imageLabel: "💬 صفحه پیام‌های تماس با قابلیت پاسخگویی",
  },
  {
    id: "backup",
    icon: Server,
    title: "بکاپ و امنیت",
    subtitle: "پشتیبان‌گیری خودکار و امنیت سیستم",
    gradient: "from-red-600 to-rose-700",
    badge: "امنیت",
    description: "سیستم بکاپ‌گیری خودکار از دیتابیس و فایل‌های فروشگاه با قابلیت دانلود فایل‌های پشتیبان و بازیابی. شامل اسکریپت‌های خط فرمان برای بکاپ‌گیری دوره‌ای. سیستم امنیتی با Rate Limiting برای APIها، محافظت از مسیرهای حساس، و رمزنگاری اطلاعات حساس.",
    features: [
      "بکاپ‌گیری از دیتابیس PostgreSQL",
      "دانلود فایل‌های پشتیبان",
      "قابلیت بازیابی از بکاپ",
      "Rate Limiting برای APIها",
      "محافظت از مسیرهای ادمین",
      "رمزنگاری اطلاعات حساس",
      "اسکریپت بکاپ خودکار (bash)",
    ],
    howToUse: [
      "مدیریت بکاپ: Admin Panel > مدیریت سیستم > بکاپ و بازیابی",
      "برای ایجاد بکاپ جدید روی دکمه «ایجاد بکاپ» کلیک کنید",
      "فایل‌های بکاپ را می‌توانید دانلود کنید",
      "برای بازیابی، فایل بکاپ را آپلود کرده و تأیید کنید",
    ],
    imageLabel: "🛡️ صفحه بکاپ و بازیابی با قابلیت دانلود و آپلود",
  },
  {
    id: "shipping",
    icon: Truck,
    title: "روش‌های ارسال",
    subtitle: "مدیریت هزینه‌ها و روش‌های حمل و نقل",
    gradient: "from-cyan-600 to-blue-600",
    badge: "فروشگاه",
    description: "سیستم مدیریت روش‌های ارسال با قابلیت تعریف هزینه ثابت، آستانه رایگان، زمان تحویل تخمینی، و توضیحات. امکان فعال/غیرفعال کردن هر روش ارسال به صورت جداگانه.",
    features: [
      "تعریف چندین روش ارسال",
      "تعیین هزینه و آستانه رایگان برای هر روش",
      "تخمین زمان تحویل",
      "فعال/غیرفعال کردن روش‌های ارسال",
    ],
    howToUse: [
      "مدیریت روش‌های ارسال: Admin Panel > فروشگاه > روش‌های ارسال",
      "برای افزودن روش جدید، فرم را پر کرده و ذخیره کنید",
    ],
    imageLabel: "🚚 صفحه مدیریت روش‌های ارسال",
  },
  {
    id: "slider",
    icon: Sliders,
    title: "اسلایدر صفحه اصلی",
    subtitle: "مدیریت بنرهای صفحه اصلی",
    gradient: "from-indigo-600 to-violet-600",
    badge: "ظاهر",
    description: "سیستم مدیریت اسلایدر صفحه اصلی با قابلیت افزودن، ویرایش و حذف اسلایدها. هر اسلاید شامل تصویر، عنوان، متن توضیحات، و لینک است. قابلیت فعال/غیرفعال کردن و مرتب‌سازی اسلایدها.",
    features: [
      "افزودن اسلاید با تصویر، عنوان و متن",
      "تعیین لینک برای هر اسلاید",
      "فعال/غیرفعال کردن اسلایدها",
      "مرتب‌سازی اسلایدها",
    ],
    howToUse: [
      "مدیریت اسلایدر: Admin Panel > محتوا > اسلایدر",
      "برای افزودن اسلاید جدید روی دکمه «اسلاید جدید» کلیک کنید",
    ],
    imageLabel: "🎠 صفحه مدیریت اسلایدر صفحه اصلی",
  },
];

// ─── Helper Components ───
function GradientBadge({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-[10px] font-bold text-white shadow-md",
      className
    )}>
      <Star className="size-3" strokeWidth={2} />
      {text}
    </span>
  );
}

function TechBadge({ tech, index }: { tech: TechItem; index: number }) {
  const colors = [
    "border-petrol-200 bg-petrol-50 text-petrol-700",
    "border-blue-200 bg-blue-50 text-blue-700",
    "border-purple-200 bg-purple-50 text-purple-700",
    "border-amber-200 bg-amber-50 text-amber-700",
    "border-green-200 bg-green-50 text-green-700",
    "border-rose-200 bg-rose-50 text-rose-700",
  ];
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl border p-4 transition-all hover:shadow-lg",
      colors[index % colors.length]
    )}>
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-black shadow-sm">
        {tech.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{tech.name}</p>
        <p className="text-[10px] opacity-70">{tech.category}</p>
        <p className="mt-0.5 text-[10px] opacity-60">{tech.usage}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-16 overflow-hidden rounded-full bg-white/50">
          <div
            className="h-full rounded-full bg-current transition-all"
            style={{ width: `${tech.importance}%` }}
          />
        </div>
        <span className="text-[9px] font-bold opacity-60">{tech.importance}%</span>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function AboutProjectPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={printRef} className="print-area">
      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          body * { visibility: visible; }
          .no-print { display: none !important; }
          .print-area { display: block !important; position: relative !important; }
          .print-break { page-break-before: always; page-break-inside: avoid; }
          .print-break-after { page-break-after: always; }
          .print-section { page-break-inside: avoid; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* ── Header / Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-petrol-900 p-8 text-white md:p-12 no-print">
        {/* Background Pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-5">
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-petrol-400 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <GradientBadge text="نسخه ۲.۰" />
                <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-medium text-white/70">
                  آخرین به‌روزرسانی: تیر ۱۴۰۵
                </span>
              </div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                درنیکا ساحل
              </h1>
              <p className="mt-3 text-lg font-medium text-petrol-200">
                فروشگاه اینترنتی تجهیزات صنعتی و تأسیسات
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
                یک فروشگاه اینترنتی کامل و پیشرفته با پنل ادمین جامع، ۸ درگاه پرداخت،
                ربات تلگرام هوشمند، هوش مصنوعی یکپارچه، و سیستم‌های مدرن مدیریت محتوا
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <User className="size-4" strokeWidth={1.5} />
                  ساخته شده توسط <strong className="text-white">میلاد قلی‌پور</strong>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Code2 className="size-4" strokeWidth={1.5} />
                  Next.js 16 + React 19 + PostgreSQL
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2 no-print">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Download className="size-4" strokeWidth={1.5} />
                دانلود PDF پروژه
              </button>
              <a
                href="/"
                target="_blank"
                className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-3 text-xs font-semibold text-white transition-all hover:bg-petrol-500"
              >
                <ExternalLink className="size-4" strokeWidth={1.5} />
                مشاهده سایت
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="no-print mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ backgroundColor: stat.color }}
              >
                <Icon className="size-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] font-medium text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Print Header (for PDF) ── */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-navy-900">
        <h1 className="text-2xl font-black">معرفی پروژه فروشگاهی درنیکا ساحل</h1>
        <p className="text-sm mt-1">توسعه‌دهنده: میلاد قلی‌پور | تیر ۱۴۰۵</p>
      </div>

      {/* ── Table of Contents (for PDF navigation) ── */}
      <div className="no-print mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <BookOpen className="size-5 text-petrol-600" strokeWidth={1.8} />
          فهرست بخش‌ها
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-right transition-all",
                  isActive
                    ? "border-petrol-500 bg-petrol-50 shadow-sm"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg text-white",
                  section.gradient.split(" ")[0].replace("from-", "bg-"),
                )}>
                  <Icon className="size-4" strokeWidth={1.5} />
                </div>
                <span className="text-xs font-semibold text-slate-700">{section.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Charts Section ── */}
      <div className="print-section no-print mt-8 grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <PieChart className="size-4 text-petrol-600" strokeWidth={1.8} />
            توزیع بخش‌های سایت
          </h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine
                >
                  {PIE_DATA.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tech Stack Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <BarChart3 className="size-4 text-petrol-600" strokeWidth={1.8} />
            اهمیت فناوری‌های استفاده‌شده
          </h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TECH_STACK.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip />
                <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                  {TECH_STACK.slice(0, 10).map((_, idx) => (
                    <Cell key={idx} fill={["#1c6a7c", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"][idx]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Technology Stack ── */}
      <div className="print-section mt-8">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
          <Code2 className="size-6 text-petrol-600" strokeWidth={1.8} />
          پشته فناوری (Technology Stack)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TECH_STACK.map((tech, idx) => (
            <TechBadge key={tech.name} tech={tech} index={idx} />
          ))}
        </div>
      </div>

      {/* ── Architecture Overview ── */}
      <div className="print-section mt-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-petrol-50 to-blue-50 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Layers className="size-5 text-petrol-600" strokeWidth={1.8} />
          معماری سیستم
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Globe, title: "لایه نمایش (Frontend)", desc: "Next.js App Router, React 19, Tailwind CSS 4.1, Framer Motion", color: "text-blue-600 bg-blue-50" },
            { icon: Server, title: "لایه سرور (API)", desc: "API Routes, Server Components, Middleware, Rate Limiting", color: "text-petrol-600 bg-petrol-50" },
            { icon: Database, title: "لایه داده (Database)", desc: "PostgreSQL, Drizzle ORM, Migrations, 38 Tables", color: "text-purple-600 bg-purple-50" },
            { icon: Shield, title: "لایه امنیت (Security)", desc: "Auth Tokens, OTP, Rate Limiting, Role-Based Access", color: "text-emerald-600 bg-emerald-50" },
          ].map((layer) => {
            const Icon = layer.icon;
            return (
              <div key={layer.title} className="rounded-xl border border-white/60 bg-white/60 p-4 backdrop-blur-sm">
                <div className={cn("flex size-10 items-center justify-center rounded-xl mb-3", layer.color)}>
                  <Icon className="size-5" strokeWidth={1.5} />
                </div>
                <p className="text-xs font-bold text-slate-900">{layer.title}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{layer.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detailed Sections ── */}
      <div className="mt-8 space-y-8">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className="print-section rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* Section Header */}
              <div className={cn(
                "flex flex-wrap items-start justify-between gap-4 rounded-t-2xl bg-gradient-to-r p-6 text-white",
                section.gradient
              )}>
                <div className="flex items-start gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Icon className="size-7" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{section.title}</h3>
                      {section.badge && (
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-white/80">{section.subtitle}</p>
                  </div>
                </div>
                <span className="hidden text-[10px] text-white/50 lg:block">
                  بخش {idx + 1} از {SECTIONS.length}
                </span>
              </div>

              {/* Section Body */}
              <div className="p-6">
                {/* Description */}
                <p className="text-xs leading-relaxed text-slate-600">{section.description}</p>

                {/* Image Placeholder */}
                <div className={cn(
                  "no-print mt-4 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 text-sm font-medium text-slate-400",
                )}>
                  {section.imageLabel}
                </div>

                {/* Features & How To Use */}
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  {/* Features */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <CheckCircle className="size-4 text-petrol-600" strokeWidth={2} />
                      قابلیت‌ها
                    </h4>
                    <ul className="space-y-1.5">
                      {section.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                          <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-petrol-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* How to Use */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Zap className="size-4 text-amber-500" strokeWidth={2} />
                      نحوه استفاده
                    </h4>
                    <ol className="space-y-2">
                      {section.howToUse.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[11px] text-slate-600">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-petrol-100 text-[9px] font-bold text-petrol-700">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Developer Section ── */}
      <div className="print-section mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-petrol-900 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 opacity-5">
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Award className="size-6 text-petrol-400" strokeWidth={1.8} />
                درباره توسعه‌دهنده
              </h2>
              <div className="mt-6 flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-petrol-500 to-petrol-700 text-2xl font-black shadow-xl">
                  م
                </div>
                <div>
                  <p className="text-lg font-bold">میلاد قلی‌پور</p>
                  <p className="mt-1 text-sm text-petrol-200">توسعه‌دهنده فول‌استک و متخصص Next.js</p>
                  <p className="mt-3 text-xs leading-relaxed text-white/60">
                    این پروژه با بهره‌گیری از جدیدترین فناوری‌های وب از جمله Next.js 16، React 19،
                    TypeScript 5.9، PostgreSQL، و Docker طراحی و پیاده‌سازی شده است.
                    معماری پروژه مبتنی بر اصول مدرن توسعه وب شامل SSR، ISR،
                    Server Components، و API Routes می‌باشد.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Mail className="size-4 text-petrol-400" strokeWidth={1.5} />
                milad.gholipour@example.com
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Globe className="size-4 text-petrol-400" strokeWidth={1.5} />
                miladgholipour.ir
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Code2 className="size-4 text-petrol-400" strokeWidth={1.5} />
                گیت‌هاب / پروژه درنیکا ساحل
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 border-t border-slate-200 pt-6 text-center">
        <p className="text-[10px] text-slate-400">
          © ۱۴۰۵ فروشگاه درنیکا ساحل. تمامی حقوق محفوظ است.
        </p>
        <p className="mt-1 text-[10px] text-slate-300">
          این سند توسط پنل مدیریت فروشگاه به صورت خودکار تولید شده است.
        </p>
      </div>
    </div>
  );
}
