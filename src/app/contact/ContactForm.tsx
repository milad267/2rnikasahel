"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";

export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.message.trim()) {
      setError("نام و پیام الزامی است.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "خطا");
      setDone(true);
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
      setTimeout(() => setDone(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ارسال پیام");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-navy-900/12 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-all placeholder-charcoal-400 focus:border-petrol-500 focus:ring-2 focus:ring-petrol-500/20";

  return (
    <form onSubmit={submit} className="card space-y-4 rounded-[1.75rem] p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-navy-700">نام و نام خانوادگی *</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="نام شما" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-navy-700">شماره تماس</label>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-navy-700">ایمیل</label>
          <input value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="you@example.com" dir="ltr" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-navy-700">موضوع</label>
          <input value={form.subject} onChange={(e) => update("subject", e.target.value)} className={inputClass} placeholder="موضوع پیام" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-navy-700">پیام *</label>
        <textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={5} className={inputClass} placeholder="پیام خود را بنویسید…" />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-bold transition-all disabled:opacity-50 ${
          done ? "bg-green-600 text-pearl-50" : "bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500"
        }`}
      >
        {done ? (
          <><Check className="size-5" strokeWidth={2} /> پیام شما ثبت شد</>
        ) : pending ? (
          "در حال ارسال…"
        ) : (
          <><Send className="size-5" strokeWidth={1.8} /> ارسال پیام</>
        )}
      </button>
    </form>
  );
}
