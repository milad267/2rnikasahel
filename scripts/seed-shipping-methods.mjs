/**
 * سید روش‌های ارسال ایرانی
 *
 * اجرا: node scripts/seed-shipping-methods.mjs
 * این اسکریپت روش‌های ارسال رایج در ایران را در دیتابیس ثبت می‌کند.
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const IRANIAN_SHIPPING_METHODS = [
  {
    title: "پست پیشتاز",
    description: "سرویس پست پیشتاز شرکت ملی پست ایران — تحویل سریع با بیمه تا سقف ۵۰ میلیون ریال",
    cost: "150000",
    freeThreshold: "0",
    deliveryDays: "۲ تا ۴ روز کاری",
    isFree: false,
    logo: "📮",
    trackingBaseUrl: "https://tracking.post.ir/",
    sortOrder: 1,
    isActive: true,
  },
  {
    title: "پست سفارشی",
    description: "سرویس پست سفارشی شرکت ملی پست ایران — اقتصادی و قابل اطمینان",
    cost: "75000",
    freeThreshold: "0",
    deliveryDays: "۴ تا ۷ روز کاری",
    isFree: false,
    logo: "✉️",
    trackingBaseUrl: "https://tracking.post.ir/",
    sortOrder: 2,
    isActive: true,
  },
  {
    title: "تیپاکس",
    description: "سرویس تیپاکس — ارسال سریع هوایی و زمینی با ضمانت زمان تحویل",
    cost: "250000",
    freeThreshold: "10000000",
    deliveryDays: "۱ تا ۳ روز کاری",
    isFree: false,
    logo: "✈️",
    trackingBaseUrl: "https://tipaxco.com/tracking/",
    sortOrder: 3,
    isActive: true,
  },
  {
    title: "ماهکس",
    description: "سرویس ماهکس — ارسال سریع با پوشش سراسری و قیمت مناسب",
    cost: "180000",
    freeThreshold: "8000000",
    deliveryDays: "۲ تا ۴ روز کاری",
    isFree: false,
    logo: "🚚",
    trackingBaseUrl: "https://mahax.com/tracking/",
    sortOrder: 4,
    isActive: true,
  },
  {
    title: "چاپار",
    description: "سرویس چاپار — ارسال سریع با بالاترین کیفیت و بیمه کامل",
    cost: "200000",
    freeThreshold: "0",
    deliveryDays: "۱ تا ۳ روز کاری",
    isFree: false,
    logo: "📦",
    trackingBaseUrl: "https://chaparp.com/tracking/",
    sortOrder: 5,
    isActive: true,
  },
  {
    title: "باربری (اتوبوس)",
    description: "ارسال با باربری بین شهری از طریق اتوبوس — مناسب برای محموله‌های حجیم",
    cost: "350000",
    freeThreshold: "0",
    deliveryDays: "۱ تا ۲ روز",
    isFree: false,
    logo: "🚌",
    trackingBaseUrl: "",
    sortOrder: 6,
    isActive: true,
  },
  {
    title: "اسنپ باکس",
    description: "سرویس ارسال اسنپ باکس — تحویل سریع در شهرهای بزرگ",
    cost: "280000",
    freeThreshold: "12000000",
    deliveryDays: "همان روز",
    isFree: false,
    logo: "🟢",
    trackingBaseUrl: "https://snapp.taxi/box/tracking/",
    sortOrder: 7,
    isActive: true,
  },
  {
    title: "الوپیک",
    description: "سرویس ارسال الوپیک — پیک شهری فوری و اقتصادی",
    cost: "120000",
    freeThreshold: "0",
    deliveryDays: "۱ تا ۴ ساعت",
    isFree: false,
    logo: "🛵",
    trackingBaseUrl: "https://alopeyk.com/tracking/",
    sortOrder: 8,
    isActive: true,
  },
];

async function main() {
  console.log("🚚 شروع سید روش‌های ارسال...\n");

  const client = await pool.connect();

  try {
    for (const method of IRANIAN_SHIPPING_METHODS) {
      // بررسی وجود روش تکراری
      const { rows } = await client.query(
        `SELECT id FROM shipping_methods WHERE title = $1 LIMIT 1`,
        [method.title],
      );

      if (rows.length > 0) {
        console.log(`⏭️ "${method.title}" از قبل وجود دارد.`);
        continue;
      }

      await client.query(
        `INSERT INTO shipping_methods (title, description, cost, free_threshold, delivery_days, is_free, logo, tracking_base_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          method.title,
          method.description,
          method.cost,
          method.freeThreshold,
          method.deliveryDays,
          method.isFree,
          method.logo,
          method.trackingBaseUrl,
          method.sortOrder,
          method.isActive,
        ],
      );

      console.log(`✅ "${method.title}" اضافه شد.`);
    }

    console.log("\n🎉 سید روش‌های ارسال با موفقیت انجام شد!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ خطا:", err);
  process.exit(1);
});
