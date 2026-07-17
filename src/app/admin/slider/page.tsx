"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, EyeOff, Eye, Save, X, Sparkles, Wand2, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/ImageUpload";

type Slide = {
  id: number;
  badge: string | null;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  cta2Text: string | null;
  cta2Href: string | null;
  accentColor: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
};

const ACCENT_COLORS = [
  { label: "فیروزه‌ای", color: "#196374" },
  { label: "آبی نفتی", color: "#124e5c" },
  { label: "سبز", color: "#2d7d46" },
  { label: "بنفش", color: "#6d28d9" },
  { label: "نارنجی", color: "#c2410c" },
  { label: "زرشکی", color: "#b91c1c" },
  { label: "صورتی", color: "#be185d" },
  { label: "طلایی", color: "#a16207" },
];

export default function SliderPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    badge: "", title: "", subtitle: "",
    ctaText: "", ctaHref: "", cta2Text: "", cta2Href: "",
    accentColor: "", image: "",
    sortOrder: 0, isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModal, setAiModal] = useState(false);

  const load = () => { setLoading(true); fetch("/api/admin/landing-slides").then(r => r.json()).then(d => setSlides(d.data || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  // قفل اسکرول بدنه وقتی هرکدام از مودال‌ها باز است
  useEffect(() => {
    const isOpen = showModal || aiModal;
    if (isOpen) {
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
  }, [showModal, aiModal]);

  async function handleSave() {
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/admin/landing-slides", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editingId }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      toast.success(editingId ? "اسلاید ویرایش شد ✓" : "اسلاید ساخته شد ✓");
      setShowModal(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function toggleActive(id: number, current: boolean) {
    await fetch("/api/admin/landing-slides", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !current }) });
    setSlides(slides.map(s => s.id === id ? { ...s, isActive: !current } : s));
    toast.success(!current ? "✅ فعال شد" : "⛔ غیرفعال شد");
  }

  async function toggleAllActive(active: boolean) {
    await Promise.all(slides.map(s => fetch("/api/admin/landing-slides", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, isActive: active }) })));
    setSlides(slides.map(s => ({ ...s, isActive: active })));
    toast.success(active ? "✅ همه فعال شدند" : "⛔ همه غیرفعال شدند");
  }

  async function generateWithAI() {
    if (!aiPrompt.trim()) { toast.error("لطفاً توضیح دهید چه نوع اسلایدهایی می‌خواهید"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `یک اسلاید برای اسلایدر صفحه اصلی فروشگاه صنعتی بر اساس این توضیحات بساز: "${aiPrompt}"

لطفاً فقط یک JSON معتبر برگردون با این ساختار:
{
  "badge": "برچسب کوتاه (مثلاً 'تخفیف ویژه' یا 'جدید')",
  "title": "عنوان اصلی اسلاید",
  "subtitle": "زیرعنوان",
  "ctaText": "متن دکمه اول",
  "ctaHref": "/shop",
  "cta2Text": "متن دکمه دوم (اختیاری)",
  "cta2Href": "/finder",
  "accentColor": "#196374"
}

هیچ متن اضافه‌ای غیر از JSON ننویس.`,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      const reply = data.response || data.reply || "";
      // استخراج JSON از پاسخ
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setForm(f => ({ ...f,
          badge: parsed.badge || "", title: parsed.title || "", subtitle: parsed.subtitle || "",
          ctaText: parsed.ctaText || "مشاهده", ctaHref: parsed.ctaHref || "/shop",
          cta2Text: parsed.cta2Text || "", cta2Href: parsed.cta2Href || "",
          accentColor: parsed.accentColor || "#196374",
        }));
        setShowModal(true);
        setAiModal(false);
        toast.success("✅ اسلاید با هوش مصنوعی ساخته شد");
      } else {
        toast.error("خطا در پردازش پاسخ هوش مصنوعی");
      }
    } catch (e: any) { toast.error(e.message || "خطا"); }
    setAiLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <ImageIcon className="size-6 text-petrol-600" strokeWidth={1.6} />
            مدیریت اسلایدر
          </h1>
          <p className="mt-1 text-sm text-slate-500">{slides.length} اسلاید · {slides.filter(s => s.isActive).length} فعال</p>
        </div>
        <div className="flex items-center gap-2">
          {/* دکمه هوش مصنوعی */}
          <button onClick={() => setAiModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90">
            <Sparkles className="size-4" /> ساخت با هوش مصنوعی
          </button>
          {/* دکمه اسلاید جدید */}
          <button onClick={() => { setEditingId(null); setForm({ badge: "", title: "", subtitle: "", ctaText: "", ctaHref: "", cta2Text: "", cta2Href: "", accentColor: "", image: "", sortOrder: slides.length, isActive: true }); setShowModal(true); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800">
            <Plus className="size-4" /> اسلاید جدید
          </button>
        </div>
      </div>

      {/* عملیات批量 */}
      {slides.length > 0 && (
        <div className="flex items-center gap-2">
          <button onClick={() => toggleAllActive(true)} className="rounded-lg bg-green-50 px-3 py-1.5 text-[10px] font-medium text-green-700 hover:bg-green-100">فعال‌سازی همه</button>
          <button onClick={() => toggleAllActive(false)} className="rounded-lg bg-red-50 px-3 py-1.5 text-[10px] font-medium text-red-600 hover:bg-red-100">غیرفعال‌سازی همه</button>
        </div>
      )}

      {/* لیست اسلایدها */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-slate-400">
          <ImageIcon className="size-10 mb-3 opacity-40" strokeWidth={1.2} />
          <p className="text-sm">هیچ اسلایدی وجود ندارد</p>
          <p className="mt-1 text-xs">با دکمه "ساخت با هوش مصنوعی" یا "اسلاید جدید" اولین اسلاید را بسازید</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((s) => (
            <div key={s.id} className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${s.isActive ? "border-slate-200" : "border-red-200 opacity-70"}`}>
              {/* تصویر */}
              <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-50 relative">
                {s.image ? (
                  <img src={s.image} alt={s.title || "اسلاید"} className="size-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300"><ImageIcon className="size-8" strokeWidth={1.2} /></div>
                )}
                {/* اوورلی */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {/* نشان‌گرهای بالای تصویر */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[9px] text-white">#{s.sortOrder}</span>
                  {s.badge && (
                    <span className="rounded-full px-2 py-0.5 text-[9px] text-white"
                      style={{ backgroundColor: s.accentColor || "#196374" }}>
                      {s.badge}
                    </span>
                  )}
                </div>
                <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {s.isActive ? "فعال" : "غیرفعال"}
                </span>
                {/* متن روی تصویر */}
                {s.title && (
                  <div className="absolute bottom-3 right-3 left-3">
                    <p className="text-sm font-bold text-white line-clamp-1 drop-shadow-lg">{s.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {s.ctaText && (
                        <span className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-white"
                          style={{ backgroundColor: s.accentColor || "#196374" }}>
                          {s.ctaText}
                        </span>
                      )}
                      {s.cta2Text && (
                        <span className="rounded-full border border-white/50 px-2.5 py-1 text-[9px] font-semibold text-white/80">
                          {s.cta2Text}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* اطلاعات */}
              <div className="p-4">
                <p className="text-sm font-bold text-slate-900 line-clamp-1">{s.title || "بدون عنوان"}</p>
                {s.subtitle && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{s.subtitle}</p>}
                {s.accentColor && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="size-3 rounded-full" style={{ backgroundColor: s.accentColor }} />
                    <span className="text-[9px] text-slate-400">{s.accentColor}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(s.id, s.isActive)} className={`rounded-lg p-1.5 ${s.isActive ? "text-green-600 hover:bg-green-50" : "text-red-500 hover:bg-red-50"}`} title={s.isActive ? "غیرفعال" : "فعال"}>
                      {s.isActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                    <button onClick={() => { setEditingId(s.id); setForm({ badge: s.badge || "", title: s.title || "", subtitle: s.subtitle || "", ctaText: s.ctaText || "", ctaHref: s.ctaHref || "/shop", cta2Text: s.cta2Text || "", cta2Href: s.cta2Href || "", accentColor: s.accentColor || "", image: s.image || "", sortOrder: s.sortOrder, isActive: s.isActive }); setShowModal(true); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"><Edit className="size-3.5" /></button>
                    <button onClick={async () => { if (!confirm("حذف شود؟")) return; await fetch(`/api/admin/landing-slides?id=${s.id}`, { method: "DELETE" }); toast.success("حذف شد"); load(); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال هوش مصنوعی */}
      {aiModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAiModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Sparkles className="size-5 text-purple-600" /> ساخت اسلاید با هوش مصنوعی</h2>
              <button onClick={() => setAiModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <p className="mb-3 text-xs text-slate-500">توضیح دهید چه اسلایدی می‌خواهید، هوش مصنوعی آن را می‌سازد.</p>
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-500"
              placeholder="مثال: یک اسلاید درباره پمپ‌های صنعتی با تخفیف ویژه..." />
            <div className="mt-4 flex items-center gap-3">
              <button onClick={generateWithAI} disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {aiLoading ? "در حال ساخت..." : "ساخت اسلاید"}
              </button>
              <button onClick={() => setAiModal(false)} className="text-xs text-slate-500 hover:text-slate-700">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال افزودن/ویرایش */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                {editingId ? "ویرایش اسلاید" : "اسلاید جدید"}
                {!editingId && form.title && <span className="text-xs font-normal text-slate-400">(تولید شده با AI)</span>}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto modal-scroll p-6 space-y-4">
              {/* ردیف ۱: برچسب و عنوان */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">برچسب (badge)</label>
                  <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20" placeholder="مثلاً تخفیف ویژه" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان اصلی</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20" placeholder="متن عنوان اسلاید" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">زیرعنوان</label>
                  <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20" placeholder="متن زیرعنوان" />
                </div>
              </div>

              {/* ردیف ۲: دکمه‌های CTA */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">دکمه اول</p>
                  <div className="grid gap-3">
                    <input value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20" placeholder="متن دکمه (مثلاً مشاهده)" />
                    <input value={form.ctaHref} onChange={e => setForm(f => ({ ...f, ctaHref: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20 ltr" placeholder="/shop" />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">دکمه دوم (اختیاری)</p>
                  <div className="grid gap-3">
                    <input value={form.cta2Text} onChange={e => setForm(f => ({ ...f, cta2Text: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20" placeholder="متن دکمه دوم" />
                    <input value={form.cta2Href} onChange={e => setForm(f => ({ ...f, cta2Href: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20 ltr" placeholder="/finder" />
                  </div>
                </div>
              </div>

              {/* ردیف ۳: رنگ آکسان و ترتیب */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">رنگ اصلی (accent color)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {ACCENT_COLORS.map(c => (
                      <button key={c.color} type="button" onClick={() => setForm(f => ({ ...f, accentColor: c.color }))}
                        className={cn("size-8 rounded-lg border-2 transition-all", form.accentColor === c.color ? "border-slate-900 scale-110 shadow-md" : "border-transparent hover:scale-105")}
                        style={{ backgroundColor: c.color }} title={c.label} />
                    ))}
                    <button onClick={() => setForm(f => ({ ...f, accentColor: "" }))}
                      className="size-8 rounded-lg border-2 border-dashed border-slate-300 text-[9px] text-slate-400 hover:border-red-400 hover:text-red-500">
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.accentColor || "#196374"} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                      className="size-9 cursor-pointer rounded-lg border border-slate-200 p-0.5" />
                    <input value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20 ltr" placeholder="#196374" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">ترتیب نمایش</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500/20" />
                </div>
              </div>

              {/* تصویر اسلاید */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">تصویر اسلاید</label>
                <ImageUpload value={form.image} onChange={v => setForm(f => ({ ...f, image: v as string }))} category="slide" sizeHint="📐 ۱۹۲۰×۱۰۸۰px · JPG/PNG/WebP · تصویر زمینه اسلاید" />
              </div>

              {/* چک‌باکس */}
              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="size-4 accent-petrol-600" />
                  اسلاید فعال
                </label>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600">انصراف</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50">
                <Save className="size-4" /> {saving ? "..." : editingId ? "ذخیره" : "ایجاد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
