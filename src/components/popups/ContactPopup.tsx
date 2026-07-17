"use client";

import { useEffect, useState } from "react";
import { X, Send, Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ContactPopup({ open, onClose }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // قفل اسکرول بدنه وقتی پاپ‌آپ باز است
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error("نام و پیام الزامی است.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) { setSent(true); toast.success("✅ پیام شما ارسال شد"); }
      else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در ارسال"); }
    setLoading(false);
  }

  function reset() { setForm({ name: "", phone: "", email: "", subject: "", message: "" }); setSent(false); }
  function handleClose() { reset(); onClose(); }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="relative w-full max-w-lg max-h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* هدر */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">تماس با ما</h2>
          <button onClick={handleClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        {/* محتوای اسکرول‌شونده */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:[display:none]">

        {sent ? (
          <div className="flex flex-col items-center gap-3 pt-4 pb-6 text-center">
            <CheckCircle2 className="size-12 text-emerald-500" strokeWidth={1.4} />
            <p className="text-lg font-bold text-slate-900">پیام شما با موفقیت ارسال شد</p>
            <p className="text-xs text-slate-500">کارشناسان ما در اسرع وقت پاسخ می‌دهند.</p>
            <button onClick={handleClose} className="mt-4 rounded-full bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white">
              بستن
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* اطلاعات تماس */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-petrol-600" strokeWidth={1.7} /> ۰۲۱-۱۲۳۴۵۶۷۸</span>
              <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-petrol-600" strokeWidth={1.7} /> info@dornika.co</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-petrol-600" strokeWidth={1.7} /> تهران، ایران</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">نام *</label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">شماره تماس</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" dir="ltr" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">ایمیل</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" dir="ltr" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">موضوع</label>
                <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">پیام *</label>
              <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
            </div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-petrol-500 disabled:opacity-50">
              <Send className="size-4" /> {loading ? "در حال ارسال..." : "ارسال پیام"}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
