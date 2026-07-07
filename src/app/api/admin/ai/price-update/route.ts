import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { aiPriceUpdateJobs, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RowReport = {
  row: number;
  code: string;
  price: number | null;
  status: "matched" | "updated" | "not_found" | "invalid";
  oldPrice?: string;
  newPrice?: string;
  error?: string;
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value ?? "")
    .replace(/[٬,\s]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const dryRun = String(form.get("dryRun") ?? "true") !== "false";

    if (!file) {
      return NextResponse.json({ ok: false, error: "فایل اکسل انتخاب نشده است." }, { status: 400 });
    }

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      return NextResponse.json({ ok: false, error: "فرمت فایل باید xlsx، xls یا csv باشد." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ ok: false, error: "فایل اکسل خالی است." }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "هیچ ردیفی در فایل اکسل وجود ندارد." }, { status: 400 });
    }

    const report: RowReport[] = [];
    let matchedRows = 0;
    let updatedRows = 0;
    let errorRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const entries = Object.entries(row);
      const codeEntry = entries.find(([k]) => normalizeHeader(k) === "CODE" || normalizeHeader(k) === "SKU");
      const priceEntry = entries.find(([k]) => normalizeHeader(k) === "PRICE" || normalizeHeader(k) === "قیمت" || normalizeHeader(k) === "PRICE_RIAL");

      const code = String(codeEntry?.[1] ?? "").trim();
      const price = parsePrice(priceEntry?.[1]);

      if (!code || price === null) {
        errorRows++;
        report.push({ row: i + 2, code, price, status: "invalid", error: "CODE یا PRICE نامعتبر است." });
        continue;
      }

      const [variant] = await db
        .select({ id: productVariants.id, sku: productVariants.sku, price: productVariants.price })
        .from(productVariants)
        .where(eq(productVariants.sku, code))
        .limit(1);

      if (!variant) {
        errorRows++;
        report.push({ row: i + 2, code, price, status: "not_found", error: "کد کالا در سیستم پیدا نشد." });
        continue;
      }

      matchedRows++;
      if (dryRun) {
        report.push({ row: i + 2, code, price, status: "matched", oldPrice: variant.price, newPrice: String(price) });
      } else {
        await db.update(productVariants).set({ price: String(price) }).where(eq(productVariants.id, variant.id));
        updatedRows++;
        report.push({ row: i + 2, code, price, status: "updated", oldPrice: variant.price, newPrice: String(price) });
      }
    }

    const [job] = await db
      .insert(aiPriceUpdateJobs)
      .values({
        filename: file.name,
        mode: dryRun ? "dry_run" : "apply",
        totalRows: rows.length,
        matchedRows,
        updatedRows,
        errorRows,
        report: { rows: report },
      })
      .returning();

    return NextResponse.json({
      ok: true,
      dryRun,
      jobId: job.id,
      totalRows: rows.length,
      matchedRows,
      updatedRows,
      errorRows,
      report,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
