"use client";

import { useState } from "react";
import { Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function QuotePage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", product: "", quantity: "", description: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.product) {
      toast.error("لطفاً نام، شماره تماس و نام محصول را وارد کنید.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          subject: `استعلام قیمت: ${form.product}`,
          message: `محصول: ${form.product}\nتعداد: ${form.quantity || "نامشخص"}\nتوضیحات: ${form.description || "—"}`,
          type: "quote",
        }),
      });
      const data = await res.json();
      if (data.ok) { setSent(true); toast.success("✅ درخواست شما ثبت شد"); }
      else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در ارسال"); }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <CheckCircle2 className="mx-auto size-16 text-emerald-500" strokeWidth={1.3} />
          <h1 className="mt-6 text-3xl font-black text-navy-900">درخواست شما ثبت شد</h1>
          <p className="mt-3 text-sm text-charcoal-500">کارشناسان ما در اسرع وقت با شما تماس می‌گیرند.</p>
          <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-white">بازگشت به صفحه اصلی</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">استعلام قیمت</h1>
        <p className="mt-2 text-sm text-charcoal-500">فرم زیر را پر کنید تا کارشناسان ما بهترین قیمت را ارائه دهند.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">نام و نام خانوادگی *</label>
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-xs outline-none focus:border-petrol-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">شماره تماس *</label>
              <input type="text" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-xs outline-none focus:border-petrol-500" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-900">ایمیل (اختیاری)</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-xs outline-none focus:border-petrol-500" dir="ltr" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">نام محصول *</label>
              <input type="text" required value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-xs outline-none focus:border-petrol-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">تعداد</label>
              <input type="text" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-xs outline-none focus:border-petrol-500" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-900">توضیحات</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-xs outline-none focus:border-petrol-500" />
          </div>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500 disabled:opacity-50">
            <Send className="size-4" /> {loading ? "در حال ارسال..." : "ثبت درخواست"}
          </button>
        </form>
      </div>
    </div>
  );
}
