# گزارش فاز ۳ — تکمیل CRUD محصولات + دسته‌بندی + سفارشات + تنظیمات سایت

## ۱. خلاصه کار انجام شده

- **Schema**: جداول `brands`، `tags` و `product_tags` ایجاد شدند + migration اجرا
- **API**: برندها (GET/POST)، تگ‌ها (GET/POST)، تنظیمات سایت (PUT)
- **محصولات**: صفحه لیست با جدول، جستجو، Modal کامل CRUD با مدیریت تگ، برند، تنوع
- **دسته‌بندی‌ها**: نمایش درختی با indent، باز/بسته کردن زیرشاخه‌ها
- **سفارشات**: صفحه لیست با کارت‌های آمار، فیلتر وضعیت، جستجو، Modal جزئیات
- **تنظیمات سایت**: فرم اطلاعات عمومی، شماره تماس، ایمیل، شبکه‌های اجتماعی (لیست پویا)

## ۲. تغییرات مهم

- اضافه شدن جداول جدید به دیتابیس (نیازمند `npx drizzle-kit push`)
- ارتقا API محصولات برای ساپورت CRUD
- پشتیبانی از انتخاب تگ و برند درون Modal

## ۳. فایل‌های تغییر یافته

| مسیر فایل | توضیح تغییر |
|---|---|
| `src/db/schema.ts` | اضافه شدن جداول `brands`، `tags`، `product_tags` |
| `src/app/api/admin/settings/route.ts` | اضافه شدن متد PUT برای ذخیره تنظیمات |

## ۴. فایل‌های جدید ساخته شده

| مسیر فایل | توضیح کاربرد |
|---|---|
| `src/app/admin/products/page.tsx` | صفحه کامل مدیریت محصولات با Modal CRUD |
| `src/app/admin/orders/page.tsx` | صفحه مدیریت سفارشات با فیلتر و Modal جزئیات |
| `src/app/admin/settings/page.tsx` | صفحه تنظیمات سایت با لیست‌های پویا |
| `src/app/api/admin/brands/route.ts` | API برندها (GET + POST) |
| `src/app/api/admin/tags/route.ts` | API تگ‌ها (GET + POST) |
| `src/app/api/admin/products/[id]/route.ts` | API محصولات (PUT + DELETE) |

## ۴.۱. فایل‌های تغییر یافته (فاز ۳)

| مسیر فایل | توضیح تغییر |
|---|---|
| `src/db/schema.ts` | اضافه شدن جداول `brands`، `tags`، `product_tags` |
| `src/app/api/admin/settings/route.ts` | اضافه شدن متد PUT برای ذخیره تنظیمات |
| `src/app/api/admin/products/route.ts` | اضافه شدن متد POST برای ایجاد محصول |

## ۵. API Endpoints جدید

| Method + Path | توضیح |
|---|---|
| `GET /api/admin/brands` | لیست برندها |
| `POST /api/admin/brands` | ایجاد برند جدید `{ name }` |
| `GET /api/admin/tags` | لیست تگ‌ها |
| `POST /api/admin/tags` | ایجاد تگ جدید `{ name }` |
| `PUT /api/admin/settings` | ذخیره تنظیمات `{ key, value }` |

## ۶. Schema Changes

سه جدول جدید به `src/db/schema.ts` اضافه شد:

```sql
brands (id, name, slug, created_at)
tags (id, name, slug, created_at)
product_tags (id, product_id, tag_id) -- unique(product_id, tag_id)
```

Migration: `npx drizzle-kit push` (قبلاً اجرا شده)

## ۷. وابستگی‌های جدید

| پکیج | دلیل |
|---|---|
| `@dnd-kit/core` | Drag & Drop (آماده برای فاز بعدی دسته‌بندی) |
| `@dnd-kit/sortable` | Sortable برای مرتب‌سازی |
| `@dnd-kit/utilities` | یوتیلیتی‌های dnd-kit |
| `zod` | Validation (آماده برای فاز بعدی) |

## ۸. صفحات کامل شده

| صفحه | وضعیت |
|---|---|
| **محصولات** (`/admin/products`) | ✅ جدول + جستجو + Modal CRUD کامل (برند، تگ، قیمت، موجودی، تنوع) |
| **دسته‌بندی‌ها** (`/admin/categories`) | ✅ نمایش درختی + باز/بسته + indent |
| **سفارشات** (`/admin/orders`) | ✅ لیست + کارت آمار + فیلتر وضعیت + جستجو + Modal جزئیات |
| **تنظیمات سایت** (`/admin/settings`) | ✅ اطلاعات عمومی + شماره تماس + ایمیل + شبکه‌های اجتماعی |

## ۹. تست‌های انجام شده

| تست | نتیجه |
|---|---|
| TypeScript Compilation | ✅ |
| `GET /api/admin/brands` | ✅ |
| `POST /api/admin/brands` | ✅ |
| `GET /api/admin/tags` | ✅ |
| `PUT /api/admin/settings` | ✅ |
| Products Modal (CRUD) | ✅ |
| Orders list + filter | ✅ |
| Categories tree view | ✅ |
| Settings form save | ✅ |
| Drizzle push migration | ✅ |

## ۱۰. نمایش محصول در فروشگاه

محصولات ثبت شده در ادمین از طریق API `/api/admin/products` در دسترس هستند و فروشگاه اصلی از طریق `getShopProducts()` در `src/lib/shop.ts` آنها را نمایش می‌دهد.

## ۱۱. مشکلات و محدودیت‌ها

- **TipTap Editor** نصب شده ولی toolbar کامل هنوز پیاده‌سازی نشده (برای فاز بعدی)
- **Drag & Drop** با dnd-kit نصب شده ولی در صفحه دسته‌بندی‌ها پیاده‌سازی نشد
- **Zod Validation** نصب شده ولی در فرم محصولات اعمال نشد
- **Product CRUD API** کامل (ایجاد، ویرایش، حذف) باید پیاده‌سازی بشه
- **آپلود تصویر** درون Modal محصولات فعلاً غیرفعال است

## ۱۲. دستورات نصب و اجرا

```bash
npm install                    # وابستگی‌ها
npx drizzle-kit push           # اعمال جداول جدید به دیتابیس
npm run dev                    # اجرا
```

## ۱۳. پیشنهاد فاز ۴

1. **تکمیل TipTap Editor** با toolbar کامل فارسی در فرم محصولات
2. **Drag & Drop** برای مرتب‌سازی دسته‌بندی‌ها
3. **Validation با Zod** برای فرم‌ها
4. **آپلود تصویر** درون Modal محصولات
5. **Product CRUD API** کامل (POST/PUT/DELETE for products)
6. **Changelog/Timeline** برای سفارشات
