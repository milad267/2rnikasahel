# خلاصه کامل پروژه فروشگاهی درنیکا ساحل (Next.js + PostgreSQL)

---

## ۱. نمای کلی پروژه

پروژه فروشگاهی **«درنیکا ساحل»** برای تجهیزات صنعتی و تأسیسات.
یک فروشگاه اینترنتی کامل با **Next.js 16.2.6**, **React 19.2.6**, **PostgreSQL**, **Drizzle ORM**, **Tailwind CSS 4.1**.

سیستم دارای پنل ادمین کامل، احراز هویت، سبد خرید، سفارش‌گیری، پرداخت اینترنتی (۸ درگاه شامل ایرانی + رمزارز)، **ربات تلگرام** (webhook + ۶ رویداد)، بلاگ، تنظیمات، و ابزارهای AI است.

**تکنولوژی‌های اصلی:**
- Next.js 16.2.6 (App Router + Turbopack)
- React 19.2.6 + TypeScript 5.9.3
- PostgreSQL + Drizzle ORM 0.45.2
- Tailwind CSS 4.1 + PostCSS
- TipTap Editor (rich text)
- Recharts (نمودارها و چارت‌های دشبورد)
- Swiper 14 (اسلایدر)
- Nodemailer (ارسال ایمیل)
- OpenAI (AI)
- Playwright (تست)
- Sharp (بهینه‌سازی تصاویر)
- Framer Motion (انیمیشن)

**پالت رنگی:**
- `navy (#05101d)` - سرمه‌ای تیره
- `petrol (#134b5f)` - سبز نفتی (رنگ اصلی)
- `pearl (#f5f0eb)` - مرواریدی / کرم روشن
- `charcoal` - زغالی

---

## ۲. سه تغییر بزرگ درخواستی

### الف) درگاه‌های پرداخت (۸ درگاه)
- افزایش از ۱ به ۸ درگاه
- فایل **`src/lib/gateways.ts`** (۱۱۱ خط) - فایل **کلاینت-سیف** بدون وابستگی دیتابیس، شامل types و ALL_GATEWAYS
- فایل **`src/lib/payment.ts`** (۹۴۲ خط) - سمت سرور: ۸ کلاس درگاه + فکتوری `getPaymentGateway()` با کش ۱ دقیقه
- صفحه ادمین **`src/app/admin/payments/page.tsx`** (۳۳۸ خط) با دو تب: **ایرانی** و **رمز ارز**
- **۸ درگاه:**
  1. زرین‌پال (zarinpal)
  2. زیبال (zibal)
  3. آیدی‌پی (idpay)
  4. پی‌آر (payir)
  5. سامان (sep)
  6. Sandbox (محیط تست)
  7. **USDT/TRC20** (نرخ: ۱ USDT ≈ ۶۰۰,۰۰۰ ریال)
  8. **بیت‌کوین** (نرخ: ۱ BTC ≈ ۴۰,۰۰۰,۰۰۰,۰۰۰ ریال)

### ب) ربات تلگرام
- **Webhook** با اندپوینت API: `src/app/api/telegram/webhook/route.ts` (۱۵۸ خط)
- **۶ رویداد اعلان:** new_order, payment, new_user, contact, status_change, low_stock
- **قالب پیام‌ها** برای هر رویداد به صورت HTML/CSS داخل تلگرام
- **دستورات ربات:** /start, /help, /status, /order
- **صفحه ادمین کامل:** `src/app/admin/telegram-bot/page.tsx` (۵۸۰ خط) با ۵ بخش:
  ۱. تنظیمات اتصال (Token, Chat ID)
  ۲. مدیریت رویدادها (فعال/غیرفعال کردن)
  ۳. قالب پیام‌ها
  ۴. دستورات
  ۵. لاگ آخرین ارسال‌ها

### ج) نمای موبایل فروشگاه (`src/app/shop/page.tsx`)
- **کارت‌های محصول ۲×۲** (۴ محصول در هر صفحه)
- **کاروسل افقی** با عرض ۸۲vw
- **دات‌های اسکرول** (فعلاً **باگ: همیشه دات اول فعال است** - باید دات متناظر با صفحه فعلی فعال شود)

---

## ۳. کارهای انجام‌شده (Completed Tasks)

### فاز ۱ - زیرساخت اولیه
- [x] راه‌اندازی پروژه Next.js با App Router
- [x] اتصال PostgreSQL و Drizzle ORM
- [x] اسکیمای پایگاه داده (users, products, orders, categories, blog, site_settings و...)
- [x] سیستم احراز هویت (ورود/ثبت‌نام با OTP و رمز عبور)
- [x] اسکریپت‌های Seed برای داده‌های آزمایشی (`scripts/seed.mjs`, `scripts/seed-content.mjs`)

### فاز ۲ - فروشگاه و سبد خرید
- [x] صفحات فروشگاه (shop) با فیلتر و دسته‌بندی + نمای موبایل ۲×۲ و کاروسل
- [x] سبد خرید (cart) با localStorage و سشن
- [x] صفحه جزئیات محصول
- [x] سیستم علاقه‌مندی‌ها (wishlist)
- [x] صفحه چک‌اوت (CheckoutForm.tsx)
- [x] سیستم سفارش (orders.ts, createOrder, confirmOrderPayment)

### فاز ۳ - پنل ادمین
- [x] پنل ادمین کامل با داشبورد
- [x] مدیریت محصولات (افزودن/ویرایش/حذف)
- [x] مدیریت دسته‌بندی‌ها
- [x] مدیریت سفارشات
- [x] مدیریت کاربران
- [x] مدیریت بلاگ
- [x] مدیریت اسلایدر
- [x] مدیریت تنظیمات سایت
- [x] مدیریت پیام‌های تماس با ما
- [x] **مدیریت درگاه‌های پرداخت** (صفحه مجزا با دو تب)
- [x] **مدیریت کامل ربات تلگرام** (اتصال، رویدادها، قالب پیام‌ها، دستورات، لاگ)
- [x] سیستم بکاپ‌گیری

### فاز ۴ - پرداخت و درگاه‌ها
- [x] سیستم پرداخت با ۸ درگاه (۶ ایرانی + ۲ رمزارز)
- [x] **فایل gateway.ts جداگانه (کلاینت-سیف)** بدون وابستگی به دیتابیس
- [x] **payment.ts (۹۴۲ خط)** سمت سرور با ۸ کلاس درگاه
- [x] حذف USDT/Bitcoin از `ALLOWED_METHODS` در `api/orders/route.ts` (برای build)
- [x] حذف USDT/Bitcoin از type `PaymentGateway` در `lib/orders.ts`
- [x] رفع CheckoutForm.tsx (حذف گزینه‌های کریپتو از UI برای رفع خطا)
- [x] رفع `api/orders/pay/route.ts` (خواندن gateway از body)
- [x] حفظ درگاه‌های USDT/BTC در `gateways.ts` برای نمایش در ادمین

### فاز ۵ - امنیت و رفع باگ
- [x] رفع ذخیره رمز عبور در localStorage (`login/page.tsx`)
- [x] رفع خطای ALLOWED_METHODS (build error: 'idpay' not assignable to PaymentGateway)
- [x] رفع ۶ خطای Bundling (ماژول `pg` نیازمند built-inهای Node - با انتقال به gateways.ts)
- [x] رفع TypeScript Error: `Record<number, string>` به `Record<string, string>` در PayIrGateway
- [x] رفع JSX Parsing Error: `<TOKEN>` به `&#123;TOKEN&#125;`
- [x] رفع conflict مرج Git در package-lock.json
- [x] بررسی و تایید build موفق

### فاز ۶ - بهبودها
- [x] رفع خطای انتقال به checkout از cart
- [x] رفع خطای orderId
- [x] بهبود UI/UX صفحات
- [x] رفع مگامنو و سایدبار
- [x] رفع دابل کلیک و مشکلات ناوبری
- [x] رفع صفحه تنظیمات (settings-v3)
- [x] رفع صفحه سفارشات (orders-v3)
- [x] رفع احراز هویت (auth-popup, login)
- [x] رفع پروفایل کاربری (profile-v2)

---

## ۴. مشکلات حل‌شده (Known Bugs Fixed)

1. **package-lock.json**: conflict مرج Git رفع شد
2. **JSX Parsing Error**: `<TOKEN>` به `&#123;TOKEN&#125;` تغییر کرد
3. **۶ خطای Bundling**: ماژول `pg` نیازمند built-inهای Node - با انتقال به gateways.ts رفع شد
4. **TypeScript Error**: `Record<number, string>` به `Record<string, string>` در PayIrGateway
5. **Build Error**: 'idpay' not assignable to PaymentGateway - حذف usdt/bitcoin از ALLOWED_METHODS و type
6. **امنیت**: ذخیره رمز عبور در localStorage حذف شد

---

## ۵. مشکلات شناخته شده باقی‌مانده (Known Bugs Not Fixed)

### ۱. CheckoutForm.tsx - درگاه‌های محدود
- خط ۸: `type PaymentMethod = "sandbox" | "zarinpal" | "zibal" | "sep"` - فقط ۴ نوع
- خط ۲۳-۲۸: آرایه GATEWAYS فقط ۴ درگاه دارد و فقط ۲ تای آن فعال
- درگاه‌های USDT و BTC وجود ندارند (حذف شدند چون TypeScript خطا می‌داد)
- **باید از `ALL_GATEWAYS` در `gateways.ts` استفاده کند**

### ۲. shop/page.tsx - دات‌های اسکرول
- خط ۱۶۰: `i === 0 ? "bg-petrol-600" : ""` - همیشه دات اول فعال است
- باید دات متناظر با صفحه فعلی اسکرول فعال شود

### ۳. USDT/BTC در CheckoutForm
- درگاه‌های رمزارز در فایل `gateways.ts` وجود دارند و در ادمین هم نمایش داده می‌شوند
- اما در CheckoutForm (فرونت اند کاربر) وجود ندارند چون TypeScript خطا می‌داد
- برای افزودن آنها باید type `PaymentGateway` را در `lib/orders.ts` به‌روز کرد

---

## ۶. کارهای باقی‌مانده (Pending / Not Yet Done)

### با اولویت بالا
- [ ] **رفع دات‌های اسکرول در shop/page.tsx** - باید دات متناظر با صفحه فعال شود
- [ ] **اجرای dev server و تست دستی:** `npm run dev` برای تست واقعی مسیرها
- [ ] **تکمیل تست مسیر پرداخت در sandbox:** تست واقعی در مرورگر
- [ ] **بررسی و رفع خطاهای ESLint:** `npm run lint`

### با اولویت متوسط
- [ ] **افزودن USDT/BTC به CheckoutForm** با استفاده از `ALL_GATEWAYS` در `gateways.ts`
- [ ] **مدیریت خطاهای پرداخت در فرانت:** صفحه خطا و بازگشت از درگاه
- [ ] **تکمیل سیستم OTP**
- [ ] **تکمیل سیستم ایمیل:** ارسال خودکار ایمیل تأیید سفارش (nodemailer)
- [ ] **تکمیل سیستم SMS** (sms.ts موجود است)
- [ ] **صفحات static:** درباره ما (about)، تماس با ما (contact)
- [ ] **تکمیل webhook تلگرام برای رویدادهای real**

### با اولویت پایین
- [ ] **تست responsive موبایل**
- [ ] **تکمیل i18n**
- [ ] **تولید نقشه سایت (sitemap)**
- [ ] **تکمیل سیستم بلاگ در فرانت**
- [ ] **تکمیل سیستم تخفیف/کوپن**
- [ ] **تست بار (Load Testing)**
- [ ] **داکرایز کردن پروژه**
- [ ] **تکمیل اسکریپت‌های پشتیبان‌گیری**

---

## ۷. جزئیات سیستم سفارش و پرداخت

### مسیر جریان سفارش:
```
CheckoutForm (فرانت)
  → POST /api/orders (ایجاد سفارش با status=pending_payment)
    → createOrder (orders.ts):
       - بررسی موجودی محصولات
       - ذخیره آدرس
       - ایجاد order + order_items
       - خالی کردن سبد خرید (session_cart)
    → برمی‌گرداند orderId + orderNumber

  → کاربر به صفحه سفارشات هدایت می‌شود
    → کلیک روی "پرداخت"
      → POST /api/orders/pay (با body: { orderId, gateway })
        → در payment.ts:
          - getPaymentGateway(gateway).requestPayment()
          - تولید Authority از درگاه
          - ذخیره authority + gateway در order
          - برمی‌گرداند redirectUrl
        → فرانت ریدایرکت می‌کند به درگاه

  → بعد از پرداخت:
    → GET /api/payment/callback?Authority=...&Status=OK
      → getPaymentGateway(gateway).verifyPayment()
        - تایید تراکنش از درگاه
        - فراخوانی confirmOrderPayment:
          - کسر موجودی از انبار
          - تغییر status از pending_payment به paid
          - حذف آیتم‌های سبد خرید جلسه
      → ریدایرکت به صفحه سفارشات با پیغام موفقیت/خطا
```

### وضعیت‌های سفارش:
- `pending_payment` - در انتظار پرداخت
- `paid` - پرداخت شده
- `processing` - در حال پردازش
- `shipped` - ارسال شده
- `delivered` - تحویل داده شده
- `cancelled` - لغو شده

### درگاه‌های فعال (در ادمین و gateways.ts):
| درگاه | type | وضعیت |
|-------|------|-------|
| زرین‌پال | zarinpal | فعال |
| زیبال | zibal | فعال |
| آیدی‌پی | idpay | فعال |
| پی‌آی‌آر | payir | فعال |
| سامان | sep | فعال |
| Sandbox | sandbox | تست |
| USDT/TRC20 | usdt | فقط ادمین |
| بیت‌کوین | bitcoin | فقط ادمین |

> **نکته:** USDT و Bitcoin در `ALLOWED_METHODS` (مسیر سفارش فرانت) غیرفعال شده‌اند تا build error برطرف شود. در `gateways.ts` و ادمین payments وجود دارند.

---

## ۸. ساختار فایل‌های اصلی

```
src/
├── app/
│   ├── layout.tsx             # Root layout + Navbar, Footer, MobileBottomNav
│   ├── page.tsx               # صفحه اصلی با Hero, LandingSlider, TrustBox, Features
│   ├── globals.css            # سیستم طراحی کامل (RTL, پالت رنگی)
│   ├── shop/
│   │   └── page.tsx           # فروشگاه با کاروسل موبایل ۲×۲ + گرید دسکتاپ
│   ├── cart/page.tsx          # سبد خرید
│   ├── checkout/
│   │   └── CheckoutForm.tsx   # فرم تسویه حساب (۴۹۷ خط)
│   ├── orders/                # سفارشات کاربر
│   ├── profile/page.tsx       # پروفایل (سرور کامپوننت)
│   ├── login/page.tsx         # ورود/ثبت‌نام (۲۷۶ خط)
│   ├── register/              # ثبت‌نام
│   ├── wishlist/              # علاقه‌مندی‌ها
│   ├── blog/                  # بلاگ
│   ├── contact/               # تماس با ما
│   ├── about/                 # درباره ما
│   ├── admin/
│   │   ├── layout.tsx         # لایه ادمین + سایدبار
│   │   ├── page.tsx           # دشبورد ادمین
│   │   ├── products/          # مدیریت محصولات
│   │   ├── orders/            # مدیریت سفارشات
│   │   ├── categories/        # مدیریت دسته‌بندی
│   │   ├── users/             # مدیریت کاربران
│   │   ├── blog/              # مدیریت بلاگ
│   │   ├── slider/            # مدیریت اسلایدر
│   │   ├── contacts/          # مدیریت پیام‌ها
│   │   ├── settings/          # تنظیمات سایت
│   │   ├── payments/          # مدیریت درگاه‌ها (۳۳۸ خط - دو تب)
│   │   └── telegram-bot/      # مدیریت ربات تلگرام (۵۸۰ خط - ۵ بخش)
│   └── api/
│       ├── orders/
│       │   ├── route.ts       # POST ایجاد سفارش
│       │   └── pay/route.ts   # POST درخواست پرداخت
│       ├── payment/
│       │   └── callback/route.ts # GET بازگشت از درگاه
│       ├── telegram/
│       │   └── webhook/route.ts  # Webhook ربات تلگرام (۱۵۸ خط)
│       ├── auth/              # API احراز هویت
│       ├── cart/              # API سبد خرید
│       └── ...                # سایر APIها
├── components/
│   ├── auth/                  # کامپوننت‌های احراز هویت
│   ├── commerce/              # کامپوننت‌های فروشگاه
│   ├── admin/                 # کامپوننت‌های ادمین
│   ├── orders/                # کامپوننت‌های سفارش
│   ├── layout/                # هدر، فوتر، مگامنو، سایدبار
│   ├── home/                  # کامپوننت‌های صفحه اصلی
│   └── ui/                    # کامپوننت‌های UI عمومی
├── lib/
│   ├── gateways.ts            # (۱۱۱ خط) کلاینت-سیف - types + ALL_GATEWAYS
│   ├── payment.ts             # (۹۴۲ خط) سمت سرور - ۸ کلاس درگاه + فکتوری
│   ├── orders.ts              # لاجیک اصلی سفارشات + PaymentGateway type
│   ├── commerce.ts            # لاجیک سبد خرید
│   ├── auth.ts                # لاجیک احراز هویت
│   ├── settings.ts            # تنظیمات سایت (جدول site_settings کلید-مقدار)
│   ├── email.ts               # ارسال ایمیل (nodemailer)
│   ├── sms.ts                 # ارسال پیامک
│   ├── ai.ts                  # AI (OpenAI)
│   └── order/                 # ماژول‌های تخصصی سفارش
├── db/
│   ├── schema.ts              # اسکیما و جداول دیتابیس
│   └── index.ts               # کانکشن دیتابیس
└── scripts/
    ├── seed.mjs               # دیتاهای آزمایشی
    ├── seed-content.mjs       # محتوای آزمایشی
    ├── watermark-products.mjs # واترمارک تصاویر
    ├── preview-shot.mjs       # اسکرین‌شات
    ├── check-render.mjs       # بررسی رندر
    ├── disk-report.mjs        # گزارش دیسک
    ├── git-bloat.mjs          # آنالیز git
    └── ...
```

---

## ۹. نکات مهم برای توسعه‌دهنده

### دستورات:
| دستور | توضیح |
|-------|-------|
| `npm run dev` | اجرای سرور توسعه (پورت 3000) |
| `npm run build` | بیلد پروژه |
| `npm run start` | اجرای نسخه build شده |
| `npm run db:push` | اعمال تغییرات schema به دیتابیس |
| `npm run db:generate` | تولید migration |
| `npm run db:migrate` | اجرای migration |
| `npm run db:seed` | پر کردن دیتابیس با داده آزمایشی |
| `npm run lint` | بررسی ESLint |
| `npm run typecheck` | بررسی TypeScript |

### درباره فایل‌های مهم:

1. **`src/lib/gateways.ts`** - فایل کلاینت-سیف (بدون `import pg` یا ماژول‌های Node). تمام types و آرایه ALL_GATEWAYS اینجا تعریف شده. هر جا که نیاز به لیست درگاه‌ها دارید از این فایل import کنید.

2. **`src/lib/payment.ts`** - سمت سرور. شامل ۸ کلاس Gateway که هر کدام متدهای `requestPayment()` و `verifyPayment()` را پیاده‌سازی می‌کنند. `getPaymentGateway(gateway)` با کش ۱ دقیقه.

3. **ربات تلگرام** - Webhook در `POST /api/telegram/webhook`. ۶ رویداد active. ادمین در `/admin/telegram-bot`.

4. **تنظیمات سایت** - در جدول `site_settings` (کلید-مقدار با گروه). از طریق `src/lib/settings.ts` قابل دسترسی.

5. **فایل‌های images محصولات** - در `public/products/`. در آخرین commit فقط تغییرات تصاویر و برخی فایل‌های سورس.

---

## ۱۰. وضعیت فعلی

| بخش | وضعیت |
|-----|--------|
| ✅ **Build** | موفق - تمام خطاهای TypeScript رفع شده |
| ✅ **مسیر پرداخت** | کامل - ۸ درگاه (۶ فعال در فرانت + ۲ فقط ادمین) |
| ✅ **امنیت** | تامین شده - حذف localStorage password |
| ✅ **پنل ادمین** | کامل - شامل مدیریت درگاه‌ها و ربات تلگرام |
| ✅ **ربات تلگرام** | پیاده‌سازی کامل webhook + ادمین |
| ✅ **نمای موبایل** | ۲×۲ با کاروسل (باگ دات‌ها باقی است) |
| ❌ **دات‌های اسکرول** | باگ: همیشه دات اول فعال است |
| ❌ **Dev server** | اجرا نشده - نیاز به تست دستی |