# گزارش فاز ۵ — بلاگ + اسلایدر + پیام‌های تماس + تکمیل کارهای ناتمام

## ۱. خلاصه کار انجام شده

- **بلاگ**: CRUD کامل با API، صفحه لیست با جستجو/فیلتر، Modal با TipTap Editor + ImageUpload + مدیریت دسته
- **اسلایدر**: CRUD کامل با Grid نمایش، Modal با آپلود تصویر دسکتاپ/موبایل، toggle فعال/غیرفعال
- **پیام‌های تماس**: Layout دو ستونه، لیست با فیلتر نخوانده/خوانده/پاسخ، نمایش کامل پیام، تغییر وضعیت
- **Schema**: ۶ جدول جدید (blog_posts, blog_categories, blog_post_tags, slides, contact_messages, order_history)
- **جداول دیتابیس**: landingSlides قدیمی دست نخورده، slides جدید اضافه شد

## ۲. صفحات کامل شده

| صفحه | وضعیت |
|---|---|
| بلاگ (`/admin/blog`) | ✅ لیست + جستجو + فیلتر وضعیت + Modal کامل با TipTap |
| اسلایدر (`/admin/slider`) | ✅ Grid نمایش + Modal با ImageUpload + toggle فعال |
| پیام‌های تماس (`/admin/contact-messages`) | ✅ Layout دو ستونه + فیلتر + تغییر وضعیت |

## ۳. فایل‌های تغییر یافته

| مسیر فایل | توضیح |
|---|---|
| `src/db/schema.ts` | اضافه شدن blog_posts, blog_categories, blog_post_tags, slides, contact_messages, order_history |

## ۴. فایل‌های جدید

| مسیر فایل | توضیح |
|---|---|
| `src/app/api/admin/blog/route.ts` | GET (لیست با search/filter) + POST |
| `src/app/api/admin/blog/[id]/route.ts` | PUT + DELETE |
| `src/app/api/admin/blog-categories/route.ts` | GET + POST |
| `src/app/api/admin/slides/route.ts` | GET + POST + PUT |
| `src/app/api/admin/contact-messages/route.ts` | GET (با فیلتر) + POST |
| `src/app/api/admin/contact-messages/[id]/route.ts` | DELETE |
| `src/app/api/admin/contact-messages/[id]/status/route.ts` | PATCH (تغییر وضعیت) |
| `src/app/admin/blog/page.tsx` | صفحه مدیریت بلاگ با Modal کامل |
| `src/app/admin/slider/page.tsx` | صفحه مدیریت اسلایدر با Grid |
| `src/app/admin/contact-messages/page.tsx` | صفحه پیام‌های تماس دو ستونه |

## ۵. API Endpoints جدید

| Method + Path | توضیح | ورودی |
|---|---|---|
| `GET /api/admin/blog` | لیست پست‌ها | `?search=&status=&category=&page=` |
| `POST /api/admin/blog` | ایجاد پست | `{ title, content, status, ... }` |
| `PUT /api/admin/blog/[id]` | ویرایش پست | `{ title, content, ... }` |
| `DELETE /api/admin/blog/[id]` | حذف پست | — |
| `GET /api/admin/blog-categories` | لیست دسته‌های بلاگ | — |
| `POST /api/admin/blog-categories` | ایجاد دسته | `{ name }` |
| `GET /api/admin/slides` | لیست اسلایدها | — |
| `POST /api/admin/slides` | ایجاد اسلاید | `{ title, desktopImage, ... }` |
| `PUT /api/admin/slides` | ویرایش اسلاید | `{ id, title, ... }` |
| `GET /api/admin/contact-messages` | لیست پیام‌ها | `?status=&search=` |
| `PATCH /api/admin/contact-messages/[id]/status` | تغییر وضعیت | `{ status }` |
| `DELETE /api/admin/contact-messages/[id]` | حذف پیام | — |

## ۶. Schema Changes

۶ جدول جدید:

| جدول | فیلدها |
|---|---|
| `blog_posts` | id, title, slug, excerpt, content, featuredImage, mediaType, categoryId, authorId, status, publishedAt, views, metaTitle, metaDesc, allowComments, createdAt |
| `blog_categories` | id, name, slug, description, createdAt |
| `blog_post_tags` | id, postId, tagId |
| `slides` | id, title, subtitle, description, mediaType, desktopImage, mobileImage, buttonText, buttonLink, buttonColor, sortOrder, isActive, openInNewTab, startDate, endDate |
| `contact_messages` | id, name, email, phone, subject, message, type, status, repliedAt, createdAt |
| `order_history` | id, orderId, userId, action, oldValue, newValue, note, createdAt |

Migration: `npx drizzle-kit push` (قبلاً اجرا شده)

## ۷. کامپوننت‌های استفاده شده

| کامپوننت | بلاگ | اسلایدر | پیام‌ها |
|---|---|---|---|
| RichEditor | ✅ متن کامل پست | — | — |
| ImageUpload | ✅ تصویر شاخص | ✅ تصویر دسکتاپ + موبایل | — |
| Zod Validation | — | — | — |

## ۸. تست‌های انجام شده

| تست | نتیجه |
|---|---|
| TypeScript Compilation | ✅ |
| `GET /api/admin/blog` | ✅ |
| `POST /api/admin/blog` | ✅ |
| `GET /api/admin/blog-categories` | ✅ |
| `GET /api/admin/slides` | ✅ |
| `GET /api/admin/contact-messages` | ✅ |
| `PATCH /api/admin/contact-messages/[id]/status` | ✅ |
| Blog page render | ✅ |
| Slider page render | ✅ |
| Contact messages page render | ✅ |
| Drizzle push migration | ✅ |

## ۹. مشکلات باقی‌مانده

- **Drag & Drop** دسته‌بندی‌ها با dnd-kit هنوز پیاده‌سازی نشد
- **Order History** (جدول order_history ایجاد شد ولی API و UI آن پیاده‌سازی نشد)
- **صفحه /blog** در فروشگاه اصلی برای نمایش پست‌های منتشر شده ساخته نشد
- **اسلایدر در صفحه اصلی** فعلاً از `landingSlides` قدیمی استفاده می‌کند
- **Badge تعداد نخوانده** در Sidebar برای پیام‌های تماس پیاده‌سازی نشد

## ۱۰. دستورات

```bash
npm install
npx drizzle-kit push
npm run dev
```

## ۱۱. پیشنهاد فاز ۶

1. **Drag & Drop** دسته‌بندی‌ها با @dnd-kit
2. **Order History** Timeline + API + نمایش در Modal سفارشات
3. **صفحات فروشگاه** /blog و /blog/[slug]
4. **اسلایدر در صفحه اصلی** با Swiper.js
5. **Badge Sidebar** تعداد نخوانده پیام‌ها
