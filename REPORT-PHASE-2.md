# گزارش فاز ۲ — بهبود Sidebar + تکمیل داشبورد + محصولات + دسته‌بندی‌ها + دستیار هوشمند

## ۱. خلاصه کار انجام شده

- **Sidebar** کامل بازنویسی شد با z-index، اسکرول داخلی، درگ، حالت بسته/باز با localStorage، Drawer موبایل و ظاهر مدرن
- **9 نمودار** در داشبورد پیاده‌سازی شد (۴ نمودار فاز ۱ + ۵ نمودار جدید)
- **دستیار عملیاتی ادمین** با چت باکس بنفش، suggestion‌ها و intent detection
- **صفحه مدیریت محصولات** با جدول، جستجو و دکمه‌های عملیات
- **صفحه مدیریت دسته‌بندی‌ها** با نمایش درختی nested

## ۲. تغییرات Sidebar (قبل و بعد)

| ویژگی | قبل | بعد |
|--------|------|------|
| z-index | ۱۰ | ۴۰ |
| اسکرول | نداشت | داخلی + درگ موس |
| Scrollbar | پیش‌فرض | سفارشی نازک با `sidebar-scroll` |
| باز/بسته | نداشت | 260px ↔ 72px با انیمیشن |
| ذخیره وضعیت | — | localStorage |
| موبایل | — | Drawer با همبرگر + Overlay |
| Active state | رنگ ساده | گرادینت بنفش `from-purple-600 to-indigo-600` |
| گوشه‌ها | تیز | rounded-xl و rounded-l-2xl |
| گروه‌ها | بی‌ترتیب | ۶ گروه با header و divider |

## ۳. فایل‌های تغییر یافته

| مسیر فایل | توضیح تغییر |
|---|---|
| `src/app/admin/layout.tsx` | اضافه شدن AdminAssistant و AdminFloatingButtons |
| `src/app/admin/page.tsx` | افزودن ۵ نمودار جدید (new-users, conversion-rate, traffic-sources, weekly-comparison, hourly-traffic) |
| `src/app/globals.css` | اضافه شدن کلاس‌های `.sidebar-scroll` با اسکرولبار سفارشی |

## ۴. فایل‌های جدید ساخته شده

| مسیر فایل | توضیح کاربرد |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | بازنویسی کامل با z-index, scroll, drag, toggle, mobile drawer |
| `src/components/admin/AdminAssistant.tsx` | چت باکس دستیار با suggestion‌ها + intent detection |
| `src/components/admin/AdminFloatingButtons.tsx` | بازنویسی — دکمه میانبرها + راهنما |
| `src/components/admin/PlaceholderPage.tsx` | بدون تغییر |
| `src/app/admin/products/page.tsx` | صفحه مدیریت محصولات با جدول + جستجو |
| `src/app/admin/categories/page.tsx` | صفحه مدیریت دسته‌بندی‌ها با نمایش درختی |
| `src/app/api/admin/assistant/chat/route.ts` | API دستیار با intent detection برای ۴ نوع دستور |

## ۵. API Endpoints جدید

| Method + Path | توضیح | ورودی | خروجی |
|---|---|---|---|
| `POST /api/admin/assistant/chat` | چت با دستیار | `{ message: string }` | `{ ok, response }` |

### اضافه شده به `GET /api/admin/stats`:

| type | توضیح |
|---|---|
| `new-users&days=30` | کاربران جدید ۳۰ روز اخیر |
| `conversion-rate` | نرخ تبدیل (تحویل‌شده / کل کاربران) |
| `traffic-sources` | منابع ترافیک (mock) |
| `weekly-comparison` | مقایسه این هفته vs هفته قبل |
| `hourly-traffic` | ساعات پرترافیک ۲۴ ساعته |

## ۶. Schema Changes

هیچ تغییری در Schema دیتابیس داده نشد.

## ۷. وابستگی‌های جدید نصب شده

| پکیج | دلیل |
|---|---|
| `@tiptap/react` | Rich Text Editor (آماده برای فاز بعدی) |
| `@tiptap/starter-kit` | هسته TipTap |
| `@tiptap/extension-underline` | زیرخط در Editor |
| `@tiptap/extension-text-align` | ترازبندی متن |
| `@tiptap/extension-link` | لینک در Editor |
| `@tiptap/extension-image` | تصویر در Editor |
| `@tiptap/extension-table` | جدول در Editor |
| `@tiptap/pm` | ProseMirror برای TipTap |
| `sonner` | Toast notification (آماده برای فاز بعدی) |

## ۸. نمودارهای اضافه شده

| # | نمودار | نوع | API |
|---|---|---|---|
| ۱ | روند فروش ۷ روز | Area | `sales-trend&days=7` |
| ۲ | وضعیت سفارشات | Donut | `orders-status` |
| ۳ | فروش ماهانه | Bar | `monthly-sales` |
| ۴ | پرفروش‌ترین دسته‌ها | Horizontal Bar | `top-categories` |
| ۵ | کاربران جدید ۳۰ روز | Area | `new-users&days=30` |
| ۶ | نرخ تبدیل | Radial Bar | `conversion-rate` |
| ۷ | منابع ترافیک | Pie | `traffic-sources` |
| ۸ | مقایسه هفتگی | Multi-Line | `weekly-comparison` |
| ۹ | ساعات پرترافیک | Bar 24h | `hourly-traffic` |

## ۹. دستیار عملیاتی

Actions پیاده‌سازی شده در `POST /api/admin/assistant/chat`:
- **گزارش فروش** — تشخیص کلمات "گزارش" و "فروش"
- **ایجاد پست بلاگ** — تشخیص "بلاگ"، "پست"، "بنویس"
- **ایجاد محصول** — تشخیص "محصول"، "بساز"
- **ایجاد اسلاید** — تشخیص "اسلاید"، "اسلایدر"
- **Fallback** — پیام راهنما با لیست دستورات

دکمه بنفش پایین سمت چپ با چت باکس گرادینت بنفش،  
۴ suggestion آماده،  
Input با آپلود فایل (آماده برای فاز بعدی)،  
Header با نشانگر سبز "موتور محلی".

## ۱۰. تست‌های انجام شده

| تست | نتیجه |
|---|---|
| TypeScript Compilation | ✅ بدون خطا |
| Sidebar باز/بسته | ✅ |
| Sidebar اسکرول موس | ✅ |
| Sidebar درگ | ✅ |
| Sidebar Drawer موبایل | ✅ |
| نمودارهای جدید (۵-۹) | ✅ داده از API |
| `GET /api/admin/stats?type=new-users` | ✅ |
| `GET /api/admin/stats?type=conversion-rate` | ✅ |
| `GET /api/admin/stats?type=weekly-comparison` | ✅ |
| `POST /api/admin/assistant/chat` | ✅ |
| Products page | ✅ جدول + جستجو |
| Categories tree | ✅ نمایش درختی |

## ۱۱. مشکلات و محدودیت‌ها

- **TipTap Editor** نصب شده ولی در این فاز صفحه محصولات از آن استفاده نمی‌کند (برای فاز بعدی)
- **دستیار هوشمند** از intent detection ساده (کلمه کلیدی) استفاده می‌کند، موتور AI واقعی هنوز متصل نشده
- **محصولات** CRUD کامل با modal ویرایش در فاز بعدی تکمیل می‌شود
- **دسته‌بندی‌ها** قابلیت Drag & Drop در این فاز پیاده‌سازی نشد
- API‌های `new-users`, `conversion-rate`, `hourly-traffic` داده‌های واقعی را برمی‌گردانند، ولی `traffic-sources` از mock data استفاده می‌کند

## ۱۲. دستورات نصب و اجرا

```bash
npm install              # نصب وابستگی‌ها (TipTap + Sonner)
npm run dev              # اجرای سرور توسعه
# نیازی به migration یا seed جدید نیست
```

## ۱۳. پیشنهاد فاز ۳

### اولویت اول: تکمیل CRUD محصولات
1. Modal افزودن/ویرایش محصول با TipTap Rich Text Editor
2. مدیریت تنوع (Variants)
3. آپلود تصویر (اصلی + گالری)
4. مدیریت برندها و تگ‌ها

### اولویت دوم
5. Drag & Drop برای دسته‌بندی‌ها
6. اتصال موتور AI واقعی به دستیار
7. مدیریت سفارشات کامل
8. صفحه تنظیمات سایت
