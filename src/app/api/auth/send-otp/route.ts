import { NextRequest, NextResponse } from "next/server";
import { sendOtp, RateLimitError } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const target = String(body?.target || "").trim();
    const type = (body?.type === "email" ? "email" : "phone") as "email" | "phone";

    if (!target) {
      return NextResponse.json({ ok: false, error: "لطفاً شماره موبایل یا ایمیل را وارد کنید." }, { status: 400 });
    }

    if (type === "phone" && !/^0?9\d{9}$/.test(target.replace(/\s/g, ""))) {
      return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست." }, { status: 400 });
    }

    if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
    }

    const { devCode } = await sendOtp(target, type);

    return NextResponse.json({
      ok: true,
      message: `کد تایید به ${type === "phone" ? "شماره موبایل" : "ایمیل"} شما ارسال شد.`,
      devCode, // فقط در حالت توسعه مقدار دارد
    });

  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 429 });
    }
    console.error("[SEND_OTP_API_ERROR]", error);
    return NextResponse.json({ ok: false, error: "خطا در ارسال کد. لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}