import { execSync } from "node:child_process";

// لیست همهٔ آبجکت‌ها
const objs = execSync("git rev-list --objects --all", { maxBuffer: 1024 * 1024 * 512 })
  .toString()
  .split("\n")
  .filter(Boolean);

// نگاشت sha -> path
const pathBySha = new Map();
for (const line of objs) {
  const sp = line.indexOf(" ");
  if (sp > 0) pathBySha.set(line.slice(0, sp), line.slice(sp + 1));
}

// اندازهٔ همهٔ blobها به‌صورت یکجا
const batch = execSync('git cat-file --batch-all-objects --batch-check="%(objectsize) %(objecttype) %(objectname)"', {
  maxBuffer: 1024 * 1024 * 512,
})
  .toString()
  .split("\n")
  .filter(Boolean);

const rows = [];
for (const line of batch) {
  const [size, type, sha] = line.split(" ");
  if (type === "blob") rows.push([parseInt(size), pathBySha.get(sha) || "(unreferenced)"]);
}
rows.sort((a, b) => b[0] - a[0]);

const mb = (b) => (b / 1024 / 1024).toFixed(1).padStart(8) + " MB";

console.log("=== ۲۰ فایل حجیم در تاریخچه git ===");
for (const [s, p] of rows.slice(0, 20)) console.log(mb(s), p);

const agg = {};
for (const [s, p] of rows) {
  const ext = (p.match(/\.[^.\/]+$/) || ["(none)"])[0];
  agg[ext] = (agg[ext] || 0) + s;
}
console.log("\n=== مجموع بر اساس پسوند ===");
Object.entries(agg)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([e, s]) => console.log(mb(s), e));
