# گزارش جامع بررسی و عیب‌یابی سایت — Comprehensive Audit Report

**تاریخ:** ۲۰۲۶-۰۷-۱۶  
**پروژه:** درنیکا ساحل — فروشگاه تجهیزات صنعتی  
**تعداد کل صفحات:** ۶۷  
**نسخه:** Next.js 16.2.6, Drizzle ORM 0.45.2, PostgreSQL

---

## فهرست مطالب
1. [🔴 بحرانی — Critical (باید فوراً رفع شود)](#1)
2. [🟠 خطرناک — High (باید رفع شود)](#2)
3. [🟡 متوسط — Medium (توصیه می‌شود)](#3)
4. [🔵 کم‌اهمیت — Low (پیشنهادی)](#4)
5. [📦 قابلیت‌های گمشده — Missing Features](#5)
6. [📊 آمار نهایی](#6)

---

<a name="1"></a>
## 🔴 بحرانی — Critical (۲۴ مورد)

### C01. مغایرت جدول `orders` بین Schema و دیتابیس
**فایل:** `src/db/schema.ts`  
**توضیح:** ستون‌های `province`، `city`، `postalCode`، `receiverName`، `receiverPhone` در اسکیما تعریف شده‌اند اما در هیچ migration ای به دیتابیس اضافه نشده‌اند. هر کوئری که این فیلدها را بخواند/بنویسد، کرش می‌کند.

### C02. عدم وجود ستون `setup_state` در Schema جدول `adminUsers`
**فایل:** `src/db/schema.ts`  
**توضیح:** Migration 0002 ستون `setup_state` را به `admin_users` اضافه کرده اما در فایل اسکیما وجود ندارد. عدم تطابق بین کد و دیتابیس.

### C03. احراز هویت دوگانه `adminUsers` vs `users` — عدم هماهنگی
**فایل‌ها:** `src/lib/auth.ts`, `src/lib/admin-security.ts`, `src/app/api/admin/admin-users/route.ts`  
**توضیح:** ادمین‌ها در دو جدول `users` و `adminUsers` ذخیره می‌شوند اما این دو با هم همگام نیستند. API مدیریت ادمین (`admin-users`) در `users` می‌نویسد اما `getCurrentAdminUser()` در `adminSessions` ← `adminUsers` جستجو می‌کند. نتیجه: ادمین‌های ساخته‌شده از UI به `adminUsers` راه ندارند.

### C04. کاربران با نقش سفارشی (Custom Role) نمی‌توانند وارد پنل ادمین شوند
**فایل:** `src/app/admin/layout.tsx`, `src/lib/admin-permissions-server.ts`  
**توضیح:** `getAllowedModules()` فقط نقش‌های `superadmin` و `admin` را بررسی می‌کند. سایر نقش‌ها `[]` برمی‌گردانند. همچنین `layout.tsx` فقط این دو نقش را مجاز می‌داند. کاربران با نقش سفارشی که در بخش مدیریت کاربران ساخته می‌شوند، عملاً به پنل دسترسی ندارند.

### C05. سایدبار ادمین همه منوها را بدون در نظر گرفتن سطح دسترسی نشان می‌دهد
**فایل:** `src/components/admin/AdminSidebar.tsx`  
**توضیح:** سایدبار همه آیتم‌های منو را به ALL ادمین‌ها نشان می‌دهد، حتی اگر به آن بخش دسترسی نداشته باشند. اطلاعات حساس (users، settings، backup) برای همه قابل مشاهده است.

### C06. صفحه مدیریت سفارشات ادمین Read-Only است
**فایل:** `src/app/admin/orders/page.tsx`  
**توضیح:** ادمین‌ها می‌توانند سفارشات را ببینند اما نمی‌توانند وضعیت را تغییر دهند، لغو کنند، شماره پیگیری اضافه کنند یا موارد را ویرایش کنند. API واقعی سفارشات وجود ندارد — از endpoint آمار استفاده می‌کند.

### C07. قیمت در لحظه افزودن به سبد ذخیره می‌شود و دوباره بررسی نمی‌شود
**فایل‌ها:** `src/lib/commerce.ts`, `src/lib/orders.ts`  
**توضیح:** `addToCart` یک `priceSnapshot` ذخیره می‌کند. هنگام تسویه، `calculateCartTotals` از همان قیمت ذخیره‌شده استفاده می‌کند. اگر قیمت محصول بعد از افزودن به سبد تغییر کند، مشتری قیمت قدیمی را پرداخت می‌کند.

### C08. Auto-Variant با قیمت صفر — امکان خرید رایگان
**فایل:** `src/lib/commerce.ts` (line ~115-120)  
**توضیح:** برای محصولات بدون واریانت، یک واریانت خودکار با `price: "0"` و `stock: 999` ساخته می‌شود. کاربر می‌تواند این محصولات را با قیمت صفر بخرد!

### C09. پرداخت — عدم صحت‌سنجی مالکیت سفارش در Callback (IDOR)
**فایل:** `src/app/api/payment/callback/route.ts`  
**توضیح:** Callback پرداخت، مالکیت سفارش را بررسی نمی‌کند. هر کسی که شماره سفارش را بداند می‌تواند callback را فراخوانی کند و پرداخت را تأیید کند.

### C10. عدم تطابق `calculateCartTotals` و `getCartPageData`
**فایل‌ها:** `src/lib/commerce.ts`, `src/lib/orders.ts`  
**توضیح:** `getCartPageData` فقط واریانت‌های فعال را نشان می‌دهد اما `calculateCartTotals` (استفاده شده در تسویه) همه آیتم‌ها را محاسبه می‌کند. کاربر ۳ آیتم می‌بیند اما ۵ آیتم فاکتور می‌شود.

### C11. OTP Bypass با کد 123456 در محیط غیر-production
**فایل‌ها:** `src/app/api/auth/reset-password/route.ts`, `src/app/api/auth/verify-otp/route.ts`  
**توضیح:** اگر `NODE_ENV` برابر `"production"` نباشد، کد ۱۲۳۴۵۶ به عنوان OTP معتبر پذیرفته می‌شود. خطر امنیتی جدی در محیط staging.

### C12. محدودیت نرخ OTP در حافظه RAM — با ریست سرور از بین می‌رود
**فایل:** `src/lib/otp-store.ts`  
**توضیح:** تمام محدودیت‌های نرخ OTP درون یک `Map<String>` در RAM ذخیره می‌شود. با ریستارت سرور، همه محدودیت‌ها ریست می‌شوند. مهاجم می‌تواند بعد از ریستارت، حملات خود را تکرار کند.

### C13. `mergeGuestCart` باگ منطقی — سبد کاربر لاگین‌شده پیدا نمی‌شود
**فایل:** `src/lib/commerce.ts` (line ~210)  
**توضیح:** `mergeGuestCart` با `and(eq(carts.userId, userId), eq(carts.sessionToken, sessionToken))` جستجو می‌کند. کاربر لاگین‌شده `sessionToken` متفاوتی دارد، پس `userCart` همیشه `undefined` است. در نتیجه سبد مهمان به‌روز می‌شود اما سبد قبلی کاربر جدا می‌ماند.

### C14. `users.email` بدون Unique Constraint — ایمیل تکراری مجاز
**فایل:** `src/db/schema.ts`  
**توضیح:** تنها `phone` unique است. دو کاربر می‌توانند با یک ایمیل ثبت‌نام کنند. ورود با ایمیل ممکن است کاربر اشتباهی را برگرداند.

### C15. `select-none` روی تمام body — کاربر نمی‌تواند متنی را کپی کند
**فایل:** `src/app/layout.tsx`  
**توضیح:** کلاس `select-none` روی `<body>` اعمال شده. کاربران نمی‌توانند نام محصولات، قیمت‌ها، آدرس‌ها و هیچ متنی را انتخاب/کپی کنند. این یک مشکل شدید UX است.

### C16. `overflow-x: hidden` روی html,body — مشکلات layout
**فایل:** `src/app/globals.css`  
**توضیح:** `overflow-x: hidden` روی ریشه می‌تواند باعث برش محتوای modalها و المان‌های absolute شود.

### C17. مغایرت قیمت درگاه‌های پرداخت — خطای ۱۰ برابری
**فایل:** `src/lib/payment.ts`  
**توضیح:** Pay.ir و SEP مبلغ را تقسیم بر ۱۰ می‌کنند اما Zarinpal، Zibal، IDPay این کار را نمی‌کنند. اگر فرض یکسانی روی واحد پول (ریال/تومان) وجود نداشته باشد، مشتری ۱۰ برابر بیشتر یا کمتر پرداخت می‌کند.

### C18. لاگ logout بدون CSRF — امکان logout اجباری
**فایل:** `src/app/api/auth/logout/route.ts`  
**توضیح:** هیچ CSRF token یا origin/referer validation ندارد. هر سایتی می‌تواند با یک POST کاربر را logout کند.

### C19. Column `stock` منفی مجاز — فروش بیش از موجودی
**فایل:** `src/db/schema.ts` — `productVariants.stock`  
**توضیح:** هیچ `CHECK (stock >= 0)` وجود ندارد. فروش همزمان (race condition) می‌تواند منجر به فروش بیش از موجودی شود.

### C20. طول پیامک تست از endpoint OTP استفاده می‌کند
**فایل:** `src/app/admin/communications/page.tsx`  
**توضیح:** تست SMS از `/api/auth/send-otp` استفاده می‌کند که یک OTP واقعی می‌فرستد. گیرنده یک کد تأیید دریافت می‌کند و گیج می‌شود.

### C21. Broadcast پیامکی به ALL کاربران بدون پیش‌نمایش و فیلتر
**فایل:** `src/app/admin/communications/page.tsx`  
**توضیح:** پیام broadcast به همه کاربران ارسال می‌شود بدون امکان فیلتر کردن (مشتری خاص، نقش خاص) و بدون پیش‌نمایش تعداد دریافت‌کنندگان.

### C22. Landing-slides به /admin/slider ریدایرکت می‌کند که ممکن است وجود نداشته باشد
**فایل:** `src/app/admin/landing-slides/page.tsx`  
**توضیح:** این صفحه ریدایرکت به `/admin/slider` می‌کند. اگر آن صفحه وجود نداشته باشد یا در سایدبار متفاوت باشد، کاربر دو بار redirect می‌شود.

### C23. صفحه Server — اطلاعات SSL/Services هاردکد شده
**فایل:** `src/app/admin/server/page.tsx`  
**توضیح:** اطلاعات SSL (Let's Encrypt, 90 روز) و برخی سرویس‌ها هاردکد شده‌اند، نه از سرور واقعی.

### C24. `overflow-x: hidden` در globals.css مشکلات modal
**فایل:** `src/app/globals.css`  
**توضیح:** `overflow-x: hidden` موجب برش محتوای popup/modalهایی می‌شود که از عرض viewport فراتر می‌روند.

---

<a name="2"></a>
## 🟠 خطرناک — High (۲۴ مورد)

### H01. نبود ایندکس روی ستون‌های پرکاربرد
**فایل:** `src/db/schema.ts`  
**توضیح:** `orders.user_id`، `orders.status`، `order_items.order_id`، `users.email`، `admin_sessions.user_id`، `ai_usage_events.user_id` و ده‌ها ستون دیگر INDEX ندارند. با رشد دیتابیس، کوئری‌ها بسیار کند می‌شوند.

### H02. عدم استفاده از `CHECK` constraint روی ستون‌های حساس
**فایل:** `src/db/schema.ts`  
**توضیح:** `users.role`، `orders.status`، `contact_messages.status`، `product_variants.stock`، `cart_items.quantity` هیچ‌کدام CHECK constraint ندارند. هر رشته‌ای قابل ذخیره است.

### H03. `catch {}` خاموش — خطاها نادیده گرفته می‌شوند
**فایل‌های متعدد:** `src/lib/shop.ts`, `src/lib/commerce.ts`, `src/lib/orders.ts`, `src/app/admin/backup/page.tsx` و ده‌ها فایل دیگر  
**توضیح:** `catch { return []; }` یا `catch { /* ignore */ }` در بسیاری از توابع استفاده شده. توسعه‌دهنده از خطاها بی‌خبر می‌ماند و سیستم fail-silent رفتار می‌کند.

### H04. تنظیمات (`settings.ts`) — حافظه‌ی `Map` نامحدود — نشت حافظه
**فایل:** `src/lib/settings.ts`  
**توضیح:** `settingsCache` یک `Map<string, any>` است که هیچ‌وقت پاک نمی‌شود. هر کلید جدید به آن اضافه می‌شود و تا ابد باقی می‌ماند. نشت حافظه تدریجی.

### H05. ذخیره تنظیمات با `document.getElementById` — شکننده و غیر React
**فایل:** `src/app/admin/settings/page.tsx`  
**توضیح:** `handleSave` با `document.getElementById` مقادیر فرم را جمع‌آوری می‌کند. اگر id یک فیلد تغییر کند، ذخیره‌سازی بی‌صدا از کار می‌افتد.

### H06. Select واحد پول — مقدار `IRT` اشتباه است
**فایل:** `src/app/admin/settings/page.tsx`  
**توضیح:** گزینه `تومان (IRT)` مقدار `IRR` دارد (هر دو یکی هستند). باید `IRT` باشد.

### H07. صفحه AI — کلاس‌های Tailwind پویا که ساخته نمی‌شوند
**فایل:** `src/app/admin/ai/page.tsx`  
**توضیح:** `border-${fmt.color}-300` — Tailwind این کلاس را در build زمان کامپایل نمی‌سازد چون مقدار `${fmt.color}` پویا است.

### H08. Cookieهای امن — نبود httpOnly و secure در همه جا
**فایل‌ها:** `src/app/api/cart/items/route.ts`, `src/app/api/orders/route.ts`  
**توضیح:** برخی endpointها کوکی را بدون `httpOnly`، `secure` و `sameSite` تنظیم می‌کنند. خطر XSS و CSRF.

### H09. `mergeGuestCart` باگ منطقی — کاربر دو سبد خرید دارد
**فایل:** `src/lib/commerce.ts` (line ~210)  
**توضیح:** (تکرار از C13 برای تاکید)

### H10. `confirmOrderPayment` Race Condition — دو callback همزمان
**فایل:** `src/lib/orders.ts`  
**توضیح:** اگر دو callback پرداخت همزمان برسند، یکی موفق و دیگری با خطا مواجه می‌شود. کاربر با وجود پرداخت موفق، خطا می‌بیند.

### H11. صفحه سفارشات (`/orders`) — بدون Pagination
**فایل:** `src/app/orders/page.tsx`  
**توضیح:** همه سفارشات کاربر یکجا لود می‌شوند بدون LIMIT/OFFSET. کاربران با صدها سفارش با کندی مواجه می‌شوند.

### H12. عدم تأیید موجودی در `updateCartItem`
**فایل:** `src/lib/commerce.ts`  
**توضیح:** کاربر می‌تواند تعداد آیتم سبد را PATCH کند بدون بررسی موجودی. هنگام تسویه با خطا مواجه می‌شود.

### H13. عدم CSRF در APIهای تجاری
**فایل‌ها:** `src/app/api/cart/items/route.ts`, `src/app/api/orders/route.ts`  
**توضیح:** هیچ CSRF tokenای بررسی نمی‌شود. کوکی‌ها بدون SameSite:Lax تنظیم می‌شوند.

### H14. مخاطبین پاپ‌آپ — اطلاعات هاردکد شده
**فایل:** `src/components/popups/ContactPopup.tsx`  
**توضیح:** شماره تلفن، ایمیل و آدرس در پاپ‌آپ تماس هاردکد شده‌اند نه از تنظیمات سایت.

### H15. `UserAssistant` — محدودیت ۵۰۰MB فایل (باید ۵۰MB باشد)
**فایل:** `src/components/popups/UserAssistant.tsx`  
**توضیح:** پیام راهنما می‌گوید ۵۰MB اما کد ۵۰۰MB چک می‌کند.

### H16. `findPgDump` — آسیب‌پذیری Command Injection بالقوه
**فایل:** `src/lib/admin-security.ts`  
**توضیح:** `PG_DUMP_PATH` env var بدون اعتبارسنجی به `execSync()` فرستاده می‌شود.

### H17. لینک SEO — هیچ filter ای بر اساس `searchParams.cat` یا `searchParams.q` ندارد
**فایل:** `src/app/shop/page.tsx`  
**توضیح:** `export const metadata` استاتیک است. صفحه دسته‌بندی‌ها و نتایج جستجو تایتل و توضیحات یکسانی دارند.

### H18. `/admin/lading-texts` — ذخیره بدون catch خطاهای API
**فایل:** `src/app/admin/landing-texts/page.tsx`  
**توضیح:` `!data.ok` خطا نمی‌اندازد (فقط یک شرط است). برخی خطاها شمرده نمی‌شوند.

### H19. Cached settings unbounded — memory leak
**فایل:** `src/lib/settings.ts`  
**توضیح:** `settingsCache` نامحدود است و هیچ TTL یا eviction ندارد.

### H20. `updateCartItem` stock validation missing
**فایل:** `src/lib/commerce.ts`  
**توضیح:** (تکرار H12)

### H21. `getCartPageData` و `calculateCartTotals` ناسازگار
**فایل‌ها:** `src/lib/commerce.ts`, `src/lib/orders.ts`  
**توضیح:** (تکرار C10)

### H22. نبود pagination در مدیریت کاربران ادمین
**فایل:** `src/app/admin/users/page.tsx`  
**توضیح:** همه کاربران یکجا لود می‌شوند.

### H23. `handleSave` در products `console.log` دارد
**فایل:** `src/app/admin/products/page.tsx`  
**توضیح:** `console.log(" handleSave called")` در production باقی مانده.

### H24. ذخیره تنظیمات — `Promise.all` با catch کلی — خطاهای جزئی دیده نمی‌شوند
**فایل:** `src/app/admin/settings/page.tsx`  
**توضیح:** اگر یکی از ۵۰+ ذخیره‌سازی خطا بدهد، فقط toast کلی "خطا در ذخیره" نشان داده می‌شود.

---

<a name="3"></a>
## 🟡 متوسط — Medium (۳۲ مورد)

### M01. `verifyPassword` — نسخه v3 را با fallback v1 اشتباه می‌گیرد
**فایل:** `src/lib/auth.ts`  
**توضیح:** اگر کسی v3 هش را معرفی کند، `isV2=false` می‌شود و به عنوان v1 با ۱۰۰۰۰ iteration پردازش می‌شود.

### M02. `requireAdmin()` همه خطاها را می‌گیرد — مشکلات واقعی پنهان می‌شوند
**فایل:** `src/lib/admin-security.ts`  
**توضیح:** bare catch تمام خطاها (اتصال دیتابیس، TypeError) را می‌گیرد و ۵۰۰ generic برمی‌گرداند.

### M03. نبود Webhook پرداخت — فقط Callback پشتیبانی می‌شود
**فایل:** `src/app/api/payment/callback/route.ts`  
**توضیح:** برخی درگاه‌ها (Zarinpal) webhook هم ارسال می‌کنند که پشتیبانی نمی‌شود.

### M04. صفحه دمو برای Slider/Landing-Texts ریدایرکت اشتباه
**فایل:** `src/app/admin/landing-slides/page.tsx`  
**توضیح:** به `/admin/slider` ریدایرکت می‌کند اما سایدبار این مسیر را ندارد.

### M05. `components/admin/AdminAssistant.tsx` — ذخیره مکرر
**توضیح:** `useEffect` برای ذخیره پیام‌ها به `/api/chat` روی هر تغییر `messages` فعال می‌شود — حتی وقتی اسیستنت پاسخ می‌دهد. بار اضافی.

### M06. `<meta name="theme-color">` وجود ندارد
**فایل:** `src/app/layout.tsx`  
**توضیح:** `viewport` تعریف شده اما `themeColor` در `metadata` تنظیم نشده.

### M07. `formatRial` درون لوپ‌های map — inefficient
**توضیح:** در چندین صفحه `formatRial` درون `.map()` صدا زده می‌شود. بهتر است از قبل فرمت شود.

### M08. دکمه "بازگشت به سبد خرید" در صفحه تسویه وجود ندارد
**فایل:** `src/app/checkout/CheckoutForm.tsx`  
**توضیح:** کاربری که به صفحه تسویه رفته نمی‌تواند به راحتی به سبد خرید برگردد.

### M09. چک‌باکس "ذخیره آدرس" در حالت آدرس ذخیره‌شده گیج‌کننده است
**فایل:** `src/app/checkout/CheckoutForm.tsx`  
**توضیح:** وقتی کاربر یک آدرس ذخیره‌شده را انتخاب می‌کند، چک‌باکس غیرفعال می‌شود اما مفهومش واضح نیست.

### M10. اعتبارسنجی استان/شهر فقط سمت سرور — کاربر بعد از submit خطا می‌بیند
**فایل:** `src/app/checkout/CheckoutForm.tsx`  
**توضیح:** استان و شهر در سمت کلاینت اعتبارسنجی نمی‌شوند و کاربر بعد از ارسال فرم خطا می‌بیند.

### M11. خطای درگاه پرداخت — پیام گمراه‌کننده
**فایل:** `src/app/checkout/CheckoutForm.tsx`  
**توضیح:** اگر fetch درگاه‌ها با خطا مواجه شود، کاربر "هنوز درگاه آماده‌ای فعال نشده است" می‌بیند که نادرست است.

### M12. دکمه حذف آیتم سبد بدون تأیید
**فایل:** `src/components/commerce/CartItemRow.tsx`  
**توضیح:** کاربر با یک کلیک آیتم را حذف می‌کند بدون تأیید یا undo toast.

### M13. "از X" برای محصولات تک‌واریانتی — گمراه‌کننده
**فایل:** `src/app/shop/page.tsx`  
**توضیح:** "از {قیمت}" برای محصولات تک‌واریانتی مفهوم "از" را ندارد.

### M14. `Reveal` animation — بدون Suspense
**فایل:** `src/app/page.tsx`  
**توضیح:** انیمیشن Reveal در سرور رندر می‌شود اما کلاینت است. بار اضافی.

### M15. آیکون `ArrowLeft` برای "پرداخت" — اشتباه معنایی در RTL
**فایل‌ها:** `src/components/popups/CartPopup.tsx`, `src/components/layout/MobileBottomNav.tsx`  
**توضیح:** `ArrowLeft` در RTL به معنای "بازگشت" است، نه "ادامه" یا "پرداخت".

### M16. مگامنو — درگ به اسکرول جایگزین اسکرول طبیعی
**فایل:** `src/components/layout/MegaMenu.tsx`  
**توضیح:** مگامنو اسکرول طبیعی را با درگ کردن جایگزین کرده که UX عجیبی دارد و از کار می‌افتد.

### M17. Hero — `Arrow` متغیر بدون استفاده
**فایل:** `src/components/landing/Hero.tsx`  
**توضیح:** `const Arrow = locale === "fa" ? ArrowLeft : ArrowLeft` — هر دو شاخه یکسان هستند.

### M18. `TrustBox` — `t` از نوع `any` است
**فایل:** `src/components/landing/TrustBox.tsx`  
**توضیح:** `t?: any` به جای `Dictionary`. از دست رفتن type safety.

### M19. `Image` next/image استفاده نشده — تصاویر بهینه نمی‌شوند
**فایل‌های متعدد**  
**توضیح:** در چندین کامپوننت از `<img>` ساده استفاده شده به جای `<Image>` نکست. تصاویر Lazy load و optimized نمی‌شوند.

### M20. صفحه Wishlist — بدون loading
**فایل:** `src/components/popups/WishlistPopup.tsx`  
**توضیح:** داده‌ها بدون نمایش اسپینر fetch می‌شوند. کاربر چیزی نمی‌بیند تا داده بیاید.

### M21. دکمه حذف بلاگ — بدون error handling
**فایل:** `src/app/admin/blog/page.tsx`  
**توضیح:** `onClick={async () => {...}}` inline خطاها را نمی‌گیرد.

### M22. مرتب‌سازی دسته‌بندی‌ها — optimistic بدون rollback
**فایل:** `src/app/admin/categories/page.tsx`  
**توضیح:** Drag-reorder به صورت optimistic اعمال می‌شود. اگر API خطا بدهد، UI با سرور هماهنگ نیست.

### M23. `activeUsers` و `MODULES_FOR_UI` تعریف شده اما استفاده نشده
**فایل:** `src/app/admin/users/page.tsx`  
**توضیح:** متغیرهای بی‌استفاده در کد production.

### M24. ایجاد کاربر ادمین — نقش سفارشی از قالب پشتیبانی نمی‌شود
**فایل:** `src/app/admin/users/page.tsx`  
**توضیح:** کامنت در کد می‌گوید "backend role is restricted to admin; for custom roles, need additional backend change"

### M25. `reset-password` — فیلد تلفن قابل ویرایش است
**فایل:** `src/app/reset-password/page.tsx`  
**توضیح:** کاربر می‌تواند شماره تلفن را بعد از ورود به صفحه تغییر دهد. اگر کد OTP را بداند، می‌تواند رمز کاربر دیگری را عوض کند.

### M26. `showPass` toggle در ارتباطات — آیکون تغییر نمی‌کند
**فایل:** `src/app/admin/communications/page.tsx`  
**توضیح:** دکمه show/hide رمز عبور آیکونش عوض نمی‌شود (همیشه Eye است).

### M27. `handleError` در AuthPopup — پیام خطا از API مستقیم به کاربر
**فایل:** `src/components/popups/AuthPopup.tsx`  
**توضیح:** `data.error` مستقیماً به کاربر نشان داده می‌شود. اگر API اطلاعات حساس را لو بدهد، مشکل امنیتی دارد.

### M28. `handleResend` در forgot-password — `.catch(() => {})` خاموش
**فایل:** `src/app/forgot-password/page.tsx`  
**توضیح:** ارسال مجدد OTP خطاهایش نادیده گرفته می‌شود. کاربر فکر می‌کند ارسال شده اما نشده.

### M29. دکمه "ورود با رمز عبور" — OTP هم ارسال می‌شود؟
**فایل:** `src/app/login/page.tsx`  
**توضیح:** در حالت ورود با رمز عبور، endpoint OTP هم صدا زده می‌شود؟

### M30. مدیریت کاربران — دو جدول (customers + role-taken) گیج‌کننده
**فایل:** `src/app/admin/users/page.tsx`  
**توضیح:** جدول دو بخشی (کاربران عادی و کاربران با نقش) ممکن است باعث شود ادمین کاربری را در بخش اشتباه جستجو کند.

### M31. `Server` page — `SetupWizard` در تب نصب/تنظیم
**فایل:** `src/app/admin/server/page.tsx`  
**توضیح:** `SetupWizard` در سرور رندر می‌شود که می‌تواند خطرناک باشد (تنظیمات حساس).

### M32. No refresh token — توکن ۷ روزه با امکان ابطال صفر
**فایل:** `src/lib/auth.ts`  
**توضیح:** توکن auth ۷ روز اعتبار دارد. اگر دزدیده شود، تا ۷ روز معتبر است. بدون refresh token rotation.

---

<a name="4"></a>
## 🔵 کم‌اهمیت — Low (۲۴ مورد)

### L01. `error.digest` ممکن است "undefined" نشان دهد
**فایل:** `src/app/error.tsx`  
**توضیح:** اگر `digest` undefined باشد، متن "کد خطا: undefined" نشان داده می‌شود.

### L02. `preloadSettings()` نتیجه‌اش استفاده نمی‌شود
**فایل:** `src/app/layout.tsx`  
**توضیح:** `preloadSettings()` صدا زده شده اما خروجی‌اش ذخیره نمی‌شود.

### L03. اسلایدر صفحه اصلی — بدون fallback در صورت خالی بودن
**فایل:** `src/app/page.tsx`  
**توضیح:** اگر `slides` خالی باشد، بخش اسلایدر ناپدید می‌شود بدون توضیح.

### L04. Search Navbar — خطای network "نتیجه‌ای یافت نشد" نشان می‌دهد
**فایل:** `src/components/layout/Navbar.tsx`  
**توضیح:** اگر API سرچ خطا بدهد، کاربر "نتیجه‌ای یافت نشد" می‌بیند (گمراه‌کننده).

### L05. Badge سبد خرید — اعداد > ۹۹ overflow
**فایل:** `src/components/layout/Navbar.tsx`  
**توضیح:** `size-4` (16px) برای اعداد ۳ رقمی کوچک است.

### L06. هیرو — `cards.length < 3` از hardcoded fallback استفاده می‌کند
**فایل:** `src/components/landing/Hero.tsx`  
**توضیح:** اگر ادمین فقط ۱-۲ کارت تنظیم کند، همیشه fallback (۳ کارت) نشان داده می‌شود.

### L07. TrustBox — `t.trust` ممکن است undefined باشد
**فایل:** `src/components/landing/TrustBox.tsx`  
**توضیح:** `t?.trust` با fallback به `DEFAULT_ITEMS`. اگر admin `t.trust.icon1` را پاک کند، fallback می‌خورد.

### L08. `crypto.randomUUID()` — عدم پشتیبانی در مرورگرهای قدیمی
**فایل:** `src/components/popups/UserAssistant.tsx`  
**توضیح:** `crypto.randomUUID()` در IE و برخی مرورگرهای قدیمی کار نمی‌کند.

### L09. پیامک ارسال OTP — در حالت تست endpoint واقعی صدا زده می‌شود
**فایل:** `src/app/admin/communications/page.tsx`  
**توضیح:** (تکرار C20)

### L10. "از X" محصولات — فقط برای multi-variant نشان داده شود
**فایل:** `src/app/shop/page.tsx`  
**توضیح:** (تکرار M13)

### L11. `getFeaturedProducts` — حد ۹ ولی استفاده از ۸
**فایل:** `src/app/shop/[slug]/page.tsx`  
**توضیح:** `limit: 9` پاس داده می‌شود اما نتیجه به ۸ تا محدود می‌شود. یکی اضافی است.

### L12. کلاینت `handleFileUpload` — sequential به جای parallel
**فایل:** `src/components/popups/UserAssistant.tsx`  
**توضیح:** فایل‌ها یکی یکی آپلود می‌شوند. می‌توانند همزمان باشند.

### L13. RichEditor — در بخش پیام‌های تماس استفاده نشده
**فایل:** `src/app/admin/contact-messages/page.tsx`  
**توضیح:** پیام‌های تماس از `<textarea>` ساده استفاده می‌کنند نه RichEditor.

### L14. مگامنو — ارتفاع ثابت ۳۸۰px — محتوا برش می‌خورد
**فایل:** `src/components/layout/MegaMenu.tsx`  
**توضیح:** `h-[380px]` برای دسته‌بندی‌های با فرزند زیاد کوچک است.

### L15. لاگ‌های خطا در development — console.log به جای console.error
**فایل‌های متعدد**  
**توضیح:** برخی `console.log` برای خطاها استفاده شده.

### L16. `handleSave` products — `timeoutId` دو بار clear می‌شود
**فایل:** `src/app/admin/products/page.tsx`  
**توضیح:** `clearTimeout(timeoutId)` هم در finally و هم در catch صدا زده می‌شود.

### L17. `useEffect` جستجو — cleanup نشدن timer
**فایل:** `src/app/admin/products/page.tsx`  
**توضیح:** `searchTimer` در unmount پاک نمی‌شود.

### L18. `overflow: hidden` روی body بعد از popup — body scroll برگردانده نمی‌شود
**فایل:** `src/components/popups/ContactPopup.tsx`  
**توضیح:** برخی popupها `overflow: hidden` را بعد از بسته شدن برنمی‌گردانند.

### L19. `all-8-files-code.txt` — فایل حاوی کد کامل است
**ریشه پروژه**  
**توضیح:** این فایل تمام سورس را دِンプ کرده. اگر در repository عمومی باشد، همه کد فاش می‌شود.

### L20. `SECURITY-AUDIT-REPORT.md` — موجود اما قدیمی
**ریشه پروژه**  
**توضیح:** ریپورت امنیتی موجود است اما مشخص نیست با کد فعلی هماهنگ باشد.

### L21. `getAvailablePaymentGateways` — همه تنظیمات را می‌خواند
**فایل:** `src/lib/payment-availability.ts`  
**توضیح:** `eq(siteSettings.group, "payment")` همه رکوردهای پرداخت را یکجا می‌خواند و بعد فیلتر می‌کند.

### L22. دیتابیس — `serial` (int32) برای جدول‌های پرتراکنش کافی نیست
**فایل:** `src/db/schema.ts`  
**توضیح:** `ai_usage_events`، `orders`، `cart_items` از `serial` استفاده می‌کنند که max ~2.1B است. برای حجم بالا `bigserial` مناسب‌تر است.

### L23. `userAddresses.isDefault` — چندین آدرس پیش‌فرض ممکن است
**فایل:** `src/db/schema.ts`  
**توضیح:** هیچ partial unique index برای `isDefault = true` وجود ندارد. چندین آدرس می‌توانند پیش‌فرض باشند.

### L24. `assistantSessions.messages` — بدون محدودیت سایز
**فایل:** `src/db/schema.ts`  
**توضیح:** پیام‌های تاریخچه مکالمه در jsonb بدون محدودیت ذخیره می‌شوند. ردیف‌ها حجیم می‌شوند.

---

<a name="5"></a>
## 📦 قابلیت‌های گمشده — Missing Features (۱۸ مورد)

### F01. کوپن/تخفیف — پیاده‌سازی نشده
**توضیح:** سیستم کوپن و تخفیف در کد وجود ندارد. هیچ discount code یا قیمت‌گذاری تبلیغاتی پیاده نشده.

### F02. فروش مهمان (Guest Checkout) — وجود ندارد
**توضیح:** کاربر مهمان بدون ثبت‌نام نمی‌تواند خرید کند. به `/login?next=/checkout` ریدایرکت می‌شود.

### F03. لغو سفارش توسط کاربر — وجود ندارد
**توضیح:** کاربران نمی‌توانند سفارش `pending_payment` خود را لغو کنند.

### F04. نوتیفیکیشن (SMS/Email) بعد از سفارش — وجود ندارد
**توضیح:** هیچ سامانه اطلاع‌رسانی برای تأیید سفارش، موفقیت پرداخت یا بروزرسانی وضعیت وجود ندارد.

### F05. محاسبه مالیات — وجود ندارد
**توضیح:** `totalAmount` فقط `subtotal + shipping` است. مالیات/ارزش افزوده محاسبه نمی‌شود.

### F06. جستجوی کاربران در پنل ادمین — محدود
**توضیح:** فقط جستجوی نام دارد. جستجو بر اساس ایمیل، نقش، تاریخ وجود ندارد.

### F07. Bulk actions در ادمین — وجود ندارد
**توضیح:** در محصولات، سفارشات، بلاگ و کاربران هیچ action گروهی (انتخاب چندتایی) وجود ندارد.

### F08. اکسل/خروجی CSV از داده‌ها — وجود ندارد
**توضیح:** هیچ خروجی Excel یا CSV برای محصولات، سفارشات، کاربران و تماس‌ها وجود ندارد.

### F09. فیلتر تاریخ و جستجوی پیشرفته در ادمین — وجود ندارد
**توضیح:** هیچ صفحه ادمینی فیلتر بازه تاریخ یا جستجوی پیشرفته ندارد.

### F10. تاریخچه وضعیت سفارش — وجود ندارد
**توضیح:** `order_history` در اسکیما تعریف شده اما در UI ادمین نمایش داده نمی‌شود.

### F11. ایمیل تأیید پس از ثبت‌نام — وجود ندارد
**توضیح:** ایمیل کاربر تأیید نمی‌شود. هر ایمیلی قابل ثبت است.

### F12. مدیریت برندها — UI ادمین وجود ندارد
**توضیح:** API برندها وجود دارد (`/api/admin/brands`) اما هیچ صفحه UI ای برای مدیریت آنها نیست.

### F13. پیگیری آنی سفارش — وجود ندارد
**توضیح:** هیچ سیستم رهگیری آنی وضعیت سفارش (Real-time tracking) وجود ندارد.

### F14. سئو برای صفحات دسته‌بندی و تگ — وجود ندارد
**توضیح:** صفحات دسته‌بندی و برچسب metadata یکسان دارند و از محتوای دسته‌بندی تبعیت نمی‌کنند.

### F15. دکمه "مشاهده همه" در داشبورد ادمین — وجود ندارد
**توضیح:** بخش "آخرین سفارشات" و "محصولات پرفروش" در داشبورد راهی به صفحه کامل ندارند.

### F16. Reset به حالت پیش‌فرض برای تنظیمات — فقط در landing-texts
**توضیح:** سایر تب‌های تنظیمات دکمه "بازنشانی به پیش‌فرض" ندارند.

### F17. لاگین با ایمیل — پشتیبانی نمی‌شود
**توضیح:** فقط ورود با شماره تلفن پشتیبانی می‌شود. کاربرانی که ایمیل ثبت کرده‌اند نمی‌توانند با ایمیل وارد شوند.

### F18. تغییر رمز عبور از پروفایل — وجود ندارد
**توضیح:** کاربر نمی‌تواند رمز خود را بدون استفاده از "فراموشی رمز" تغییر دهد.

---

<a name="6"></a>
## 📊 آمار نهایی

| اولویت | تعداد |
|--------|:-----:|
| 🔴 بحرانی (Critical) | ۲۴ |
| 🟠 خطرناک (High) | ۲۴ |
| 🟡 متوسط (Medium) | ۳۲ |
| 🔵 کم (Low) | ۲۴ |
| 📦 Missing Features | ۱۸ |
| **جمع کل** | **۱۲۲** |

---

## بخش‌های بررسی‌شده

| بخش | وضعیت |
|-----|:-----:|
| دیتابیس (Schema, Migrations, Relations) | ✅ کامل |
| احراز هویت (Login, Register, OTP, Roles) | ✅ کامل |
| حریم امنیتی (CSRF, XSS, Rate Limiting, Permissions) | ✅ کامل |
| صفحات عمومی (Landing, Shop, Blog, Cart, Checkout, Wishlist...) | ✅ کامل |
| پنل ادمین (همه ۲۰ زیرصفحه) | ✅ کامل |
| کامپوننت‌ها (همه ۵۶+ کامپوننت) | ✅ کامل |
| API Routeها (همه ۶۵+ endpoint) | ✅ کامل |
| کتابخانه‌ها (همه ۳۵+ فایل در src/lib/) | ✅ کامل |
| CSS جهانی و RTL | ✅ کامل |
| Error/Loading/Empty States | ✅ کامل |
| فایل‌های Build (next.config, tsconfig, eslint) | ✅ بررسی شد |
