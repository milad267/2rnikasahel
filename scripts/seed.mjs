import "dotenv/config";
import { Pool } from "pg";
import crypto from "node:crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adminEmail = process.env.ADMIN_EMAIL?.trim();
const adminPhone = process.env.ADMIN_PHONE?.trim();
const adminPassword = process.env.ADMIN_PASSWORD || "";

if (!adminEmail || !/^09\d{9}$/.test(adminPhone || "") || adminPassword.length < 12) {
  throw new Error("ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD (minimum 12 characters) are required for seeding.");
}

function securePasswordHash(password) {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  return `v2:${iterations}:${salt}:${hash}`;
}

// ────────────────────────────────────────────────────────────────
// داده‌های نمونه برای فاز ۰ + فاز ۱
// ────────────────────────────────────────────────────────────────

const baseFamilies = [
  ["#05101d", "#0b2136", "#237d90", "#f6f2e9"],
  ["#08192b", "#124e5c", "#6cbccb", "#ece5d5"],
  ["#0c0e12", "#262b36", "#4a5262", "#f6f2e9"],
  ["#05101d", "#163852", "#3d9dae", "#fbfaf6"],
  ["#08272e", "#0d3b45", "#196374", "#ddd2ba"],
];
const names = [
  "سرمه ساحل", "نفت عمیق", "ذغال مه", "اقیانوس آرام", "خزه دریا",
  "صدف شب", "مه شمالی", "بلور یخی", "افق نیمه‌شب", "کوارتز آبی",
  "طوفان نقره‌ای", "لاجورد خاموش", "پوشش نفتی", "سایه فیروزه", "عاج تیره",
  "دریای عمیق", "غبار سرمه", "برکه شب", "شیشه دودی", "مروارید سرد",
  "توفان اطلس", "کبالت مات", "سنگ آبی", "شبنم نفتی", "خلیج تاریک",
  "زمرد خاموش", "نیل عمیق", "فولاد آبی", "ماه سرد", "ابر سربی",
  "کاج نفتی", "یخچال شمالی", "دریاچه شب", "سرب صدفی", "مینای سرد",
  "توسکای آبی", "طاق نیلی", "غروب سرد", "بلور نفتی", "خاکستر آبی",
  "ساحل شب", "مرجان سرد", "نقره اطلس", "دریای مه", "سنگ‌سرمه",
  "افق نفتی", "شیشه قطبی", "مروارید نیل", "ذغال دریا", "کهکشان سرد",
];

function jitter(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + (Math.random() * 2 - 1) * amt));
  g = Math.max(0, Math.min(255, g + (Math.random() * 2 - 1) * amt));
  b = Math.max(0, Math.min(255, b + (Math.random() * 2 - 1) * amt * 0.6));
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** ۱۹ واحد طبق مشخصات */
const unitSeeds = [
  ["meter", "متر", "Meter", "m", "length", 1],
  ["branch", "شاخه", "Branch", "ش", "count", 2],
  ["piece", "عدد", "Piece", "عد", "count", 3],
  ["device", "دستگاه", "Device", "د", "count", 4],
  ["inch", "اینچ", "Inch", '"', "length", 5],
  ["kg", "کیلوگرم", "Kilogram", "kg", "mass", 6],
  ["liter", "لیتر", "Liter", "L", "volume", 7],
  ["psi", "PSI", "PSI", "psi", "pressure", 8],
  ["bar", "بار", "Bar", "bar", "pressure", 9],
  ["atmosphere", "اتمسفر", "Atmosphere", "atm", "pressure", 10],
  ["m3", "متر مکعب", "Cubic Meter", "m³", "volume", 11],
  ["gallon", "گالن", "Gallon", "gal", "volume", 12],
  ["celsius", "درجه سانتی‌گراد", "Celsius", "°C", "temp", 13],
  ["fahrenheit", "درجه فارنهایت", "Fahrenheit", "°F", "temp", 14],
  ["btu_hr", "BTU/hr", "BTU/hr", "BTU/h", "power", 15],
  ["kw", "کیلووات", "Kilowatt", "kW", "power", 16],
  ["hp", "اسب بخار", "Horsepower", "hp", "power", 17],
  ["ampere", "آمپر", "Ampere", "A", "electric", 18],
  ["volt", "ولت", "Volt", "V", "electric", 19],
];

const categorySeeds = [
  { id: 1, slug: "pumps", title: "پمپ‌ها", titleEn: "Pumps" },
  { id: 2, slug: "valves", title: "شیرآلات صنعتی", titleEn: "Valves" },
  { id: 3, slug: "pipes", title: "لوله و اتصالات", titleEn: "Pipes & Fittings" },
  { id: 4, slug: "gauges", title: "مانومتر و گیج", titleEn: "Gauges & Meters" },
  { id: 5, slug: "hvac", title: "تأسیسات گرمایشی", titleEn: "HVAC" },
  { id: 6, slug: "electrical", title: "الکتریکال", titleEn: "Electrical" },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── پالت‌های رنگی ──
    for (let i = 0; i < 50; i++) {
      const fam = baseFamilies[i % baseFamilies.length];
      const colors = fam.map((c, idx) => (idx === 0 ? c : jitter(c, 14)));
      const slug = `palette-${String(i + 1).padStart(2, "0")}`;
      await client.query(
        `INSERT INTO color_palettes (slug, name, colors, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, colors = EXCLUDED.colors`,
        [slug, names[i], JSON.stringify(colors), i === 0, i],
      );
    }

    // ── تنظیمات پایه ──
    const settings = [
      ["brand.name", "brand", "fa", JSON.stringify("درنیکا ساحل")],
      ["brand.tagline", "brand", "fa", JSON.stringify("مرجع تخصصی تجهیزات صنعتی و تأسیسات")],
      ["hero.title", "landing", "fa", JSON.stringify("تجهیزات صنعتی، در تراز جهانی")],
      ["currency", "general", "fa", JSON.stringify("IRR")],
      ["builtBy", "meta", "fa", JSON.stringify("ساخته شده توسط میلاد قلی‌پور")],
    ];
    for (const [key, group, locale, value] of settings) {
      await client.query(
        `INSERT INTO site_settings (key, "group", locale, value)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (key, locale) DO UPDATE SET value = EXCLUDED.value`,
        [key, group, locale, value],
      );
    }

    // ── ادمین تستی ──
    const adminHash = crypto.createHash("sha256").update(adminPassword).digest("hex");
    await client.query(
      `INSERT INTO admin_users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING`,
      ["مدیر اصلی", adminEmail, adminHash, "superadmin"],
    );

    // ── ادمین رو به جدول users هم اضافه می‌کنیم (برای لاگین با ایمیل و رمز) ──
    const adminFullHash = securePasswordHash(adminPassword);
    await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role, company_name)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (phone) DO NOTHING`,
      ["مدیر اصلی", adminEmail, adminPhone, adminFullHash, "superadmin", "درنیکا ساحل"],
    );

    // ── واحدهای اندازه‌گیری (۱۹ واحد) ──
    for (const [slug, name, nameEn, symbol, cat, order] of unitSeeds) {
      await client.query(
        `INSERT INTO units (slug, name, name_en, symbol, category, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
        [slug, name, nameEn, symbol, cat, order],
      );
    }

    // ── دسته‌بندی‌های درختی ──
    for (const cat of categorySeeds) {
      await client.query(
        `INSERT INTO categories (id, slug, title, description, sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
        [cat.id, cat.slug, cat.title, `دسته‌بندی ${cat.title}`, cat.id],
      );
    }

    // ── محصولات نمونه ──
    const productSeeds = [
      {
        catId: 1, slug: "pump-cf-100", title: "پمپ سانتریفیوژ مدل CF-100",
        subtitle: "پمپ گریز از مرکز تک‌پروانه، مناسب آب و سیالات نیمه‌خورنده",
        specs: [
          { sku: "CF-100-A", name: "آلومینیوم", price: "18500000", stock: 42, unit: "device" },
          { sku: "CF-100-S", name: "استیل ۳۰۴",  price: "24800000", stock: 28, unit: "device" },
        ],
      },
      {
        catId: 2, slug: "valve-gv-200", title: "شیر دروازه‌ای مدل GV-200",
        subtitle: "شیر کشویی برنزی با فلنج، مناسب فشار کاری ۱۶ بار",
        specs: [
          { sku: "GV-200-2", name: "۲ اینچ",  price: "3200000", stock: 86, unit: "piece" },
          { sku: "GV-200-3", name: "۳ اینچ",  price: "4800000", stock: 55, unit: "piece" },
          { sku: "GV-200-4", name: "۴ اینچ",  price: "7200000", stock: 33, unit: "piece" },
        ],
      },
      {
        catId: 3, slug: "pipe-steel-sch40", title: "لوله فولادی SCH40",
        subtitle: "لوله درزدار صنعتی با استاندارد API 5L",
        specs: [
          { sku: "PS40-2", name: "۲ اینچ",  price: "185000", stock: 1200, unit: "meter" },
          { sku: "PS40-3", name: "۳ اینچ",  price: "295000", stock: 860, unit: "meter" },
          { sku: "PS40-4", name: "۴ اینچ",  price: "430000", stock: 640, unit: "meter" },
        ],
      },
      {
        catId: 4, slug: "gauge-gm-500", title: "مانومتر صنعتی GM-500",
        subtitle: "گیج فشار قطر ۱۰۰ میلی‌متر، کلاس ۱.۶",
        specs: [
          { sku: "GM-500-10", name: "۰–۱۰ بار",    price: "890000", stock: 210, unit: "piece" },
          { sku: "GM-500-16", name: "۰–۱۶ بار",    price: "920000", stock: 195, unit: "piece" },
          { sku: "GM-500-25", name: "۰–۲۵ بار",    price: "960000", stock: 170, unit: "piece" },
        ],
      },
      {
        catId: 5, slug: "heater-el-3000", title: "هیتر برقی صنعتی EL-3000",
        subtitle: "هیتر کانالی ۳ فاز، ۳ کیلووات با ترموستات",
        specs: [
          { sku: "EL-3000-1", name: "۳ کیلووات ۳۸۰V", price: "5850000", stock: 44, unit: "device" },
          { sku: "EL-3000-2", name: "۶ کیلووات ۳۸۰V", price: "9250000", stock: 31, unit: "device" },
        ],
      },
      {
        catId: 6, slug: "cable-mm-4x2", title: "کابل افشان NYY ۴×۲.۵",
        subtitle: "کابل قدرت مسی ۴ رشته ۲.۵ میلیمتر مربع",
        specs: [
          { sku: "NYY-4x25", name: "۴×۲.۵ میلیمتر", price: "42500", stock: 2500, unit: "meter" },
        ],
      },
    ];

    for (const prod of productSeeds) {
      const res = await client.query(
        `INSERT INTO products (category_id, slug, title, subtitle, description, cover_image)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
         RETURNING id`,
        [
          prod.catId, prod.slug, prod.title, prod.subtitle,
          `توضیحات کامل ${prod.title}`,
          null,
        ],
      );
      const productId = res.rows[0].id;

      for (const spec of prod.specs) {
        // unitId رو پیدا کن
        const unitRes = await client.query(
          "SELECT id FROM units WHERE slug = $1", [spec.unit],
        );
        const unitId = unitRes.rows[0]?.id ?? null;
        await client.query(
          `INSERT INTO product_variants (product_id, unit_id, sku, name, price, unit_value, stock)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (sku) DO NOTHING`,
          [productId, unitId, spec.sku, spec.name, spec.price, "۱", spec.stock],
        );
      }
    }

    await client.query("COMMIT");

      // ── اسلایدهای لندینگ ──
      await client.query('DELETE FROM landing_slides');
      const slideSeeds = [
        {
          badge: "تأسیسات و سیستم‌های گرمایشی",
          title: "مهندسی گرما، در خدمت صنعت",
          subtitle: "طراحی، تأمین و راه‌اندازی کامل سیستم‌های گرمایشی و سرمایشی صنعتی با بالاترین استانداردهای روز دنیا.",
          ctaText: "مشاهده محصولات", ctaHref: "/shop",
          cta2Text: "درخواست مشاوره", cta2Href: "/contact",
          accent: "#196374",
          image: "/slides/industrial-pipes.jpg",
        },
        {
          badge: "پمپ‌ها و سیستم‌های انتقال",
          title: "قدرت جریان، در دل تأسیسات",
          subtitle: "گسترده‌ترین مجموعه پمپ‌های صنعتی از برندهای معتبر جهان، آماده تحویل با ضمانت اصالت.",
          ctaText: "پمپ‌های صنعتی", ctaHref: "/shop?cat=pumps",
          cta2Text: null, cta2Href: null,
          accent: "#237d90",
          image: "/slides/gate-valves.jpg",
        },
        {
          badge: "شیرآلات و اتصالات",
          title: "کنترل کامل، اتصال مطمئن",
          subtitle: "شیرآلات صنعتی و اتصالات فولادی با تحمل فشار بالا برای پروژه‌های بزرگ و حساس.",
          ctaText: "خرید شیرآلات", ctaHref: "/shop?cat=valves",
          cta2Text: "دسته‌بندی‌ها", cta2Href: "/shop",
          accent: "#3d9dae",
          image: "/slides/control-panel.jpg",
        },
      ];
      let slideOrder = 0;
      for (const s of slideSeeds) {
        await client.query(
          `INSERT INTO landing_slides (badge, title, subtitle, cta_text, cta_href, cta2_text, cta2_href, accent_color, image, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT DO NOTHING`,
          [s.badge, s.title, s.subtitle, s.ctaText, s.ctaHref, s.cta2Text, s.cta2Href, s.accent, s.image, slideOrder++],
        );
      }

      // ── ویژگی‌های «چرا درنیکا ساحل» ──
      await client.query('DELETE FROM landing_features');
      const featureSeeds = [
        { icon: "Boxes", title: "سیستم تنوع پیشرفته", desc: "مدیریت واحد، قیمت، موجودی و مشخصات فنی برای هر تنوع محصول." },
        { icon: "Cpu", title: "هوش مصنوعی یکپارچه", desc: "به‌روزرسانی قیمت از اکسل، خواندن PDF و مشاور تصویری هوشمند." },
        { icon: "Handshake", title: "پرتال پیمانکاران", desc: "استعلام قیمت، قیمت‌گذاری اختصاصی و پیگیری بصری سفارش‌ها." },
        { icon: "ShieldCheck", title: "امنیت در بالاترین سطح", desc: "معماری آماده تولید، رمزنگاری و کنترل دسترسی دقیق." },
      ];
      let featOrder = 0;
      for (const f of featureSeeds) {
        await client.query(
          `INSERT INTO landing_features (icon, title, "desc", sort_order)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT DO NOTHING`,
          [f.icon, f.title, f.desc, featOrder++],
        );
      }

      // ── کاربران نمونه فاز ۳ ──
      const demoPassword = process.env.DEMO_USER_PASSWORD || crypto.randomBytes(24).toString("base64url");
      const fullHash = securePasswordHash(demoPassword);
      const userRes = await client.query(
        `INSERT INTO users (phone, name, password_hash, role, company_name)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        ["09123456789", "مهندس امیرحسین کریمی", fullHash, "contractor", "گروه صنعتی پایا تأسیسات"],
      );
      const userId = userRes.rows[0]?.id;
      if (userId) {
        await client.query(
          `INSERT INTO user_addresses (user_id, title, province, city, postal_address, is_default)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT DO NOTHING`,
          [userId, "دفتر مرکزی پروژه جنوب", "تهران", "تهران", "خیابان آزادی، خیابان شهید بهشتی، پلاک ۱۲۰، واحد ۴", true],
        );
        await client.query(
          `INSERT INTO orders (order_number, user_id, status, total_amount, shipping_address)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (order_number) DO NOTHING`,
          ["DS-10045", userId, "paid", "43300000", "تهران، خیابان آزادی، پلاک ۱۲۰، واحد ۴"],
        );
      }

      // ── ارائه‌دهندگان SMS ایرانی (برای فاز ۵ — کانفیگ از ادمین) ──
      const smsProviders = [
        { slug: "kavenegar", name: "کاوه‌نگار" },
        { slug: "ghasedak", name: "قاصدک" },
        { slug: "melipayamak", name: "ملی پیامک" },
        { slug: "farazsms", name: "فراز اس‌ام‌اس" },
        { slug: "smsir", name: "SMS.ir" },
        { slug: "raygansms", name: "رایگان اس‌ام‌اس" },
        { slug: "parandsms", name: "پرند اس‌ام‌اس" },
        { slug: "asanak", name: "آسانک" },
      ];
      for (const p of smsProviders) {
        await client.query(
          `INSERT INTO sms_providers (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
          [p.slug, p.name],
        );
      }

      // ── گزارش ──
      const { rows: counts } = await client.query(`
        SELECT
          (SELECT count(*) FROM color_palettes) AS palettes,
          (SELECT count(*) FROM site_settings) AS settings,
          (SELECT count(*) FROM admin_users) AS admins,
          (SELECT count(*) FROM users) AS users,
          (SELECT count(*) FROM units) AS units,
          (SELECT count(*) FROM categories) AS categories,
          (SELECT count(*) FROM products) AS products,
          (SELECT count(*) FROM product_variants) AS variants,
          (SELECT count(*) FROM landing_slides) AS slides,
          (SELECT count(*) FROM landing_features) AS features
      `);
      const c = counts[0];
      console.log(`✓ Seed کامل شد:
  پالت‌ها: ${c.palettes}
  تنظیمات: ${c.settings}
  ادمین:    ${c.admins}
  کاربران:  ${c.users}
  واحدها:   ${c.units}
  دسته‌ها:  ${c.categories}
  محصولات:  ${c.products}
  تنوع‌ها:  ${c.variants}
  اسلایدها: ${c.slides}
  ویژگی‌ها: ${c.features}`);
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
