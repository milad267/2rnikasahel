import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { enforceRateLimit } from "@/lib/request-security";

/** ثبت پیام تماس با ما از فرم عمومی سایت */
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "contact", 4, 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const message = String(body?.message || "").trim();
    const email = String(body?.email || "").trim();
    const phone = String(body?.phone || "").trim().replace(/[\s-]/g, "");
    if (name.length < 2 || message.length < 10) {
      return NextResponse.json({ ok: false, error: "نام و پیام الزامی است" }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست" }, { status: 400 });
    }
    if (phone && !/^(?:\+98|0)?9\d{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    const [created] = await db
      .insert(contactMessages)
      .values({
        name: name.slice(0, 160),
        email: email ? email.slice(0, 200) : null,
        phone: phone ? phone.slice(0, 30) : null,
        subject: body.subject ? String(body.subject).slice(0, 200) : null,
        message: message.slice(0, 4000),
        type: "contact",
      })
      .returning();
    return NextResponse.json({ ok: true, id: created?.id });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ثبت پیام" }, { status: 500 });
  }
}
