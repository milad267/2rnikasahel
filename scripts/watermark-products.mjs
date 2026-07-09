import "dotenv/config";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Pool } from "pg";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
const WATERMARK_PATH = path.join(process.cwd(), "public", "watermark.svg");

async function main() {
  const wmSvg = await readFile(WATERMARK_PATH);

  const files = (await readdir(PRODUCTS_DIR)).filter((f) => f.toLowerCase().endsWith(".svg"));
  console.log(`یافت شد: ${files.length} فایل SVG`);

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
    const meta = { width: 1200, height: 900 };

    // اندازهٔ واترمارک ~۳۰٪ عرض تصویر
    const wmWidth = Math.round(meta.width * 0.3);
    const wmHeight = Math.round(wmWidth * (80 / 280));
    const wmResized = await sharp(wmSvg).resize(wmWidth, wmHeight, { fit: "fill" }).png().toBuffer();

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
  console.log(`✓ ${done} تصویر JPG واترمارک‌دار ساخته شد`);

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
