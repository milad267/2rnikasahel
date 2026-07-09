"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, EyeOff, Eye, Save, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/ImageUpload";

type Slide = { id: number; title: string | null; subtitle: string | null; desktopImage: string | null; mobileImage: string | null; buttonText: string | null; buttonLink: string | null; sortOrder: number; isActive: boolean; };

export default function SliderPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", description: "", desktopImage: "", mobileImage: "", buttonText: "", buttonLink: "", sortOrder: 0, isActive: true, openInNewTab: false });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); fetch("/api/admin/slides").then(r => r.json()).then(d => setSlides(d.data || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/admin/slides", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editingId }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      toast.success(editingId ? "اسلاید ویرایش شد ✓" : "اسلاید ساخته شد ✓");
      setShowModal(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function toggleActive(id: number, current: boolean) {
    await fetch("/api/admin/slides", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !current }) });
    setSlides(slides.map(s => s.id === id ? { ...s, isActive: !current } : s));
    toast.success(!current ? "فعال شد" : "غیرفعال شد");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-slate-900">مدیریت اسلایدر</h1><p className="mt-1 text-sm text-slate-500">{slides.length} اسلاید موجود</p></div>
        <button onClick={() => { setEditingId(null); setForm({ title: "", subtitle: "", description: "", desktopImage: "", mobileImage: "", buttonText: "", buttonLink: "", sortOrder: slides.length, isActive: true, openInNewTab: false }); setShowModal(true); }} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800">
          <Plus className="size-4" /> اسلاید جدید
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-slate-400">
          <p className="text-sm">هیچ اسلایدی وجود ندارد</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((s, i) => (
            <div key={s.id} className={`group relative overflow-hidden rounded-xl border ${s.isActive ? "border-slate-200" : "border-red-200"} bg-white shadow-sm`}>
              <div className="aspect-[16/9] bg-slate-100">
                {s.desktopImage ? <img src={s.desktopImage} className="size-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300 text-xs">بدون تصویر</div>}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{s.title || "بدون عنوان"}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">ترتیب {s.sortOrder}</span>
                </div>
                {s.subtitle && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.subtitle}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => toggleActive(s.id, s.isActive)} className={`rounded-lg p-1.5 ${s.isActive ? "text-green-600 hover:bg-green-50" : "text-red-500 hover:bg-red-50"}`}>
                    {s.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button onClick={() => { setEditingId(s.id); setForm({ ...form, title: s.title || "", subtitle: s.subtitle || "", desktopImage: s.desktopImage || "", mobileImage: s.mobileImage || "", buttonText: s.buttonText || "", buttonLink: s.buttonLink || "", sortOrder: s.sortOrder, isActive: s.isActive }); setShowModal(true); }} className="rounded-lg p-1.5 text-slate-400 hover:text-petrol-600"><Edit className="size-4" /></button>
                  <button onClick={async () => { if (!confirm("حذف؟")) return; await fetch(`/api/admin/slides?id=${s.id}`, { method: "DELETE" }); toast.success("حذف شد"); load(); }} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>

          <div className="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? "ویرایش اسلاید" : "اسلاید جدید"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto modal-scroll p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان اصلی</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">زیرعنوان</label><input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">متن دکمه</label><input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">لینک دکمه</label><input value={form.buttonLink} onChange={e => setForm(f => ({ ...f, buttonLink: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" dir="ltr" placeholder="/" /></div>
              </div>
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">تصویر دسکتاپ (1600×600)</label><ImageUpload value={form.desktopImage} onChange={v => setForm(f => ({ ...f, desktopImage: v as string }))} /></div>
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">تصویر موبایل (اختیاری 800×800)</label><ImageUpload value={form.mobileImage} onChange={v => setForm(f => ({ ...f, mobileImage: v as string }))} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">ترتیب نمایش</label><input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="size-4 accent-petrol-600" /> فعال</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.openInNewTab} onChange={e => setForm(f => ({ ...f, openInNewTab: e.target.checked }))} className="size-4 accent-petrol-600" /> تب جدید</label>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600">انصراف</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50">
                <Save className="size-4" /> {saving ? "در حال ذخیره..." : editingId ? "ذخیره" : "ایجاد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
