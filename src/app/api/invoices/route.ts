import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, users, productVariants, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatRial } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices?orderNumber=DS-10045
 * تولید و دانلود فاکتور PDF برای یک سفارش
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ورود الزامی است" }, { status: 401 });
    const orderNumber = req.nextUrl.searchParams.get("orderNumber");
    if (!orderNumber) {
      return NextResponse.json({ ok: false, error: "orderNumber required" }, { status: 400 });
    }

    const [order] = await db
      .select({
        id: orders.id, userId: orders.userId, orderNumber: orders.orderNumber, status: orders.status,
        totalAmount: orders.totalAmount, shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod, createdAt: orders.createdAt,
        userName: users.name, userPhone: users.phone, userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json({ ok: false, error: "سفارش یافت نشد" }, { status: 404 });
    }
    if (!["admin", "superadmin"].includes(user.role) && order.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const esc = (value: unknown) => String(value ?? "—").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);

    const items = await db
      .select({
        id: orderItems.id, quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice, lineTotal: orderItems.lineTotal,
        productTitle: orderItems.productTitle,
        variantTitle: orderItems.variantTitle,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const statusLabels: Record<string, string> = {
      pending_payment: "در انتظار پرداخت", paid: "پرداخت شده",
      processing: "در حال پردازش", shipped: "ارسال شده",
      delivered: "تحویل شده", cancelled: "لغو شده",
    };

    // تولید HTML فاکتور حرفه‌ای
    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Vazirmatn', Tahoma, sans-serif;
    background: #f0f2f5;
    padding: 32px;
    color: #1e293b;
    font-size: 11px;
    line-height: 1.7;
  }

  .invoice-container {
    max-width: 210mm;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.08);
  }

  /* ── هدر ── */
  .invoice-header {
    background: linear-gradient(135deg, #0a2e4a 0%, #146b7e 100%);
    padding: 36px 40px 28px;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .invoice-header .brand h1 {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin: 0;
    line-height: 1.2;
  }

  .invoice-header .brand p {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 4px;
  }

  .invoice-header .title-area {
    text-align: left;
  }

  .invoice-header .title-area .badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(4px);
    padding: 4px 16px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .invoice-header .title-area h2 {
    font-size: 20px;
    font-weight: 800;
    margin: 0;
    direction: ltr;
  }

  .invoice-header .title-area .status-badge {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 14px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 700;
  }

  .status-pending { background: #f59e0b; color: #fff; }
  .status-paid { background: #3b82f6; color: #fff; }
  .status-processing { background: #6366f1; color: #fff; }
  .status-shipped { background: #146b7e; color: #fff; }
  .status-delivered { background: #22c55e; color: #fff; }
  .status-cancelled { background: #ef4444; color: #fff; }

  /* ── بدنه ── */
  .invoice-body {
    padding: 32px 40px;
  }

  /* ── اطلاعات ── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 28px;
  }

  .info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 20px;
  }

  .info-card h3 {
    font-size: 10px;
    font-weight: 700;
    color: #146b7e;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 2px solid #146b7e20;
  }

  .info-card .row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 10.5px;
  }

  .info-card .row .label {
    color: #64748b;
    font-weight: 500;
  }

  .info-card .row .value {
    color: #1e293b;
    font-weight: 600;
    text-align: left;
  }

  /* ── آدرس ── */
  .address-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px 20px;
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .address-box .label {
    font-size: 10px;
    font-weight: 700;
    color: #146b7e;
    white-space: nowrap;
    margin-top: 1px;
  }

  .address-box .text {
    font-size: 10.5px;
    color: #475569;
    line-height: 1.8;
  }

  /* ── جدول ── */
  .items-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    margin-bottom: 24px;
  }

  .items-table thead th {
    background: #0a2e4a;
    color: #ffffff;
    padding: 10px 14px;
    font-size: 10px;
    font-weight: 700;
    text-align: right;
  }

  .items-table thead th:last-child { text-align: left; }
  .items-table thead th:nth-child(4),
  .items-table thead th:nth-child(5),
  .items-table thead th:nth-child(6) { text-align: center; }

  .items-table tbody td {
    padding: 9px 14px;
    font-size: 10.5px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .items-table tbody tr:last-child td { border-bottom: none; }
  .items-table tbody tr:hover { background: #f8fafc; }

  .items-table tbody td:last-child { text-align: left; font-weight: 700; }
  .items-table tbody td:nth-child(4),
  .items-table tbody td:nth-child(5),
  .items-table tbody td:nth-child(6) { text-align: center; }

  .items-table .product-title {
    font-weight: 700;
    color: #1e293b;
  }

  .items-table .variant-title {
    font-size: 9px;
    color: #94a3b8;
    display: block;
    margin-top: 2px;
  }

  .items-table .row-num {
    color: #94a3b8;
    font-weight: 600;
    font-size: 9px;
  }

  /* ── جمع ── */
  .totals {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 24px;
    margin-bottom: 24px;
  }

  .totals .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }

  .totals .total-row .label {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
  }

  .totals .total-row .value {
    font-size: 11px;
    font-weight: 700;
    color: #1e293b;
  }

  .totals .divider {
    height: 1px;
    background: #e2e8f0;
    margin: 8px 0;
  }

  .totals .grand-total .label {
    font-size: 15px;
    font-weight: 900;
    color: #0a2e4a;
  }

  .totals .grand-total .value {
    font-size: 18px;
    font-weight: 900;
    color: #146b7e;
  }

  /* ── پانوشت ── */
  .invoice-footer {
    border-top: 1px solid #e2e8f0;
    padding: 20px 40px 28px;
    text-align: center;
  }

  .invoice-footer .meta {
    font-size: 9px;
    color: #94a3b8;
    margin-bottom: 4px;
  }

  .invoice-footer .meta span {
    display: inline-block;
    margin: 0 8px;
  }

  .invoice-footer .copyright {
    font-size: 9px;
    color: #cbd5e1;
    margin-top: 8px;
  }

  /* ── چاپ ── */
  @media print {
    body { background: #fff; padding: 0; }
    .invoice-container { box-shadow: none; border-radius: 0; max-width: 100%; }
    .invoice-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .items-table thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .status-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="invoice-container">

  <!-- هدر -->
  <div class="invoice-header">
    <div class="brand">
      <h1>درنیکا ساحل</h1>
      <p>مرجع تخصصی تجهیزات صنعتی و تأسیسات</p>
    </div>
    <div class="title-area">
      <div class="badge">فاکتور رسمی</div>
      <h2>${esc(order.orderNumber)}</h2>
      <div class="status-badge status-${order.status}">${statusLabels[order.status] || order.status}</div>
    </div>
  </div>

  <!-- بدنه -->
  <div class="invoice-body">

    <!-- اطلاعات -->
    <div class="info-grid">
      <div class="info-card">
        <h3>اطلاعات مشتری</h3>
        <div class="row"><span class="label">نام</span><span class="value">${esc(order.userName)}</span></div>
        <div class="row"><span class="label">شماره تماس</span><span class="value" dir="ltr">${esc(order.userPhone)}</span></div>
        ${order.userEmail ? `<div class="row"><span class="label">ایمیل</span><span class="value" dir="ltr">${esc(order.userEmail)}</span></div>` : ""}
      </div>
      <div class="info-card">
        <h3>اطلاعات سفارش</h3>
        <div class="row"><span class="label">تاریخ ثبت</span><span class="value">${new Date(order.createdAt).toLocaleDateString("fa-IR")}</span></div>
        <div class="row"><span class="label">روش پرداخت</span><span class="value">${order.paymentMethod === "sandbox" ? "تست" : order.paymentMethod || "—"}</span></div>
        <div class="row"><span class="label">وضعیت</span><span class="value">${statusLabels[order.status] || order.status}</span></div>
      </div>
    </div>

    <!-- آدرس -->
    ${order.shippingAddress ? `
    <div class="address-box">
      <span class="label">📍 آدرس تحویل</span>
      <span class="text">${esc(order.shippingAddress)}</span>
    </div>` : ""}

    <!-- جدول اقلام -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>محصول</th>
          <th>تنوع</th>
          <th style="text-align:center">قیمت واحد</th>
          <th style="text-align:center">تعداد</th>
          <th style="text-align:center">جمع</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
        <tr>
          <td><span class="row-num">${String(i + 1).padStart(2, "0")}</span></td>
          <td><span class="product-title">${esc(item.productTitle)}</span></td>
          <td>${item.variantTitle ? `<span class="variant-title">${esc(item.variantTitle)}</span>` : "—"}</td>
          <td>${formatRial(item.unitPrice)}</td>
          <td>${item.quantity}</td>
          <td>${formatRial(item.lineTotal)}</td>
        </tr>`).join("")}
      </tbody>
    </table>

    <!-- جمع کل -->
    <div class="totals">
      <div class="total-row">
        <span class="label">مبلغ کل کالاها</span>
        <span class="value">${formatRial(items.reduce((sum, it) => sum + Number(it.lineTotal), 0), { withUnit: true })}</span>
      </div>
      <div class="divider"></div>
      <div class="total-row grand-total">
        <span class="label">مبلغ قابل پرداخت</span>
        <span class="value">${formatRial(order.totalAmount, { withUnit: true })}</span>
      </div>
    </div>

  </div>

  <!-- پانوشت -->
  <div class="invoice-footer">
    <div class="meta">
      <span>درنیکا ساحل | مرجع تخصصی تجهیزات صنعتی و تأسیسات</span>
      <span>•</span>
      <span>شماره سفارش: ${esc(order.orderNumber)}</span>
      <span>•</span>
      <span>تاریخ: ${new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
    </div>
    <div class="copyright">
      این فاکتور توسط سامانه به صورت خودکار تولید شده و نیاز به مهر و امضا ندارد.
    </div>
  </div>

</div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${order.orderNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("[INVOICE]", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
