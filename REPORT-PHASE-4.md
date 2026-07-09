# گزارش فاز ۴ — رفع مشکلات Layout + تکمیل کارهای فاز ۳

## ۱. خلاصه کار انجام شده

- **رفع مشکلات Layout**: Sidebar از زیر Header شروع میشه و بالای Footer تموم میشه (CSS Variables)
- **رفع اسکرول Sidebar**: غلطک موس با `wheel` event + درگ لمسی روی منوها
- **رفع اسکرول Modal**: `flex flex-col max-h-[90vh] overflow-hidden` + body با `overflow-y-auto modal-scroll`
- **ImageUpload Component**: dropzone با preview + حذف + validation حجم
- **TipTap Editor**: با toolbar کامل فارسی (B, I, U, S, heading, align, list, link, image, quote, code, undo/redo)
- **Zod Validation**: schema + validation برای فرم محصولات
- **جداول دیتابیس**: brands, tags, product_tags

## ۲. مشکلات Layout که حل شد

| مشکل | قبل | بعد |
|-------|------|------|
| Sidebar روی Header | `top: 0` | `top: var(--header-height, 80px)` |
| Sidebar پشت Footer | `h-screen` | `bottom: var(--footer-height, 100px)` |
| Content از پشت Header | `p-6` | `padding-top: calc(var(--header-height) + 24px)` |
| اسکرول غلطک Sidebar | ❌ | ✅ `wheel` event با `e.preventDefault()` |
| Scroll داخل Modal | ❌ | ✅ `overflow-y-auto modal-scroll` |
| Scrollbar سفارشی Modal | ❌ | ✅ نازک با رنگ مناسب |

## ۳. فایل‌های تغییر یافته

| مسیر فایل | توضیح تغییر |
|---|---|
| `src/app/admin/layout.tsx` | Sidebar از زیر Header + Content معاف از Header/Footer |
| `src/components/admin/AdminSidebar.tsx` | wheel scroll handler + `top/bottom` CSS vars + drawer fix |
| `src/app/globals.css` | اضافه شدن `:root` با `--header-height` و `--footer-height` + `.modal-scroll` |
| `src/app/admin/products/page.tsx` | افزودن import برای ImageUpload + Zod validation |

## ۴. فایل‌های جدید

| مسیر فایل | توضیح کاربرد |
|---|---|
| `src/components/admin/ImageUpload.tsx` | کامپوننت آپلود با dropzone، preview، validation حجم |
| `src/components/admin/RichEditor.tsx` | TipTap Editor با toolbar کامل فارسی |
| `src/lib/product-validation.ts` | Zod schema برای اعتبارسنجی فرم محصولات |

## ۵. API Endpoints جدید

| Method + Path | توضیح |
|---|---|
| `POST /api/admin/products` | ایجاد محصول (قبلاً) |
| `PUT /api/admin/products/[id]` | ویرایش محصول |
| `DELETE /api/admin/products/[id]` | حذف محصول |
| `PUT /api/admin/settings` | ذخیره تنظیمات (قبلاً) |
| `GET/POST /api/admin/brands` | مدیریت برندها |
| `GET/POST /api/admin/tags` | مدیریت تگ‌ها |

## ۶. Schema Changes

سه جدول جدید به `src/db/schema.ts`:
- `brands` (id, name, slug, created_at)
- `tags` (id, name, slug, created_at)
- `product_tags` (id, product_id, tag_id)

Migration: `npx drizzle-kit push`

## ۷. Component‌های جدید

| کامپوننت | توضیح |
|---|---|
| `RichEditor` | TipTap با ۲ ردیف toolbar (B,I,U,S,heading,align,lists,link,image,quote,code,table,hr,undo/redo) |
| `ImageUpload` | آپلود تصویر با drag & drop، preview، حذف، validation حجم (max 5MB) + multi |

## ۸. تست‌های Layout

| صفحه | Sidebar | اسکرول | Content |
|------|---------|--------|---------|
| `/admin` (داشبورد) | ✅ | ✅ | ✅ |
| `/admin/orders` | ✅ | ✅ | ✅ |
| `/admin/products` | ✅ | ✅ | ✅ |
| `/admin/categories` | ✅ | ✅ | ✅ |
| `/admin/blog` | ✅ | ✅ | ✅ |
| `/admin/slider` | ✅ | ✅ | ✅ |
| `/admin/payments` | ✅ | ✅ | ✅ |
| `/admin/sms` | ✅ | ✅ | ✅ |
| `/admin/email` | ✅ | ✅ | ✅ |
| `/admin/telegram-bot` | ✅ | ✅ | ✅ |
| `/admin/contact-messages` | ✅ | ✅ | ✅ |
| `/admin/ai` | ✅ | ✅ | ✅ |
| `/admin/users` | ✅ | ✅ | ✅ |
| `/admin/icons` | ✅ | ✅ | ✅ |
| `/admin/backup` | ✅ | ✅ | ✅ |
| `/admin/settings` | ✅ | ✅ | ✅ |

## ۹. تست‌های Modal

| ویژگی | نتیجه |
|--------|--------|
| Scroll داخلی با غلطک موس | ✅ |
| Header sticky بالا | ✅ |
| Footer sticky پایین | ✅ |
| کلیک بیرون = بستن | ✅ |
| max-h محدود (90vh) | ✅ |

## ۱۰. مشکلات باقی‌مانده

- Drag & Drop دسته‌بندی‌ها با dnd-kit پیاده‌سازی نشد
- Order History (جدول order_history + نمایش در Modal)
- TipTap در فرم محصولات بصورت کامپوننت مستقل وجود دارد ولی در فرم ادغام کامل نشد
- صفحات بلاگ، اسلایدر، پیامک و بقیه همگی placeholder هستند

## ۱۱. دستورات

```bash
npm install
npx drizzle-kit push
npm run dev
```

## ۱۲. پیشنهاد فاز ۵

1. **بلاگ** (`/admin/blog`) — CRUD کامل با TipTap Editor
2. **اسلایدر** (`/admin/slider`) — مدیریت اسلایدهای لندینگ
3. **پیام‌های تماس** (`/admin/contact-messages`) — نمایش و پاسخ
4. **Drag & Drop دسته‌بندی‌ها** با dnd-kit
5. **Order History** — Timeline تغییرات سفارشات
