import "dotenv/config";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PUBLIC = path.join(process.cwd(), "public");

// ────────────────────────────────────────────────────────────────
// تولید تصویر SVG صنعتی با پالت سرد (بدون نیاز به فایل خارجی)
// ────────────────────────────────────────────────────────────────
function svgImage({ title, code, accent = "#237d90", tone = "#0b2136" }) {
  const safeTitle = String(title).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const safeCode = String(code || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tone}"/>
      <stop offset="1" stop-color="#05101d"/>
    </linearGradient>
    <linearGradient id="ac" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="#6cbccb"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#6cbccb" stroke-opacity="0.08" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#grid)"/>
  <g fill="none" stroke="url(#ac)" stroke-width="3" stroke-opacity="0.55">
    <circle cx="600" cy="380" r="150"/>
    <circle cx="600" cy="380" r="95"/>
    <path d="M450 380 H750 M600 230 V530" stroke-opacity="0.25"/>
    <rect x="360" y="600" width="480" height="120" rx="16" stroke-opacity="0.35"/>
    <path d="M360 660 H840" stroke-opacity="0.2"/>
  </g>
  <g fill="#6cbccb" fill-opacity="0.9">
    <circle cx="600" cy="380" r="14"/>
  </g>
  <text x="600" y="800" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="46" font-weight="700" fill="#f6f2e9">${safeTitle}</text>
  <text x="600" y="855" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="30" fill="#6cbccb" letter-spacing="4">${safeCode}</text>
  <text x="1140" y="70" text-anchor="end" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#f6f2e9" fill-opacity="0.4">درنیکا ساحل</text>
</svg>`;
}

function writeImage(dir, name, svg) {
  const full = path.join(PUBLIC, dir);
  fs.mkdirSync(full, { recursive: true });
  fs.writeFileSync(path.join(full, `${name}.svg`), svg, "utf8");
  return `/${dir}/${name}.svg`;
}

// ۶ دسته با پالت اختصاصی
const accents = {
  1: "#237d90", // pumps
  2: "#3d9dae", // valves
  3: "#196374", // pipes
  4: "#124e5c", // gauges
  5: "#2a7d6f", // hvac
  6: "#3b6ea5", // electrical
};

// ────────────────────────────────────────────────────────────────
// ۲۰ محصول — بعضی تنوع‌دار، بعضی بدون تنوع (تک‌قیمت)
// ────────────────────────────────────────────────────────────────
const products = [
  // === تنوع‌دار ===
  { catId: 1, slug: "pump-cf-100", title: "پمپ سانتریفیوژ CF-100", subtitle: "پمپ گریز از مرکز تک‌پروانه برای آب و سیالات نیمه‌خورنده", variants: [
    { sku: "CF-100-A", name: "بدنه آلومینیوم", price: "18500000", stock: 42, unit: "device" },
    { sku: "CF-100-S", name: "استیل ۳۰۴", price: "24800000", stock: 28, unit: "device" },
  ]},
  { catId: 1, slug: "pump-sub-200", title: "پمپ شناور چاهی SUB-200", subtitle: "پمپ شناور استیل برای چاه‌های عمیق کشاورزی و صنعتی", variants: [
    { sku: "SUB-200-1", name: "۱ اسب بخار", price: "32500000", stock: 18, unit: "device" },
    { sku: "SUB-200-2", name: "۲ اسب بخار", price: "48900000", stock: 12, unit: "device" },
    { sku: "SUB-200-3", name: "۳ اسب بخار", price: "67400000", stock: 7, unit: "device" },
  ]},
  { catId: 2, slug: "valve-gv-200", title: "شیر دروازه‌ای GV-200", subtitle: "شیر کشویی برنزی فلنج‌دار، فشار کاری ۱۶ بار", variants: [
    { sku: "GV-200-2", name: "۲ اینچ", price: "3200000", stock: 86, unit: "piece" },
    { sku: "GV-200-3", name: "۳ اینچ", price: "4800000", stock: 55, unit: "piece" },
    { sku: "GV-200-4", name: "۴ اینچ", price: "7200000", stock: 33, unit: "piece" },
  ]},
  { catId: 2, slug: "valve-bf-300", title: "شیر پروانه‌ای BF-300", subtitle: "شیر پروانه‌ای ویفری با آب‌بند EPDM", variants: [
    { sku: "BF-300-3", name: "۳ اینچ", price: "2650000", stock: 120, unit: "piece" },
    { sku: "BF-300-4", name: "۴ اینچ", price: "3450000", stock: 94, unit: "piece" },
    { sku: "BF-300-6", name: "۶ اینچ", price: "5900000", stock: 41, unit: "piece" },
  ]},
  { catId: 3, slug: "pipe-steel-sch40", title: "لوله فولادی SCH40", subtitle: "لوله درزدار صنعتی با استاندارد API 5L", variants: [
    { sku: "PS40-2", name: "۲ اینچ", price: "185000", stock: 1200, unit: "meter" },
    { sku: "PS40-3", name: "۳ اینچ", price: "295000", stock: 860, unit: "meter" },
    { sku: "PS40-4", name: "۴ اینچ", price: "430000", stock: 640, unit: "meter" },
  ]},
  { catId: 3, slug: "pipe-pex-hot", title: "لوله پکس روکش‌دار PEX-b", subtitle: "لوله پنج‌لایه گرمایش کف با روکش عایق", variants: [
    { sku: "PEX-16", name: "سایز ۱۶", price: "62000", stock: 3000, unit: "meter" },
    { sku: "PEX-20", name: "سایز ۲۰", price: "89000", stock: 2200, unit: "meter" },
    { sku: "PEX-25", name: "سایز ۲۵", price: "134000", stock: 1500, unit: "meter" },
  ]},
  { catId: 4, slug: "gauge-gm-500", title: "مانومتر صنعتی GM-500", subtitle: "گیج فشار قطر ۱۰۰ میلی‌متر، کلاس ۱.۶", variants: [
    { sku: "GM-500-10", name: "۰ تا ۱۰ بار", price: "890000", stock: 210, unit: "piece" },
    { sku: "GM-500-16", name: "۰ تا ۱۶ بار", price: "920000", stock: 195, unit: "piece" },
    { sku: "GM-500-25", name: "۰ تا ۲۵ بار", price: "960000", stock: 170, unit: "piece" },
  ]},
  { catId: 5, slug: "heater-el-3000", title: "هیتر برقی صنعتی EL-3000", subtitle: "هیتر کانالی سه‌فاز با ترموستات دیجیتال", variants: [
    { sku: "EL-3000-1", name: "۳ کیلووات ۳۸۰ ولت", price: "5850000", stock: 44, unit: "device" },
    { sku: "EL-3000-2", name: "۶ کیلووات ۳۸۰ ولت", price: "9250000", stock: 31, unit: "device" },
  ]},
  { catId: 6, slug: "cable-nyy-4x25", title: "کابل قدرت NYY ۴×۲.۵", subtitle: "کابل مسی چهار رشته با عایق PVC", variants: [
    { sku: "NYY-4x25-100", name: "کلاف ۱۰۰ متری", price: "4250000", stock: 60, unit: "piece" },
    { sku: "NYY-4x25-m", name: "فروش متری", price: "43000", stock: 5000, unit: "meter" },
  ]},
  { catId: 5, slug: "radiator-panel-600", title: "رادیاتور پنلی ۶۰۰", subtitle: "رادیاتور فولادی پنلی با پوشش رنگ الکترواستاتیک", variants: [
    { sku: "RAD-600-80", name: "طول ۸۰ سانتی‌متر", price: "3850000", stock: 70, unit: "device" },
    { sku: "RAD-600-120", name: "طول ۱۲۰ سانتی‌متر", price: "5450000", stock: 48, unit: "device" },
  ]},

  // === بدون تنوع (تک‌قیمت) ===
  { catId: 1, slug: "pump-booster-set", title: "بوستر پمپ دور متغیر", subtitle: "ست کامل بوستر پمپ خانگی با اینورتر", variants: [
    { sku: "BOOST-STD", name: "استاندارد", price: "58900000", stock: 15, unit: "device" },
  ]},
  { catId: 2, slug: "valve-check-swing", title: "شیر یک‌طرفه دریچه‌ای", subtitle: "شیر خودکار جلوگیری از برگشت سیال", variants: [
    { sku: "CHK-SWING", name: "۳ اینچ چدنی", price: "4150000", stock: 62, unit: "piece" },
  ]},
  { catId: 3, slug: "fitting-elbow-90", title: "زانویی جوشی ۹۰ درجه", subtitle: "اتصال فولادی مانسمان درجه یک", variants: [
    { sku: "ELB-90-3", name: "۳ اینچ", price: "245000", stock: 900, unit: "piece" },
  ]},
  { catId: 4, slug: "gauge-thermometer", title: "ترمومتر عقربه‌ای صنعتی", subtitle: "دماسنج بی‌متال با غلاف استیل", variants: [
    { sku: "THERM-120", name: "۰ تا ۱۲۰ درجه", price: "740000", stock: 140, unit: "piece" },
  ]},
  { catId: 5, slug: "hvac-fan-coil", title: "فن‌کویل سقفی توکار", subtitle: "فن‌کویل چهار لوله‌ای کم‌صدا", variants: [
    { sku: "FCU-400", name: "۴۰۰ CFM", price: "21500000", stock: 22, unit: "device" },
  ]},
  { catId: 6, slug: "electrical-contactor", title: "کنتاکتور صنعتی ۳ فاز", subtitle: "کنتاکتور ۲۵ آمپر با بوبین ۲۲۰ ولت", variants: [
    { sku: "CONT-25A", name: "۲۵ آمپر", price: "1850000", stock: 180, unit: "piece" },
  ]},
  { catId: 6, slug: "electrical-mccb", title: "کلید اتوماتیک MCCB", subtitle: "کلید کمپکت قابل تنظیم ۱۰۰ آمپر", variants: [
    { sku: "MCCB-100", name: "۱۰۰ آمپر", price: "6900000", stock: 45, unit: "piece" },
  ]},
  { catId: 1, slug: "pump-circulator", title: "پمپ سیرکولاتور خطی", subtitle: "پمپ سیرکولاتور سه‌دور برای موتورخانه", variants: [
    { sku: "CIRC-32", name: "سایز ۳۲", price: "8450000", stock: 55, unit: "device" },
  ]},
  { catId: 3, slug: "pipe-galvanized", title: "لوله گالوانیزه گرم", subtitle: "لوله گالوانیزه رزوه‌دار با پوشش روی", variants: [
    { sku: "GALV-2", name: "۲ اینچ", price: "365000", stock: 780, unit: "meter" },
  ]},
];

// ────────────────────────────────────────────────────────────────
// دسته‌بندی بلاگ + ۵ پست نمونه با عکس
// ────────────────────────────────────────────────────────────────
const blogCats = [
  { slug: "guides", name: "راهنمای خرید" },
  { slug: "technical", name: "مقالات فنی" },
  { slug: "news", name: "اخبار صنعت" },
];

const posts = [
  { catSlug: "guides", slug: "how-to-choose-pump", title: "چگونه پمپ صنعتی مناسب انتخاب کنیم؟", excerpt: "راهنمای کامل انتخاب پمپ بر اساس دبی، هد و نوع سیال برای پروژه‌های صنعتی و تأسیساتی.", accent: "#237d90" },
  { catSlug: "technical", slug: "valve-types-guide", title: "انواع شیرآلات صنعتی و کاربرد آن‌ها", excerpt: "بررسی تخصصی شیرهای دروازه‌ای، پروانه‌ای، یک‌طرفه و توپی و معیارهای انتخاب هرکدام.", accent: "#3d9dae" },
  { catSlug: "technical", slug: "pipe-standards", title: "استانداردهای لوله فولادی SCH چیست؟", excerpt: "آشنایی با ضخامت جداره، رده‌بندی SCH و کاربرد لوله‌های فولادی در فشارهای مختلف.", accent: "#196374" },
  { catSlug: "guides", slug: "heating-system-design", title: "اصول طراحی سیستم گرمایش موتورخانه", excerpt: "نکات کلیدی طراحی موتورخانه شامل انتخاب دیگ، پمپ سیرکولاتور و رادیاتور مناسب.", accent: "#2a7d6f" },
  { catSlug: "news", slug: "industry-trends-2025", title: "روندهای بازار تجهیزات صنعتی در سال جدید", excerpt: "مروری بر تحولات بازار تأسیسات، قیمت‌گذاری و فناوری‌های نوین در صنعت.", accent: "#3b6ea5" },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // پاکسازی وابستگی‌ها قبل از حذف محصولات (رعایت foreign key)
    await client.query("DELETE FROM cart_items");
    await client.query("DELETE FROM wishlist_items");
    await client.query("UPDATE order_items SET variant_id = NULL");
    // پاکسازی محصولات و تنوع‌های قبلی برای seed تمیز
    await client.query("DELETE FROM product_variants");
    await client.query("DELETE FROM products");

    let sortP = 0;
    for (const p of products) {
      const accent = accents[p.catId] || "#237d90";
      const code = p.variants[0]?.sku?.split("-")[0] || "DS";
      // تولید ۳ تصویر برای گالری
      const img1 = writeImage("products", `${p.slug}-1`, svgImage({ title: p.title, code, accent }));
      const img2 = writeImage("products", `${p.slug}-2`, svgImage({ title: p.title, code: "نمای فنی", accent, tone: "#08272e" }));
      const img3 = writeImage("products", `${p.slug}-3`, svgImage({ title: p.title, code: "جزئیات", accent, tone: "#0c0e12" }));
      const images = [img1, img2, img3];

      const res = await client.query(
        `INSERT INTO products (category_id, slug, title, subtitle, description, images, cover_image, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
         RETURNING id`,
        [p.catId, p.slug, p.title, p.subtitle, `<p>${p.subtitle}. این محصول با تضمین اصالت و کیفیت توسط درنیکا ساحل عرضه می‌شود و برای پروژه‌های صنعتی و تأسیساتی مناسب است.</p>`, JSON.stringify(images), img1, sortP++],
      );
      const productId = res.rows[0].id;

      let sortV = 0;
      for (const v of p.variants) {
        const unitRes = await client.query("SELECT id FROM units WHERE slug = $1", [v.unit]);
        const unitId = unitRes.rows[0]?.id ?? null;
        await client.query(
          `INSERT INTO product_variants (product_id, unit_id, sku, name, price, unit_value, stock, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
           ON CONFLICT (sku) DO NOTHING`,
          [productId, unitId, v.sku, v.name, v.price, "۱", v.stock, sortV++],
        );
      }
    }

    // ── دسته‌بندی بلاگ ──
    const catIdBySlug = {};
    for (const c of blogCats) {
      const r = await client.query(
        `INSERT INTO blog_categories (slug, name) VALUES ($1,$2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [c.slug, c.name],
      );
      catIdBySlug[c.slug] = r.rows[0].id;
    }

    // ── پست‌های بلاگ ──
    await client.query("DELETE FROM blog_posts");
    let sortB = 0;
    for (const post of posts) {
      const img = writeImage("blog", post.slug, svgImage({ title: post.title.slice(0, 24), code: "مقاله", accent: post.accent, tone: "#0b2136" }));
      await client.query(
        `INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, media_type, category_id, status, published_at, views)
         VALUES ($1,$2,$3,$4,$5,'image',$6,'published',NOW(),$7)`,
        [post.title, post.slug, post.excerpt,
         `<h2>${post.title}</h2><p>${post.excerpt}</p><p>در این مقاله به‌صورت تخصصی به بررسی موضوع می‌پردازیم و نکات کاربردی برای انتخاب و استفاده بهینه ارائه می‌کنیم. کارشناسان درنیکا ساحل آماده پاسخگویی به سؤالات فنی شما هستند.</p>`,
         img, catIdBySlug[post.catSlug], 100 + sortB * 37],
      );
      sortB++;
    }

    // ── تصاویر اسلایدر (رفع 404) ──
    const slideImgs = [
      { file: "industrial-pipes", title: "مهندسی گرما در خدمت صنعت", accent: "#196374" },
      { file: "gate-valves", title: "قدرت جریان در دل تأسیسات", accent: "#237d90" },
      { file: "control-panel", title: "کنترل کامل، اتصال مطمئن", accent: "#3d9dae" },
    ];
    for (const s of slideImgs) {
      writeImage("slides", s.file, svgImage({ title: s.title, code: "درنیکا ساحل", accent: s.accent, tone: "#08192b" }));
    }
    // به‌روزرسانی مسیر اسلایدها به svg
    await client.query("UPDATE landing_slides SET image = REPLACE(image, '.jpg', '.svg')");

    await client.query("COMMIT");

    const { rows } = await client.query(`
      SELECT (SELECT count(*) FROM products) AS products,
             (SELECT count(*) FROM product_variants) AS variants,
             (SELECT count(*) FROM blog_posts) AS posts,
             (SELECT count(*) FROM blog_categories) AS blog_cats`);
    const c = rows[0];
    console.log(`✓ Seed محتوا کامل شد:
  محصولات:      ${c.products}
  تنوع‌ها:      ${c.variants}
  پست بلاگ:     ${c.posts}
  دسته بلاگ:    ${c.blog_cats}
  تصاویر: public/products, public/blog, public/slides`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
