import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";

/** ثبت پیام تماس با ما از فرم عمومی سایت */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || !body?.message) {
      return NextResponse.json({ ok: false, error: "نام و پیام الزامی است" }, { status: 400 });
    }
    const [created] = await db
      .insert(contactMessages)
      .values({
        name: String(body.name).slice(0, 160),
        email: body.email ? String(body.email).slice(0, 200) : null,
        phone: body.phone ? String(body.phone).slice(0, 30) : null,
        subject: body.subject ? String(body.subject).slice(0, 200) : null,
        message: String(body.message).slice(0, 4000),
        type: "contact",
      })
      .returning();
    return NextResponse.json({ ok: true, id: created?.id });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ثبت پیام" }, { status: 500 });
  }
}
