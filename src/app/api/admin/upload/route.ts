import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const data = category
    ? await db.select().from(uploadedFiles).where(eq(uploadedFiles.category, category)).orderBy(desc(uploadedFiles.createdAt))
    : await db.select().from(uploadedFiles).orderBy(desc(uploadedFiles.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = String(formData.get("category") || "general");
    const altText = (formData.get("altText") as string) || null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده است." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "فقط فایل‌های تصویری JPG/PNG/WEBP/SVG مجاز هستند." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد." }, { status: 400 });
    }

    const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
    const safeName = crypto.randomBytes(8).toString("hex") + ext;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, safeName), buffer);

    const url = `/uploads/${safeName}`;
    const [saved] = await db
      .insert(uploadedFiles)
      .values({ filename: file.name, url, mimeType: file.type, size: file.size, category, altText })
      .returning();

    return NextResponse.json({ ok: true, file: saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
