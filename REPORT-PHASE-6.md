# گزارش فاز ۶ — نمایش در فروشگاه + تکمیل کارهای ناتمام

## ۱. خلاصه کار انجام شده

- **Drag & Drop دسته‌بندی‌ها**: با @dnd-kit با قابلیت تغییر ترتیب با درگ (grip handle)
- **Order History**: جدول order_history + API دریافت و ثبت + helper function
- **Badge پیام‌های نخوانده**: در Sidebar کنار آیتم "پیام‌های تماس" با رفرش هر ۳۰ ثانیه
- **صفحه /blog**: لیست پست‌های منتشر شده در فروشگاه اصلی با Grid
- **صفحه /blog/[slug]**: نمایش کامل پست با افزایش بازدید خودکار
- **HeroSlider**: کامپوننت با Swiper.js (navigation, pagination, autoplay, fade effect)
- **API مرتب‌سازی**: PATCH /api/admin/categories/reorder
- **Unread count API**: GET /api/admin/contact-messages/unread-count

## ۲. کارهای ناتمام که تموم شد

| کار | وضعیت | توضیح |
|-----|--------|--------|
| Drag & Drop دسته‌بندی‌ها | ✅ | @dnd-kit با SortableContext + grip handle + visual feedback |
| Order History | ✅ | جدول + API + helper + ACTION_LABELS |
| Badge پیام‌های نخوانده | ✅ | در Sidebar + رفرش ۳۰ ثانیه‌ای |
| صفحه /blog فروشگاه | ✅ | Grid + card + دسته‌بندی + بازدید |
| صفحه /blog/[slug] | ✅ | نمایش کامل + افزایش بازدید + breadcrumb |
| HeroSlider | ✅ | Swiper.js با fade + autoplay + RTL |

## ۳. فایل‌های جدید

| مسیر فایل | توضیح |
|---|---|
| `src/app/api/admin/categories/reorder/route.ts` | PATCH مرتب‌سازی دسته‌ها |
| `src/app/api/admin/contact-messages/unread-count/route.ts` | GET تعداد نخوانده‌ها |
| `src/app/api/admin/orders/[id]/history/route.ts` | GET + POST تاریخچه سفارش |
| `src/lib/order/history.ts` | Helper + logOrderHistory + ACTION_LABELS |
| `src/app/blog/page.tsx` | لیست بلاگ فروشگاه اصلی |
| `src/app/blog/[slug]/page.tsx` | نمایش پست بلاگ |
| `src/components/home/HeroSlider.tsx` | اسلایدر Swiper.js برای صفحه اصلی |

## ۴. فایل‌های تغییر یافته

| مسیر فایل | توضیح |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | Badge پیام‌های نخوانده |
| `src/app/admin/categories/page.tsx` | Drag & Drop با @dnd-kit |

## ۵. API Endpoints جدید

| Method + Path | توضیح |
|---|---|
| `PATCH /api/admin/categories/reorder` | مرتب‌سازی دسته‌ها `{ items: [{id, sortOrder}] }` |
| `GET /api/admin/contact-messages/unread-count` | تعداد نخوانده `{ count }` |
| `GET /api/admin/orders/[id]/history` | تاریخچه سفارش |
| `POST /api/admin/orders/[id]/history` | افزودن یادداشت `{ note }` |

## ۶. Schema Changes

جدول `order_history` (قبلاً در فاز ۵ اضافه شده بود):
- id, orderId, userId, action, oldValue, newValue, note, createdAt

Migration: `npx drizzle-kit push` (قبلاً اجرا شده)

## ۷. کامپوننت‌های جدید

| کامپوننت | کتابخانه | کاربرد |
|---|---|---|
| `HeroSlider` | Swiper.js | اسلایدر صفحه اصلی با fade/navigation/pagination/autoplay |
| `SortableCategoryNode` | @dnd-kit | آیتم درگ‌پذیر دسته‌بندی |

## ۸. Drag & Drop (توضیح فنی)

- استفاده از `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- PointerSensor با activationConstraint distance: 5 (جلوگیری از کلیک اشتباهی)
- SortableContext با verticalListSortingStrategy
- useSortable hook با transform و transition برای انیمیشن
- GripVertical آیکون برای درگ هندل
- opacity: 0.5 موقع درگ
- ذخیره خودکار با PATCH /api/admin/categories/reorder

## ۹. Order History (توضیح فنی)

- جدول order_history با action, oldValue, newValue, note
- ACTION_LABELS برای نمایش فارسی (order_created, status_changed, ...)
- logOrderHistory() برای ثبت خودکار
- GET برای دریافت + POST برای افزودن یادداشت دستی

## ۱۰. تست‌های انجام شده

| تست | نتیجه |
|---|---|
| TypeScript Compilation | ✅ |
| Drag & Drop categories | ✅ |
| `GET /api/admin/contact-messages/unread-count` | ✅ |
| `GET /api/admin/orders/[id]/history` | ✅ |
| `PATCH /api/admin/categories/reorder` | ✅ |
| Blog page render `/blog` | ✅ |
| Blog post page `/blog/[slug]` | ✅ |
| Sidebar badge | ✅ |

## ۱۱. مشکلات باقی‌مانده

- **اسلایدر در صفحه اصلی**: HeroSlider ساخته شده ولی در `src/app/page.tsx` ادغام نشده
- **پنل پیامک** (`/admin/sms`): ۴ Tab (تنظیمات، ارسال، تاریخچه، الگوها) پیاده‌سازی نشد
- **پنل ایمیل** (`/admin/email`): ۴ Tab (Inbox، Sent، Compose، Settings) پیاده‌سازی نشد
- **نصب Swiper.js** انجام شده ولی `swiper/css`可能需要額外配置

## ۱۲. دستورات

```bash
npm install                    # وابستگی‌ها
npx drizzle-kit push           # migration
npm run dev                    # اجرا
```

## ۱۳. پیشنهاد فاز ۷

1. **پنل پیامک** — ۴ Tab با سرویس‌دهنده‌های ایرانی
2. **پنل ایمیل** — SMTP + ایمیل‌های تراکنشی
3. **ادغام HeroSlider در صفحه اصلی** — جایگزینی landingSlides قدیمی
4. **بخش دیدگاه‌های بلاگ** (blog_comments)
5. **بهبود UI/UX عمومی** 
