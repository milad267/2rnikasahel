import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "extract-pdf", 5, 10 * 60_000);
  if (limited) return limited;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده" }, { status: 400 });

    if (file.size > 8 * 1024 * 1024 || file.type !== "application/pdf") {
      return NextResponse.json({ ok: false, error: "فقط PDF تا حجم ۸ مگابایت مجاز است." }, { status: 400 });
    }
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    let text = "";
    try { text = (await parser.getText()).text || ""; }
    finally { await parser.destroy(); }
    return NextResponse.json({ ok: true, text });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
