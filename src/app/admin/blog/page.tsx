"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, Save, Sparkles, Loader2, X, FileText as FileTextIcon, Image as ImageIcon, Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { RichEditor } from "@/components/admin/RichEditor";
import { AiAssistBar } from "@/components/admin/AiAssistBar";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Modal } from "@/components/admin/Modal";


type Post = { id: number; title: string; slug: string; status: string; featuredImage: string | null; views: number; publishedAt: string | null; createdAt: string; categoryName: string | null; };
type Cat = { id: number; name: string; slug: string; };

const EMPTY_FORM = { title: "", slug: "", excerpt: "", content: "", featuredImage: "", categoryId: 0, status: "draft", metaTitle: "", metaDesc: "", tags: "", allowComments: true };

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [aiMetaLoading, setAiMetaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "media" | "seo">("content");

  const TABS = [
    { key: "content" as const, label: "محتوا", icon: FileTextIcon },
    { key: "media" as const, label: "رسانه و دسته‌بندی", icon: ImageIcon },
    { key: "seo" as const, label: "برچسب و سئو", icon: TagIcon },
  ];

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/blog").then(r => r.json()),
      fetch("/api/admin/blog-categories").then(r => r.json()),
    ]).then(([bd, cd]) => { setPosts(bd.data || []); setCats(cd.data || []); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = posts.filter(p => (!statusFilter || p.status === statusFilter) && (!search || p.title.includes(search)));

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setActiveTab("content");
    setShowModal(true);
  }

  // بارگذاری کامل پست برای ویرایش
  async function openEdit(id: number) {
    setEditingId(id);
    setActiveTab("content");
    setShowModal(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`);
      const d = await res.json();
      const p = d.data || d.post || d;
      setForm({
        title: p.title || "",
        slug: p.slug || "",
        excerpt: p.excerpt || "",
        content: p.content || "",
        featuredImage: p.featuredImage || "",
        categoryId: p.categoryId || 0,
        status: p.status || "draft",
        metaTitle: p.metaTitle || "",
        metaDesc: p.metaDesc || "",
        tags: Array.isArray(p.tags) ? p.tags.join("، ") : (p.tags || ""),
        allowComments: p.allowComments ?? true,
      });
    } catch { toast.error("خطا در بارگذاری پست"); }
  }

  // تولید تگ با هوش مصنوعی (مثل پاپ‌آپ محصول)
  async function generateAiTags() {
    if (!form.title && !form.content) { toast.error("ابتدا عنوان یا متن پست را وارد کنید"); return; }
    setAiTagsLoading(true);
    try {
      const res = await fetch("/api/admin/ai/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tags", productName: form.title, text: form.content || form.excerpt }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error || "خطا"); return; }
      const names: string[] = data.tags || [];
      const existing = form.tags ? form.tags.split(/[،,]/).map(s => s.trim()).filter(Boolean) : [];
      const merged = Array.from(new Set([...existing, ...names]));
      setForm(f => ({ ...f, tags: merged.join("، ") }));
      toast.success(`✨ ${names.length} تگ با هوش مصنوعی اضافه شد`);
    } catch { toast.error("خطا در ارتباط با سرور"); }
    finally { setAiTagsLoading(false); }
  }

  // تولید خودکار عنوان و توضیحات سئو با AI
  async function generateAiMeta() {
    if (!form.title && !form.content) { toast.error("ابتدا عنوان یا متن پست را وارد کنید"); return; }
    setAiMetaLoading(true);
    try {
      const res = await fetch("/api/admin/ai/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seo", productName: form.title, text: form.content || form.excerpt }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error || "خطا"); return; }
      // خروجی سئو ممکن است HTML یا متن باشد؛ پاک‌سازی و تقسیم
      const clean = String(data.result || data.metaDesc || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      setForm(f => ({
        ...f,
        metaTitle: f.metaTitle || (f.title ? f.title.slice(0, 60) : clean.slice(0, 60)),
        metaDesc: clean.slice(0, 160),
      }));
      toast.success("✨ عنوان و توضیحات سئو ساخته شد");
    } catch { toast.error("خطا در ارتباط با سرور"); }
    finally { setAiMetaLoading(false); }
  }

  async function handleSave() {
    if (!form.title) { toast.error("عنوان الزامی است"); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/blog/${editingId}` : "/api/admin/blog";
      const payload = { ...form, tags: form.tags.split(/[،,]/).map(s => s.trim()).filter(Boolean) };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      toast.success(editingId ? "پست ویرایش شد ✓" : "پست ساخته شد ✓");
      setShowModal(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  const tagList = form.tags ? form.tags.split(/[،,]/).map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-slate-900">مدیریت بلاگ</h1><p className="mt-1 text-sm text-slate-500">{posts.length} مقاله موجود</p></div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800">
          <Plus className="size-4" /> پست جدید
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="size-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در عنوان یا محتوا..." className="flex-1 bg-transparent text-xs outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none">
          <option value="">همه وضعیت‌ها</option>
          <option value="published">منتشر شده</option>
          <option value="draft">پیش‌نویس</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-right font-semibold text-slate-600">عنوان</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">دسته</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">بازدید</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">عملیات</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{p.featuredImage ? <img src={p.featuredImage} className="size-full rounded-xl object-cover" /> : <FileText className="size-5" />}</div>
                    <div><p className="text-sm font-semibold text-slate-900">{p.title}</p><p className="text-[10px] text-slate-500">/{p.slug}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.categoryName || "—"}</td>
                <td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{p.status === "published" ? "منتشر شده" : "پیش‌نویس"}</span></td>
                <td className="px-4 py-3 text-center text-slate-500">{p.views}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Link href={`/blog/${p.slug}`} target="_blank" className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600"><Eye className="size-4" /></Link>
                    <button onClick={() => openEdit(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-petrol-600"><Edit className="size-4" /></button>
                    <button onClick={async () => { if (!confirm("حذف؟")) return; await fetch(`/api/admin/blog/${p.id}`, { method: "DELETE" }); toast.success("حذف شد"); load(); }} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">پستی یافت نشد.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "ویرایش پست" : "پست جدید"}
        size="4xl"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600">انصراف</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50">
              <Save className="size-4" /> {saving ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "انتشار"}
            </button>
          </>
        }
      >
        <div>
          {/* نوار تب‌ها — مشابه پاپ‌آپ محصول */}
          <div className="mb-5 flex items-center gap-1 border-b border-slate-200">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-petrol-600 text-petrol-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* تب ۱: محتوا */}
          <div className={activeTab === "content" ? "space-y-5" : "hidden"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase() }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Slug (آدرس پست)</label><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" dir="ltr" /><p className="mt-1 text-[10px] text-slate-400">آدرس لینک پست در مرورگر</p></div>
            </div>

            {/* خلاصه — با ویرایشگر متن کامل + دستیار AI */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">خلاصه پست</label>
                <AiAssistBar productName={form.title} text={form.excerpt} short onResult={(html) => setForm(f => ({ ...f, excerpt: html }))} />
              </div>
              <RichEditor content={form.excerpt} onChange={(html) => setForm(f => ({ ...f, excerpt: html }))} minHeight={120} />
            </div>

            {/* متن کامل + دستیار AI */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">متن کامل پست</label>
                <AiAssistBar productName={form.title} text={form.content} onResult={(html) => setForm(f => ({ ...f, content: html }))} />
              </div>
              <RichEditor content={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} minHeight={400} />
            </div>
          </div>

          {/* تب ۲: رسانه و دسته‌بندی */}
          <div className={activeTab === "media" ? "space-y-5" : "hidden"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">دسته‌بندی</label>
                <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                  <option value={0}>بدون دسته</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">وضعیت</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                  <option value="draft">پیش‌نویس</option>
                  <option value="published">منتشر شده</option>
                </select></div>
            </div>

            <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">تصویر شاخص</label><ImageUpload value={form.featuredImage} onChange={v => setForm(f => ({ ...f, featuredImage: v as string }))} /></div>

            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.allowComments} onChange={e => setForm(f => ({ ...f, allowComments: e.target.checked }))} className="size-4 accent-petrol-600" /> امکان ثبت دیدگاه (کامنت)</label>
          </div>

          {/* تب ۳: برچسب و سئو */}
          <div className={activeTab === "seo" ? "space-y-5" : "hidden"}>
            {/* تگ‌ها + تولید با AI */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">برچسب‌ها (تگ)</label>
                <button type="button" onClick={generateAiTags} disabled={aiTagsLoading}
                  className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/60 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                  {aiTagsLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} تولید تگ با AI
                </button>
              </div>
              {tagList.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {tagList.map((t, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-petrol-100 px-2.5 py-1 text-[10px] font-medium text-petrol-700">
                      {t}
                      <button type="button" onClick={() => setForm(f => ({ ...f, tags: tagList.filter((_, j) => j !== i).join("، ") }))}><X className="size-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="تگ‌ها را با ویرگول جدا کنید یا با AI بسازید..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
            </div>

            {/* سئو — با برچسب فارسی + تولید با AI */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">تنظیمات سئو (بهینه‌سازی موتور جستجو)</p>
                <button type="button" onClick={generateAiMeta} disabled={aiMetaLoading}
                  className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/60 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                  {aiMetaLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} ساخت سئو با AI
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان سئو (Meta Title)</label>
                  <input value={form.metaTitle} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} maxLength={70} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" placeholder="عنوانی که در نتایج گوگل نمایش داده می‌شود" />
                  <p className="mt-1 text-[10px] text-slate-400">{form.metaTitle.length}/۷۰ کاراکتر</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">توضیحات سئو (Meta Description)</label>
                  <textarea value={form.metaDesc} onChange={e => setForm(f => ({ ...f, metaDesc: e.target.value }))} rows={2} maxLength={160} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" placeholder="خلاصه‌ای که زیر عنوان در نتایج گوگل می‌آید" />
                  <p className="mt-1 text-[10px] text-slate-400">{form.metaDesc.length}/۱۶۰ کاراکتر</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FileText({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
