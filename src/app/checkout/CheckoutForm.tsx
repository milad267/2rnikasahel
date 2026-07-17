"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MapPin, Truck, CreditCard, ShieldCheck, CheckCircle2, XCircle, Plus } from "lucide-react";
import { formatRial } from "@/lib/utils";
import type { PaymentGateway } from "@/lib/gateways";
import { ProvinceCitySelect } from "@/components/ui/ProvinceCitySelect";

type PaymentMethod = PaymentGateway;

export type SavedAddress = {
  id: number;
  title: string;
  province: string;
  city: string;
  postalAddress: string;
  postalCode: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  isDefault: boolean;
};


/** درگاه‌هایی که کاربر می‌تواند از بین آن‌ها انتخاب کند */
type AvailableGateway = { value: PaymentMethod; title: string; desc: string; isDefault: boolean };

/** روش ارسال از سرور */
export type ShippingMethodItem = {
  id: number;
  title: string;
  description: string | null;
  cost: string;
  freeThreshold: string;
  deliveryDays: string | null;
  isFree: boolean;
};

/** تنظیمات ارسال (از سرور خوانده می‌شود) */
type ShippingSettings = { fee: number; freeThreshold: number };

const DEFAULT_SHIPPING: ShippingSettings = { fee: 25000, freeThreshold: 5000000 };

function calcShippingCost(shippingMethods: ShippingMethodItem[], selectedId: number | null, subtotal: number): number {
  if (!selectedId) return 0;
  const method = shippingMethods.find((m) => m.id === selectedId);
  if (!method || method.isFree) return 0;
  const threshold = Number(method.freeThreshold);
  if (threshold > 0 && subtotal >= threshold) return 0;
  return Number(method.cost) || 0;
}

export function CheckoutForm({
  subtotal,
  count,
  userName,
  userPhone,
  savedAddresses = [],
}: {
  subtotal: number;
  count: number;
  userName: string;
  userPhone: string;
  savedAddresses?: SavedAddress[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">("form");
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [gateways, setGateways] = useState<AvailableGateway[]>([]);
  const [shipping, setShipping] = useState<ShippingSettings>(DEFAULT_SHIPPING);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodItem[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState(true);
  // اگر آدرس ذخیره‌شده داشته باشیم، پیش‌فرض روی آن، در غیر این‌صورت فرم جدید
  const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new">(
    defaultAddr ? defaultAddr.id : "new",
  );


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
      // ذخیره در sessionStorage تا با رفرش از دست نره
      sessionStorage.setItem("order_success", JSON.stringify({ orderNumber: orderNum, paymentRef: refId || "" }));
      router.replace("/checkout", { scroll: false });
    } else if (errorParam) {
      const errorMsg = decodeURIComponent(errorParam).replace(/\+/g, " ");
      setError(errorMsg);
      setStep("error");
      sessionStorage.setItem("order_error", errorMsg);
      router.replace("/checkout", { scroll: false });
    } else {
      // بررسی sessionStorage برای زمانی که کاربر صفحه را رفرش کرده
      const savedSuccess = sessionStorage.getItem("order_success");
      const savedError = sessionStorage.getItem("order_error");
      if (savedSuccess) {
        try {
          const { orderNumber: savedNum, paymentRef: savedRef } = JSON.parse(savedSuccess);
          setOrderNumber(savedNum);
          setPaymentRef(savedRef || "");
          setStep("success");
        } catch {}
      } else if (savedError) {
        setError(savedError);
        setStep("error");
      }
    }
  }, [searchParams, router]);

  const [form, setForm] = useState({
    province: defaultAddr?.province ?? "",
    city: defaultAddr?.city ?? "",
    shippingAddress: defaultAddr?.postalAddress ?? "",
    postalCode: defaultAddr?.postalCode ?? "",
    receiverName: defaultAddr?.receiverName || userName,
    receiverPhone: defaultAddr?.receiverPhone || userPhone,
    paymentMethod: "zarinpal" as PaymentMethod,
    notes: "",
    // اگر آدرس ذخیره‌شده انتخاب شده، دوباره ذخیره نکن
    saveAddress: !defaultAddr,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment/gateways", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.ok || !Array.isArray(data.gateways)) return;
        const available = data.gateways as AvailableGateway[];
        setGateways(available);
        if (available.length > 0) {
          const preferred = available.find((gateway) => gateway.isDefault) || available[0];
          setForm((current) => ({ ...current, paymentMethod: preferred.value }));
        }
        // تنظیمات ارسال از سرور
        if (data.shipping) {
          setShipping({
            fee: Number(data.shipping.fee) || DEFAULT_SHIPPING.fee,
            freeThreshold: Number(data.shipping.freeThreshold) || DEFAULT_SHIPPING.freeThreshold,
          });
        }
        // روش‌های ارسال از سرور
        if (Array.isArray(data.shippingMethods) && data.shippingMethods.length > 0) {
          setShippingMethods(data.shippingMethods);
          const firstActive = data.shippingMethods[0];
          setSelectedShippingId(firstActive.id);
        }
      })
      .finally(() => { if (!cancelled) setGatewayLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // انتخاب یک آدرس ذخیره‌شده و پر کردن فرم
  function applyAddress(id: number | "new") {
    setSelectedAddressId(id);
    if (id === "new") {
      setForm((f) => ({
        ...f,
        province: "",
        city: "",
        shippingAddress: "",
        postalCode: "",
        receiverName: userName,
        receiverPhone: userPhone,
        saveAddress: true,
      }));
      return;
    }
    const addr = savedAddresses.find((a) => a.id === id);
    if (!addr) return;
    setForm((f) => ({
      ...f,
      province: addr.province,
      city: addr.city,
      shippingAddress: addr.postalAddress,
      postalCode: addr.postalCode ?? "",
      receiverName: addr.receiverName || userName,
      receiverPhone: addr.receiverPhone || userPhone,
      saveAddress: false,
    }));
  }

  const shippingCost = calcShippingCost(shippingMethods, selectedShippingId, subtotal);
  const total = subtotal + shippingCost;



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!gateways.some((gateway) => gateway.value === form.paymentMethod)) {
        throw new Error("درگاه پرداخت فعالی برای این سفارش انتخاب نشده است.");
      }
      // ۱) ثبت سفارش
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shippingMethodId: selectedShippingId }),
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
            onClick={() => { sessionStorage.removeItem("order_success"); sessionStorage.removeItem("order_error"); setStep("form"); setError(""); }}
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
            onClick={() => { sessionStorage.removeItem("order_success"); router.push("/orders"); }}
            className="rounded-full bg-petrol-600 px-5 py-3 text-sm font-semibold text-pearl-50 shadow-md"
          >
            پیگیری سفارش
          </button>
          <button
            type="button"
            onClick={() => { sessionStorage.removeItem("order_success"); router.push("/shop"); }}
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

          {/* انتخاب آدرس ذخیره‌شده */}
          {savedAddresses.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-charcoal-500">یکی از آدرس‌های ذخیره‌شده را انتخاب کنید یا آدرس جدید وارد کنید:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {savedAddresses.map((addr) => {
                  const active = selectedAddressId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => applyAddress(addr.id)}
                      className={`rounded-2xl border p-3 text-right transition-all ${
                        active
                          ? "border-petrol-500 bg-petrol-600/[0.08]"
                          : "border-navy-900/10 hover:border-navy-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-navy-900">{addr.title}</p>
                        {addr.isDefault && (
                          <span className="rounded-full bg-petrol-600/10 px-2 py-0.5 text-[9px] text-petrol-700">پیش‌فرض</span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-charcoal-500">
                        {addr.province}، {addr.city} — {addr.postalAddress}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => applyAddress("new")}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border border-dashed p-3 text-xs font-semibold transition-all ${
                    selectedAddressId === "new"
                      ? "border-petrol-500 bg-petrol-600/[0.08] text-petrol-700"
                      : "border-navy-900/20 text-charcoal-500 hover:border-navy-900/30"
                  }`}
                >
                  <Plus className="size-4" strokeWidth={1.8} />
                  آدرس جدید
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ProvinceCitySelect
                province={form.province}
                city={form.city}
                onProvinceChange={(v) => setForm({ ...form, province: v })}
                onCityChange={(v) => setForm({ ...form, city: v })}
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
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                title="کد پستی باید ۱۰ رقم باشد"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="۱۰ رقمی"
                dir="ltr"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">نام گیرنده *</label>
              <input
                type="text"
                required
                value={form.receiverName}
                onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">موبایل گیرنده *</label>
              <input
                type="tel"
                inputMode="numeric"
                required
                pattern="09\d{9}"
                maxLength={11}
                title="شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود"
                value={form.receiverPhone}
                onChange={(e) => setForm({ ...form, receiverPhone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                dir="ltr"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">یادداشت سفارش (اختیاری)</label>
              <input
                type="text"
                maxLength={500}
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
          {gatewayLoading && <p className="py-3 text-center text-xs text-charcoal-500">در حال دریافت روش‌های ارسال…</p>}
          {!gatewayLoading && shippingMethods.length === 0 && (
            <div className="mt-4 rounded-2xl border border-petrol-500/30 bg-petrol-600/[0.05] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-navy-900">ارسال پیش‌فرض</p>
                  <p className="mt-1 text-[11px] text-charcoal-500">هزینه بر اساس تنظیمات فروشگاه محاسبه می‌شود</p>
                </div>
                <span className="text-xs font-bold text-petrol-700">
                  {shippingCost === 0 ? "رایگان" : formatRial(shippingCost)}
                </span>
              </div>
              {subtotal < shipping.freeThreshold && (
                <p className="mt-2 text-[10px] text-charcoal-500">
                  برای ارسال رایگان {formatRial(shipping.freeThreshold - subtotal)} دیگر خرید کنید.
                </p>
              )}
            </div>
          )}
          {!gatewayLoading && shippingMethods.length > 0 && (
            <div className="mt-4 grid gap-2">
              {shippingMethods.map((method) => {
                const active = selectedShippingId === method.id;
                const methodCost = calcShippingCost(shippingMethods, method.id, subtotal);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedShippingId(method.id)}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-right transition-all ${
                      active
                        ? "border-petrol-500 bg-petrol-600/[0.08]"
                        : "border-navy-900/10 hover:border-navy-900/20"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-navy-900">{method.title}</p>
                      {method.description && (
                        <p className="mt-0.5 text-[11px] text-charcoal-500">{method.description}</p>
                      )}
                      {method.deliveryDays && (
                        <p className="mt-0.5 text-[10px] text-charcoal-400">🚚 {method.deliveryDays}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-petrol-700">
                      {method.isFree ? "رایگان" : methodCost === 0 ? "رایگان" : formatRial(methodCost)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card rounded-[2rem] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <CreditCard className="size-5 text-petrol-600" strokeWidth={1.8} />
            انتخاب درگاه پرداخت
          </h2>
          <div className="mt-4 grid gap-2">
            {gatewayLoading && <p className="py-5 text-center text-xs text-charcoal-500">در حال دریافت درگاه‌های فعال…</p>}
            {!gatewayLoading && gateways.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                هنوز درگاه آماده‌ای فعال نشده است. لطفاً با پشتیبانی فروشگاه تماس بگیرید.
              </div>
            )}
            {gateways.map((gw) => {
              const active = form.paymentMethod === gw.value;
              return (
                <button
                  key={gw.value}
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: gw.value })}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-right transition-all ${
                    active
                      ? "border-petrol-500 bg-petrol-600/[0.08]"
                      : "border-navy-900/10 hover:border-navy-900/20"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-navy-900">{gw.title}</p>
                    <p className="mt-0.5 text-[10px] text-charcoal-500">{gw.desc}</p>
                  </div>
                  {active && <CheckCircle2 className="size-5 text-petrol-600" />}
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
                {shippingCost === 0 ? "رایگان" : formatRial(shippingCost)}
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
