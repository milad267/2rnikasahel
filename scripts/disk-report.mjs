import { statSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function dirSize(dir) {
  let total = 0;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    try {
      if (e.isDirectory()) total += dirSize(full);
      else total += statSync(full).size;
    } catch {
      /* ignore */
    }
  }
  return total;
}

const mb = (b) => (b / 1024 / 1024).toFixed(1).padStart(9) + " MB";

// اندازهٔ پوشه‌های سطح بالا
console.log("=== پوشه‌های سطح بالا ===");
const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
const dsizes = dirs
  .map((d) => ({ name: d.name, size: dirSize(path.join(root, d.name)) }))
  .sort((a, b) => b.size - a.size);
for (const d of dsizes) console.log(mb(d.size), d.name);

// فایل‌های سطح بالا
console.log("\n=== فایل‌های سطح بالا (>50KB) ===");
const files = readdirSync(root, { withFileTypes: true }).filter((d) => d.isFile());
const fsizes = files
  .map((f) => ({ name: f.name, size: statSync(path.join(root, f.name)).size }))
  .filter((f) => f.size > 50 * 1024)
  .sort((a, b) => b.size - a.size);
for (const f of fsizes) console.log(mb(f.size), f.name);
