"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MapPin, Truck, CreditCard, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { formatRial } from "@/lib/utils";

type PaymentMethod = "sandbox" | "zarinpal" | "zibal" | "sep";

const GATEWAYS: { value: PaymentMethod; title: string; desc: string; status: "active" | "coming" }[] = [
  { value: "sandbox", title: "پرداخت آزمایشی (Sandbox)", desc: "بدون اتصال به درگاه — مخصوص تست", status: "active" },
  { value: "zarinpal", title: "زرین‌پال", desc: "پرداخت امن با درگاه زرین‌پال", status: "active" },
  { value: "zibal", title: "زیبال", desc: "درگاه زیبال — آماده اتصال", status: "coming" },
  { value: "sep", title: "سامان (SEP)", desc: "درگاه بانک سامان", status: "coming" },
];

const SHIPPING_FEE = 25000; // ریال
const FREE_SHIPPING_THRESHOLD = 5000000; // بالای ۵ میلیون ریال ارسال رایگان

export function CheckoutForm({
  subtotal,
  count,
  userName,
  userPhone,
}: {
  subtotal: number;
  count: number;
  userName: string;
  userPhone: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">("form");
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  // بررسی callback params
  useEffect(() => {
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");
    const orderNum = searchParams.get("orderNumber");
    const refId = searchParams.get("refId");

    if (successParam === "1" && orderNum) {
      setOrderNumber(orderNum);
      setPaymentRef(refId || "");
      setStep("success");
      router.replace("/checkout", { scroll: false });
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam).replace(/\+/g, " "));
      setStep("error");
      router.replace("/checkout", { scroll: false });
    }
  }, [searchParams, router]);

  const [form, setForm] = useState({
    province: "",
    city: "",
    shippingAddress: "",
    postalCode: "",
    receiverName: userName,
    receiverPhone: userPhone,
    paymentMethod: "sandbox" as PaymentMethod,
    notes: "",
    saveAddress: true,
  });

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ۱) ثبت سفارش
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطا در ثبت سفارش.");
      }

      setOrderNumber(data.orderNumber);
      setStep("processing");

      // ۲) پرداخت
      const payRes = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId }),
      });
      const payData = await payRes.json();
      if (!payRes.ok || !payData.ok) {
        throw new Error(payData.error || "خطا در پرداخت.");
      }

      // اگر redirectUrl داریم (زرین‌پال و sandbox) → ریدایرکت
      if (payData.redirectUrl) {
        window.location.href = payData.redirectUrl;
        return;
      }

      // بدون redirect (نباید اتفاق بیفته)
      setStep("success");
      setPaymentRef(payData.paymentRef || "");
    } catch (err) {
      setError((err as Error).message);
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  // نمایش خطا از callback
  if (step === "error") {
    return (
      <div className="card mx-auto max-w-2xl rounded-[2rem] p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <XCircle className="size-9" strokeWidth={1.6} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900 sm:text-2xl">پرداخت ناموفق بود</h2>
        <p className="mt-2 text-sm text-charcoal-500">{error || "متأسفانه مشکلی در پرداخت پیش آمد."}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setStep("form"); setError(""); }}
            className="rounded-full bg-petrol-600 px-5 py-3 text-sm font-semibold text-pearl-50 shadow-md"
          >
            تلاش مجدد
          </button>
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="rounded-full border border-navy-900/10 bg-navy-900/5 px-5 py-3 text-sm font-semibold text-navy-900"
          >
            بازگشت به سبد خرید
          </button>
        </div>
      </div>
    );
  }

  // نمایش صفحه موفقیت
  if (step === "success") {
    return (
      <div className="card mx-auto max-w-2xl rounded-[2rem] p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="size-9" strokeWidth={1.6} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900 sm:text-2xl">سفارش شما با موفقیت ثبت شد!</h2>
        <p className="mt-2 text-sm text-charcoal-500">
          شماره سفارش: <span className="font-bold text-navy-900">{orderNumber}</span>
        </p>
        {paymentRef && (
          <p className="mt-1 text-[11px] text-charcoal-500">کد پیگیری پرداخت: {paymentRef}</p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="rounded-full bg-petrol-600 px-5 py-3 text-sm font-semibold text-pearl-50 shadow-md"
          >
            مشاهده در پروفایل
          </button>
          <button
            type="button"
            onClick={() => router.push("/shop")}
            className="rounded-full border border-navy-900/10 bg-navy-900/5 px-5 py-3 text-sm font-semibold text-navy-900"
          >
            ادامه خرید
          </button>
        </div>
      </div>
    );
  }

  // نمایش صفحه در حال پردازش پرداخت
  if (step === "processing") {
    return (
      <div className="card mx-auto max-w-md rounded-[2rem] p-10 text-center">
        <Loader2 className="mx-auto size-12 animate-spin text-petrol-600" strokeWidth={1.4} />
        <h2 className="mt-5 text-lg font-bold text-navy-900">در حال اتصال به درگاه پرداخت...</h2>
        <p className="mt-2 text-sm text-charcoal-500">لطفاً چند لحظه صبر کنید.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {/* ستون اصلی — آدرس و پرداخت */}
      <div className="space-y-6">
        {/* آدرس ارسال */}
        <div className="card rounded-[2rem] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <MapPin className="size-5 text-petrol-600" strokeWidth={1.8} />
            آدرس ارسال
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">استان</label>
              <input
                type="text"
                required
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                placeholder="مثال: تهران"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">شهر</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="مثال: تهران"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">آدرس کامل پستی</label>
              <textarea
                required
                value={form.shippingAddress}
                onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                placeholder="خیابان، کوچه، پلاک، واحد"
                rows={3}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">کد پستی</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="۱۰ رقمی"
                dir="ltr"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">نام گیرنده</label>
              <input
                type="text"
                value={form.receiverName}
                onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">موبایل گیرنده</label>
              <input
                type="tel"
                value={form.receiverPhone}
                onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}
                dir="ltr"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">یادداشت سفارش (اختیاری)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="مثال: تحویل در ساعات اداری"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs text-charcoal-500">
            <input
              type="checkbox"
              checked={form.saveAddress}
              onChange={(e) => setForm({ ...form, saveAddress: e.target.checked })}
              className="size-4 accent-petrol-600"
            />
            ذخیره این آدرس برای سفارش‌های بعدی
          </label>
        </div>

        {/* روش ارسال و پرداخت */}
        <div className="card rounded-[2rem] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Truck className="size-5 text-petrol-600" strokeWidth={1.8} />
            روش ارسال
          </h2>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-petrol-500/30 bg-petrol-600/[0.05] p-4">
            <div>
              <p className="text-sm font-bold text-navy-900">ارسال پست پیشتاز (سراسری)</p>
              <p className="mt-1 text-[11px] text-charcoal-500">۲ تا ۴ روز کاری — بیمه‌شده تا درب منزل</p>
            </div>
            <span className="text-xs font-bold text-petrol-700">
              {shipping === 0 ? "رایگان" : formatRial(shipping)}
            </span>
          </div>
          {subtotal < FREE_SHIPPING_THRESHOLD && (
            <p className="mt-2 text-[10px] text-charcoal-500">
              برای ارسال رایگان {formatRial(FREE_SHIPPING_THRESHOLD - subtotal)} دیگر خرید کنید.
            </p>
          )}
        </div>

        <div className="card rounded-[2rem] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <CreditCard className="size-5 text-petrol-600" strokeWidth={1.8} />
            انتخاب درگاه پرداخت
          </h2>
          <div className="mt-4 grid gap-2">
            {GATEWAYS.map((gw) => {
              const active = form.paymentMethod === gw.value;
              return (
                <button
                  key={gw.value}
                  type="button"
                  disabled={gw.status === "coming"}
                  onClick={() => setForm({ ...form, paymentMethod: gw.value })}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-right transition-all ${
                    active
                      ? "border-petrol-500 bg-petrol-600/[0.08]"
                      : "border-navy-900/10 hover:border-navy-900/20"
                  } ${gw.status === "coming" ? "cursor-not-allowed opacity-55" : ""}`}
                >
                  <div>
                    <p className="text-xs font-bold text-navy-900">{gw.title}</p>
                    <p className="mt-0.5 text-[10px] text-charcoal-500">{gw.desc}</p>
                  </div>
                  {gw.status === "coming" && (
                    <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[9px] text-charcoal-500">به‌زودی</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ستون کناری — خلاصه سفارش */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-28">
        <div className="card rounded-[2rem] p-6">
          <h2 className="text-base font-bold text-navy-900">خلاصه سفارش</h2>
          <div className="mt-4 space-y-3 border-t border-navy-900/10 pt-4 text-sm">
            <div className="flex items-center justify-between text-charcoal-500">
              <span>تعداد کالا</span>
              <span className="font-medium text-navy-900">{count}</span>
            </div>
            <div className="flex items-center justify-between text-charcoal-500">
              <span>جمع کالاها</span>
              <span className="font-medium text-navy-900">{formatRial(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-charcoal-500">
              <span>هزینه ارسال</span>
              <span className="font-medium text-navy-900">
                {shipping === 0 ? "رایگان" : formatRial(shipping)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-navy-900/10 pt-4">
            <span className="text-sm font-bold text-navy-900">مبلغ قابل پرداخت</span>
            <span className="text-lg font-black text-petrol-700">{formatRial(total)}</span>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-[11px] font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-5 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" strokeWidth={1.8} />}
            {loading ? "در حال ثبت..." : "تأیید نهایی و پرداخت"}
          </button>

          <p className="mt-3 text-center text-[10px] leading-4 text-charcoal-500">
            با تأیید نهایی، شما قوانین خرید و بازگشت کالا را می‌پذیرید.
          </p>
        </div>
      </aside>
    </form>
  );
}
