import "dotenv/config";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Pool } from "pg";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
// از لوگوی سایت (نسخهٔ تیره) به‌عنوان واترمارک استفاده می‌کنیم
const LOGO_PATH = path.join(process.cwd(), "public", "logo", "logo.svg");
const LOGO_RATIO = 1611 / 2602; // ارتفاع/عرض لوگو
const WM_OPACITY = 0.18; // شفافیت واترمارک (۱۸٪)

async function main() {
  const logoSvg = await readFile(LOGO_PATH);

  const files = (await readdir(PRODUCTS_DIR)).filter((f) => f.toLowerCase().endsWith(".svg"));
  console.log(`یافت شد: ${files.length} فایل SVG`);

  const meta = { width: 1200, height: 900 };
  // اندازهٔ واترمارک ~۲۲٪ عرض تصویر
  const wmWidth = Math.round(meta.width * 0.22);
  const wmHeight = Math.round(wmWidth * LOGO_RATIO);

  // رستر لوگو + اعمال شفافیت با ترفند dest-in
  const wmResized = await sharp(logoSvg, { density: 200 })
    .resize(wmWidth, wmHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(255 * WM_OPACITY)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  let done = 0;
  for (const file of files) {
    const svgPath = path.join(PRODUCTS_DIR, file);
    const jpgName = file.replace(/\.svg$/i, ".jpg");
    const jpgPath = path.join(PRODUCTS_DIR, jpgName);

    // رستر کردن SVG با عرض ثابت
    const base = sharp(await readFile(svgPath), { density: 150 }).resize(1200, 900, {
      fit: "cover",
      position: "center",
    });

    const out = await base
      .composite([
        {
          input: wmResized,
          top: meta.height - wmHeight - 24,
          left: meta.width - wmWidth - 24,
          blend: "over",
        },
      ])
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    await writeFile(jpgPath, out);
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${files.length}`);
  }
  console.log(`✓ ${done} تصویر JPG با واترمارک لوگو ساخته شد`);

  // بروزرسانی مسیرها در دیتابیس: .svg → .jpg
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const cover = await client.query(
      `UPDATE products SET cover_image = replace(cover_image, '.svg', '.jpg')
       WHERE cover_image LIKE '/products/%.svg'`
    );
    // images یک آرایهٔ jsonb است — با تبدیل به متن جایگزین و برگرداندن
    const imgs = await client.query(
      `UPDATE products
       SET images = replace(images::text, '.svg', '.jpg')::jsonb
       WHERE images::text LIKE '%/products/%.svg%'`
    );
    console.log(`✓ دیتابیس: ${cover.rowCount} coverImage و ${imgs.rowCount} ردیف images بروزرسانی شد`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("خطا:", e);
  process.exit(1);
});
