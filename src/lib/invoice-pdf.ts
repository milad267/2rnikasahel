"use client";

/**
 * دانلود فاکتور سفارش به صورت PDF با استفاده از html2canvas + jspdf
 * این ماژول سمت کلاینت اجرا می‌شود و از مرورگر برای رندر استفاده می‌کند
 */

let html2canvas: any = null;
let jspdf: any = null;

async function loadDeps() {
  if (!html2canvas) {
    const mod = await import("html2canvas");
    html2canvas = mod.default;
  }
  if (!jspdf) {
    const mod = await import("jspdf");
    jspdf = mod.jsPDF;
  }
}

/**
 * دریافت HTML فاکتور از سرور و دانلود به صورت PDF
 * @param orderNumber - شماره سفارش (مثلاً DS-10045)
 */
export async function downloadInvoicePdf(orderNumber: string): Promise<void> {
  await loadDeps();

  // 1. دریافت HTML فاکتور از سرور
  const res = await fetch(`/api/invoices?orderNumber=${encodeURIComponent(orderNumber)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "خطا در دریافت فاکتور" }));
    throw new Error(err.error || "خطا در دریافت فاکتور");
  }

  const html = await res.text();

  // 2. ایجاد یک کانتینر مخفی برای رندر HTML
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 width at 96dpi
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  try {
    // 3. صبر برای لود فونت‌ها و رندر کامل
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. تبدیل به canvas با کیفیت بالا
    const canvas = await html2canvas(container, {
      scale: 2, // کیفیت 2x برای وضوح بالا
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
    });

    // 5. ایجاد PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jspdf("p", "mm", "a4");
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // اگر طول بیشتر از یک صفحه A4 است، چند صفحه بساز
    const pageHeight = 297; // A4 height in mm
    let heightLeft = pdfHeight;
    let position = 0;

    // صفحه اول
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    // صفحات اضافی اگر نیاز باشد
    while (heightLeft > 0) {
      position -= pageHeight; // حرکت به پایین
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    // 6. دانلود فایل PDF
    pdf.save(`invoice-${orderNumber}.pdf`);
  } finally {
    // پاکسازی DOM
    document.body.removeChild(container);
  }
}

/**
 * باز کردن فاکتور در تب جدید (HTML)
 * @param orderNumber - شماره سفارش
 */
export function openInvoiceHtml(orderNumber: string): void {
  window.open(`/api/invoices?orderNumber=${encodeURIComponent(orderNumber)}`, "_blank");
}
