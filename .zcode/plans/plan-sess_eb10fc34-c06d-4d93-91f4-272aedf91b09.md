## برنامه پیاده‌سازی اولویت‌بندی شده

### وضعیت فعلی:
- **فروشگاه (Storefront):** ✅ صفحات Shop, Product Detail, Cart, Checkout, Wishlist کاملاً پیاده‌سازی شده‌اند — **تنها مشکل: تصاویر محصول placeholder (گرادیان رنگی) هستند**
- **ادمین:** ✅ Dashboard, Products, Blog, Categories, Orders, Contact Messages, Slider همگی کامل هستند
- **ادمین Placeholder:** ❌ صفحات AI, Payments, SMS, Email, Telegram Bot, Backup, Icons, Users همگی خالی (Coming Soon) هستند
- **پشتیبان:** ✅ ایمیل (nodemailer)، پرداخت (Zarinpal + Sandbox)، آپلود فایل، به‌روزرسانی قیمت از اکسل
- **SMS:** ⚠️ نصفه — تابع sendSms نوشته شده ولی API واقعی غیرفعال است
- **AI:** ❌ فقط تشخیص کلمه کلیدی، بدون LLM واقعی

---

### فاز ۱: تصاویر محصول + واترمارک + حذف پس‌زمینه (اولویت اول)
**هدف:** رفع بزرگ‌ترین خلا سایت — نمایش تصاویر واقعی به جای گرادیان رنگی

1. **نصب `sharp`** برای پردازش تصویر
2. **تکمیل فرم محصول در ادمین** — اضافه کردن ImageUpload برای cover image و گالری
3. **تکمیل API محصول** — ذخیره coverImage و images در دیتابیس
4. **افزودن واترمارک خودکار** — هنگام آپلود، لوگوی "درنیکا ساحل" به صورت SVG به تصاویر اضافه شود
5. **دکمه حذف پس‌زمینه** — در ویرایش محصول، دکمه‌ای که با API Remove.bg یا Replicate پس‌زمینه را حذف کند
6. **به‌روزرسانی صفحات فروشگاه** — نمایش تصاویر واقعی در Shop, Product Detail, Cart, Wishlist

### فاز ۲: دستیار هوش مصنوعی واقعی (اولویت دوم)
**هدف:** اتصال چت ادمین به LLM واقعی برای ساخت محصول از متن

1. **ساخت صفحه تنظیمات AI** — انتخاب provider (OpenAI/Groq/Gemini)، وارد کردن API key
2. **اتصال چت به LLM** — بازنویسی API چت با function calling واقعی
3. **Intent: create_product** — هوش مصنوعی از توضیحات متنی محصول، تنوع‌ها را استخراج کرده و در دیتابیس ایجاد کند
4. **Intent: create_blog_post** — تولید پست بلاگ از موضوع وارد شده
5. **Intent: sales_report** — تولید گزارش فروش از دیتاهای واقعی

### فاز ۳: صفحات تنظیمات ادمین (اولویت سوم)

1. **صفحه پرداخت (Payments)** — فعال/غیرفعال کردن درگاه‌ها، تنظیم Zarinpal، اضافه کردن IDPay، Pay.ir
2. **صفحه پیامک (SMS)** — انتخاب provider فعال (کاوه‌نگار، قاصدک، ملی پیامک و...) + ارسال تست
3. **صفحه ایمیل (Email)** — تنظیم SMTP + ارسال تست
4. **صفحه کاربران (Users)** — مدیریت کاربران ادمین با نقش‌ها

### فاز ۴: ارتباطات

1. **صفحه ربات تلگرام** — تنظیم توکن، Webhook
2. **صفحه پشتیبان‌گیری** — بکاپ دیتابیس با دانلود/بازیابی

### فاز ۵: تکمیلی

1. **صفحه آیکون‌ها** — مدیریت آیکون‌های سفارشی
2. **ویزارد نصب** — ستاپ اولیه برای دیپلویمنت
3. **کد اناماد در فوتر**

---

### اولین قدم: فاز ۱ — تصاویر محصول
فایل‌هایی که تغییر می‌کنند:
- `package.json` — اضافه شدن sharp
- `src/app/api/admin/upload/route.ts` — افزودن واترمارک با sharp
- `src/app/api/admin/products/route.ts` — ذخیره coverImage/images
- `src/app/api/admin/products/[id]/route.ts` — ذخیره coverImage/images
- `src/app/admin/products/page.tsx` — اضافه کردن ImageUpload به فرم
- `src/lib/product-validation.ts` — اضافه کردن validation برای images
- `src/app/shop/page.tsx` — نمایش coverImage واقعی
- `src/app/shop/[slug]/page.tsx` — نمایش coverImage + گالری تصاویر
- `src/app/cart/page.tsx` — نمایش تصاویر در سبد خرید
- `src/app/wishlist/page.tsx` — نمایش تصاویر در علاقه‌مندی‌ها