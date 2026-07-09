# گزارش بازسازی پنل مدیریت — فاز ۱

## ۱. خلاصه کار

پنل مدیریت پروژه "درنیکا ساحل" به‌طور کامل بازطراحی و بازسازی شد. ساختار قدیمی (یک صفحه با مودال) جای خود را به یک **Layout حرفه‌ای با Sidebar دارک و گروه‌بندی شده** داد. صفحه داشبورد نیز با **کارت‌های آماری گرادینت، نمودارهای تعاملی Recharts و جدول‌های اطلاعاتی** جایگزین شد. ۱۵ صفحه placeholder برای فازهای بعدی ایجاد شد.

## ۲. ساختار پروژه فعلی

- **Framework:** Next.js 16 (Turbopack)
- **UI Framework:** Tailwind CSS v4
- **Database:** PostgreSQL + Drizzle ORM
- **Charts:** Recharts v3
- **Icons:** Lucide React
- **Language:** TypeScript

## ۳. فایل‌های تغییر یافته

| مسیر فایل | توضیح تغییر |
|---|---|
| `src/app/admin/page.tsx` | بازنویسی کامل — از یک wrapper ساده به داشبورد کامل با کارت‌ها، نمودارها و جدول‌ها |
| `src/app/admin/layout.tsx` | **جدید** — Layout اختصاصی ادمین با احراز هویت و Sidebar |
| `src/app/admin/AdminDashboard.tsx` | **حذف** — جای خود را به page.tsx جدید داد |

## ۴. فایل‌های جدید ساخته شده

| مسیر فایل | توضیح کاربرد |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | سایدبار دارک با ۶ گروه منو، کلاپس، حالت active |
| `src/components/admin/AdminFloatingButtons.tsx` | ۳ دکمه شناور (دستیار هوشمند، میانبرها، راهنما) |
| `src/components/admin/PlaceholderPage.tsx` | کامپوننت placeholder برای صفحات آینده |
| `src/app/api/admin/stats/route.ts` | API یکپارچه آمار با قابلیت type=overview, sales-trend, orders-status, ... |

### ۱۵ صفحه placeholder:

| مسیر | عنوان |
|---|---|
| `src/app/admin/orders/page.tsx` | مدیریت سفارشات |
| `src/app/admin/products/page.tsx` | مدیریت محصولات |
| `src/app/admin/categories/page.tsx` | مدیریت دسته‌بندی‌ها |
| `src/app/admin/blog/page.tsx` | مدیریت بلاگ |
| `src/app/admin/slider/page.tsx` | مدیریت اسلایدر |
| `src/app/admin/payments/page.tsx` | درگاه‌های پرداخت |
| `src/app/admin/sms/page.tsx` | پنل پیامک |
| `src/app/admin/email/page.tsx` | پنل ایمیل |
| `src/app/admin/telegram-bot/page.tsx` | ربات فروشگاهی تلگرام |
| `src/app/admin/contact-messages/page.tsx` | پیام‌های تماس |
| `src/app/admin/ai/page.tsx` | هوش مصنوعی |
| `src/app/admin/users/page.tsx` | مدیریت کاربران |
| `src/app/admin/icons/page.tsx` | آیکون‌ها |
| `src/app/admin/backup/page.tsx` | بکاپ و بازیابی |
| `src/app/admin/settings/page.tsx` | تنظیمات سایت |

## ۵. API Endpoints جدید

| Method + Path | توضیح | ورودی | خروجی نمونه |
|---|---|---|---|
| `GET /api/admin/stats?type=overview` | آمار کلی | — | `{ products, variants, orders, users, totalRevenue, ... }` |
| `GET /api/admin/stats?type=sales-trend&days=7` | روند فروش | days (number) | `[{ date, total, count }]` |
| `GET /api/admin/stats?type=orders-status` | وضعیت سفارشات | — | `[{ status, count }]` |
| `GET /api/admin/stats?type=monthly-sales` | فروش ماهانه | — | `[{ month, total }]` |
| `GET /api/admin/stats?type=top-categories` | پرفروش‌ترین دسته‌ها | — | `[{ categoryTitle, totalSales, count }]` |
| `GET /api/admin/stats?type=top-selling&limit=5` | پرفروش‌ترین محصولات | limit (number) | `[{ id, title, totalSold, totalRevenue }]` |
| `GET /api/admin/stats?type=recent-orders&limit=5` | آخرین سفارشات | limit (number) | `[{ id, orderNumber, status, totalAmount, userName }]` |

## ۶. وابستگی‌های جدید

هیچ پکیج جدیدی نصب نشد (Recharts از قبل در `package.json` وجود داشت).

## ۷. Sidebar — ساختار نهایی

```
اصلی
├── 🏠 داشبورد           → /admin
└── 📦 سفارشات           → /admin/orders

فروشگاه
├── 📦 محصولات           → /admin/products
└── 🏷️ دسته‌بندی‌ها      → /admin/categories

محتوا
├── 📄 بلاگ              → /admin/blog
└── 🎠 اسلایدر           → /admin/slider

ارتباطات و درگاه‌ها
├── 💳 درگاه‌های پرداخت   → /admin/payments
├── 💬 پنل پیامک          → /admin/sms
├── 📧 پنل ایمیل          → /admin/email
├── 🤖 ربات تلگرام        → /admin/telegram-bot
└── 📥 پیام‌های تماس      → /admin/contact-messages

هوشمند
├── ✨ هوش مصنوعی         → /admin/ai

مدیریت سیستم
├── 👥 کاربران            → /admin/users
├── 🖼️ آیکون‌ها           → /admin/icons
├── 🗄️ بکاپ و بازیابی     → /admin/backup
└── ⚙️ تنظیمات سایت       → /admin/settings
```

## ۸. صفحه داشبورد — چه چیزی ساخته شد

### کارت‌های آماری اصلی (۴ عدد، گرادینت رنگی)
1. کاربران — گرادینت آبی، آیکون Users، تعداد
2. محصولات — گرادینت بنفش، آیکون Package، تعداد
3. سفارشات — گرادینت صورتی، آیکون ShoppingBag، تعداد
4. کل درآمد — گرادینت سبز، آیکون Wallet، مبلغ ریال

### کارت‌های هشدار (۴ عدد)
1. مقالات بلاگ (آبی)
2. محصولات موجودی کم (قرمز)
3. سفارشات در انتظار (زرد)
4. میانگین ارزش سفارش (بنفش)

### نمودارهای تعاملی Recharts
- **نمودار ۱:** روند فروش ۷ روز اخیر (Area Chart با گرادینت)
- **نمودار ۲:** وضعیت سفارشات (Donut Chart)
- **نمودار ۳:** فروش ماهانه (Bar Chart)
- **نمودار ۴:** پرفروش‌ترین دسته‌بندی‌ها (Horizontal Bar Chart)

### جدول‌ها
- **جدول آخرین سفارشات (۵ مورد):** شماره سفارش، مشتری، مبلغ، وضعیت (badge رنگی)
- **جدول پرفروش‌ترین محصولات (۵ مورد):** نام محصول، تعداد فروش، درآمد

## ۹. صفحات Placeholder

۱۵ صفحه placeholder با عنوان و پیام "این بخش در فاز بعدی پیاده‌سازی می‌شود" ایجاد شد.

## ۱۰. مشکلات یا محدودیت‌ها

- نمودار **ساعات پرترافیک** و **نقشه استان‌ها** در این فاز پیاده‌سازی نشدند (نیاز به داده‌های Analytics واقعی دارند)
- **مقایسه هفته جاری vs هفته قبل** نیاز به داده‌های تاریخی بیشتر دارد
- دکمه **دستیار هوشمند** فقط مودال خالی باز می‌کند
- API مسیرهای `/api/admin/stats/new-users`, `/api/admin/stats/conversion-rate`, `/api/admin/stats/traffic-sources` و `/api/admin/stats/hourly-traffic` هنوز ساخته نشدند (چون نیاز به داده‌های Analytics خارجی دارند)

## ۱۱. دستورات نصب و اجرا

```bash
npm install      # وابستگی‌ها (Recharts از قبل موجود)
npm run dev      # اجرای سرور توسعه
# نیازی به migration یا seed جدید نیست
```

## ۱۲. تست انجام شده

| تست | نتیجه |
|---|---|
| `GET /api/admin/stats?type=overview` | ✅ 200 — داده‌های واقعی |
| `GET /api/admin/stats?type=sales-trend` | ✅ 200 |
| `GET /api/admin/stats?type=orders-status` | ✅ 200 |
| `GET /api/admin/stats?type=monthly-sales` | ✅ 200 |
| `GET /api/admin/stats?type=top-categories` | ✅ 200 |
| `GET /api/admin/stats?type=top-selling` | ✅ 200 |
| `GET /api/admin/stats?type=recent-orders` | ✅ 200 |
| صفحه `/admin` (داشبورد) | ✅ 200 |
| صفحات placeholder | ✅ 200 |
| TypeScript Compilation | ✅ بدون خطا |

## ۱۳. پیشنهاد فاز بعدی

### اولویت اول: تکمیل CRUD صفحات
1. **مدیریت سفارشات** (`/admin/orders`) — نمایش، فیلتر، تغییر وضعیت
2. **مدیریت محصولات** (`/admin/products`) — CRUD کامل + آپلود تصویر
3. **مدیریت دسته‌بندی‌ها** (`/admin/categories`) — CRUD درختی
4. **تنظیمات سایت** (`/admin/settings`) — ویرایش مستقیم مقدارها

### اولویت دوم
5. **پنل پیامک** (`/admin/sms`) — اتصال به ارائه‌دهندگان SMS
6. **بلاگ** (`/admin/blog`) — ایجاد و مدیریت مقالات
7. **اسلایدر** (`/admin/slider`) — مدیریت اسلایدهای لندینگ
