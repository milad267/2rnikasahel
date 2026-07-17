"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare, ThumbsUp, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Review = {
  id: number; rating: number; title: string; comment: string;
  userName: string; createdAt: string;
};

export function ProductReviews({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: "", comment: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/products/reviews?id=${productId}`)
      .then(r => r.json()).then(d => { if (d.ok) setReviews(d.reviews || []); })
      .finally(() => setLoading(false));
  }, [productId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/products/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...form }),
      });
      const d = await res.json();
      if (d.ok) { setReviews(prev => [d.review, ...prev]); setShowForm(false); setForm({ rating: 5, title: "", comment: "" }); }
    } finally { setSaving(false); }
  }

  const avgRating = reviews.length ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <MessageSquare className="size-4 text-petrol-600" strokeWidth={1.6} />
          نظرات کاربران ({reviews.length})
        </h3>
        {avgRating > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
            <Star className="size-4 text-amber-500 fill-amber-500" strokeWidth={1.5} />
            {avgRating} از ۵
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowForm(!showForm)}
        className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-white hover:bg-petrol-500">
        {showForm ? "انصراف" : "ثبت نظر"}
      </button>

      {showForm && (
        <form onSubmit={submitReview} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => (
              <button key={i} type="button" onClick={() => setForm(f => ({ ...f, rating: i }))}>
                <Star className={cn("size-5 transition-colors", i <= form.rating ? "text-amber-500 fill-amber-500" : "text-slate-300")} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان نظر (اختیاری)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-400" />
          <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} rows={3} required
            placeholder="نظر خود را بنویسید..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-400 leading-6" />
          <button type="submit" disabled={saving || !form.comment.trim()}
            className="rounded-xl bg-petrol-600 px-4 py-2 text-xs font-semibold text-white hover:bg-petrol-500 disabled:opacity-50">
            {saving ? "..." : "ثبت نظر"}
          </button>
        </form>
      )}

      {loading && <p className="text-xs text-slate-400 text-center py-4">در حال بارگذاری...</p>}
      {!loading && reviews.length === 0 && !showForm && (
        <p className="text-xs text-slate-400 text-center py-4">هنوز نظری ثبت نشده است. اولین نفر باشید!</p>
      )}
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="rounded-xl border border-slate-100 p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <User className="size-3 text-slate-400" strokeWidth={1.5} />
                <span className="text-[10px] font-medium text-slate-600">{r.userName}</span>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={cn("size-3", i <= r.rating ? "text-amber-500 fill-amber-500" : "text-slate-200")} strokeWidth={1.5} />
                ))}
              </div>
            </div>
            {r.title && <p className="text-xs font-bold text-slate-800 mb-0.5">{r.title}</p>}
            <p className="text-[11px] leading-6 text-slate-600">{r.comment}</p>
            <p className="mt-1 text-[9px] text-slate-400 flex items-center gap-1">
              <Calendar className="size-2.5" strokeWidth={1.5} />{new Date(r.createdAt).toLocaleDateString("fa-IR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
