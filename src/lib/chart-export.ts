// ابزارهای خروجی گرفتن از نمودارها و داده‌ها (تصویر PNG / متن CSV)

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** خروجی گرفتن از داده‌های نمودار به‌صورت فایل CSV (سازگار با اکسل فارسی) */
export function exportDataAsCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\r\n");
  // BOM برای نمایش صحیح فارسی در اکسل
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/** خروجی گرفتن از یک نمودار SVG داخل یک المان به‌صورت تصویر PNG */
export function exportSvgAsPng(container: HTMLElement | null, filename: string) {
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const width = rect.width || 600;
  const height = rect.height || 300;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  const scale = 2;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;base64," + svg64;
}
