"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Upload, X, Save, Box, Wand2, Sparkles, Loader2, Star, Info, DollarSign, FileText, Images } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/admin/RichEditor";
import { AiAssistBar } from "@/components/admin/AiAssistBar";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { validateProduct } from "@/lib/product-validation";

type Product = { id: number; title: string; slug: string; isActive: boolean; categoryTitle: string | null; coverImage: string | null; categoryId: number | null; };
type Category = { id: number; title: string; slug: string; parentId: number | null; children?: Category[]; };
type Brand = { id: number; name: string; slug: string; };
type Tag = { id: number; name: string; slug: string; };

type TabKey = "basic" | "price" | "desc" | "media";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "basic", label: "اطلاعات پایه", icon: Info },
  { key: "price", label: "قیمت و موجودی", icon: DollarSign },
  { key: "desc", label: "توضیحات", icon: FileText },
  { key: "media", label: "تصاویر", icon: Images },
];

// تبدیل رشته قیمت با کاما به عدد
const toNum = (s: string) => Number(String(s).replace(/[^0-9]/g, "")) || 0;
const withCommas = (s: string) => s.replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("basic");
  const [aiTagsLoading, setAiTagsLoading] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", sku: "", brandId: 0,
    shortDesc: "", fullDesc: "",
    price: "", stock: "", unitId: 0,
    categoryId: 0, tagIds: [] as number[],
    coverImage: "", images: [] as string[],
    isFeatured: false, isActive: true, sortOrder: 0,
    hasDiscount: false, discountType: "percent" as "percent" | "amount", discountValue: "",
  });
  const [newBrand, setNewBrand] = useState("");
  const [newTag, setNewTag] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/products").then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
      fetch("/api/admin/brands").then(r => r.json()),
      fetch("/api/admin/tags").then(r => r.json()),
    ]).then(([prods, cats, brs, tgs]) => {
      setProducts(prods.data || prods);
      setCategories(toTree(cats));
      setBrands(brs.data || brs);
      setTags(tgs.data || tgs);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => p.title.includes(search) || p.slug.includes(search));

  // slug بر اساس کد محصول (SKU) ساخته می‌شود، نه نام
  function skuToSlug(sku: string) {
    return sku.trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  }

  // قیمت نهایی بعد از تخفیف
  function finalPrice() {
    const base = toNum(form.price);
    if (!form.hasDiscount || !form.discountValue) return base;
    const val = toNum(form.discountValue);
    if (form.discountType === "percent") return Math.max(0, Math.round(base - (base * val) / 100));
    return Math.max(0, base - val);
  }

  function resetForm() {
    setForm({ title: "", slug: "", sku: "", brandId: 0, shortDesc: "", fullDesc: "", price: "", stock: "", unitId: 0, categoryId: 0, tagIds: [], coverImage: "", images: [], isFeatured: false, isActive: true, sortOrder: 0, hasDiscount: false, discountType: "percent", discountValue: "" });
    setTab("basic");
  }

  async function generateSku() {
    const rnd = "DS-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    setForm(f => ({ ...f, sku: rnd, slug: f.slug || skuToSlug(rnd) }));
  }

  // تولید خودکار تگ با هوش مصنوعی
  async function generateAiTags() {
    if (!form.title && !form.fullDesc) { toast.error("ابتدا نام یا توضیحات محصول را وارد کنید"); return; }
    setAiTagsLoading(true);
    try {
      const res = await fetch("/api/admin/ai/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tags", productName: form.title, text: form.fullDesc || form.shortDesc }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error || "خطا"); return; }
      const names: string[] = data.tags || [];
      const newIds: number[] = [];
      for (const name of names) {
        const existing = tags.find(t => t.name === name);
        if (existing) { newIds.push(existing.id); continue; }
        const r = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        const d = await r.json();
        if (d.ok && d.tag) { setTags(prev => [...prev, d.tag]); newIds.push(d.tag.id); }
      }
      setForm(f => ({ ...f, tagIds: Array.from(new Set([...f.tagIds, ...newIds])) }));
      toast.success(`✨ ${newIds.length} تگ با هوش مصنوعی اضافه شد`);
    } catch { toast.error("خطا در ارتباط با سرور"); }
    finally { setAiTagsLoading(false); }
  }

  async function handleSave() {
    const payload = { ...form, price: String(toNum(form.price)), discountPrice: String(finalPrice()) };
    const validation = validateProduct(payload as any);
    if (!validation.valid) { toast.error(validation.error); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(`/api/admin/products${editingId ? `/${editingId}` : ""}`, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "خطا");
      toast.success(editingId ? "محصول ویرایش شد ✓" : "محصول ساخته شد ✓");
      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این محصول مطمئن هستید؟")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) { toast.success("محصول حذف شد"); load(); }
    else toast.error(data.error);
  }

  // ادغام شاخص و گالری: همه تصاویر یکجا، یکی به‌عنوان شاخص
  const allImages = Array.from(new Set([form.coverImage, ...form.images].filter(Boolean))) as string[];
  function setImages(imgs: string[]) {
    const cover = imgs.includes(form.coverImage) ? form.coverImage : (imgs[0] || "");
    setForm(f => ({ ...f, images: imgs, coverImage: cover }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">مدیریت محصولات</h1>
          <p className="mt-1 text-sm text-slate-500">{products.length} محصول موجود</p>
        </div>
        <button onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800">
          <Plus className="size-4" /> محصول جدید
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="size-4 text-slate-400" strokeWidth={1.5} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..." className="flex-1 bg-transparent text-xs text-slate-800 outline-none" />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Upload className="size-4" /> آپدیت قیمت (اکسل)
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-right font-semibold text-slate-600">محصول</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">دسته</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        {p.coverImage ? <img src={p.coverImage} className="size-full rounded-xl object-cover" /> : <Box className="size-5" />}
                      </div>
                      <div><p className="text-sm font-semibold text-slate-900">{p.title}</p><p className="text-[10px] text-slate-500">/{p.slug}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.categoryTitle || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{p.isActive ? "فعال" : "غیرفعال"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditingId(p.id); setShowModal(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"><Edit className="size-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">محصولی یافت نشد.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal محصول */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>

          <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-white rounded-t-2xl px-6 pt-5 pb-0 border-b border-slate-100">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? `ویرایش: ${form.title}` : "محصول جدید"}</h2>
                <button onClick={() => setShowModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
              </div>
              {/* تب‌ها */}
              <div className="flex items-center gap-1 -mb-px">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
                      tab === key ? "border-petrol-600 text-petrol-700" : "border-transparent text-slate-400 hover:text-slate-600")}>
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 modal-scroll" onWheel={(e) => e.stopPropagation()}>

              {/* ─── تب اطلاعات پایه ─── */}
              {tab === "basic" && (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="نام محصول" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">کد محصول (SKU)</label>
                      <div className="flex gap-1.5">
                        <input value={form.sku} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, sku: v, slug: skuToSlug(v) })); }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" dir="ltr" />
                        <button onClick={generateSku} className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100" title="تولید خودکار کد">تولید</button>
                      </div>
                    </div>
                    <Field label="Slug (آدرس محصول)" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} subtitle="بر اساس کد محصول ساخته می‌شود؛ آدرس لینک در فروشگاه" ltr />
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">برند</label>
                      <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                        <option value={0}>بدون برند</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <div className="mt-1 flex gap-1">
                        <input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="برند جدید..." className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] outline-none" />
                        <button onClick={async () => { if (!newBrand) return; const r = await fetch("/api/admin/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newBrand }) }); const d = await r.json(); if (d.ok) { setBrands([...brands, d.brand]); setNewBrand(""); } }} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-white">افزودن</button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">دسته‌بندی</label>
                      <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                        <option value={0}>بدون دسته</option>
                        {renderCatOptions(categories, 0)}
                      </select>
                    </div>
                  </div>

                  {/* تگ‌ها + تولید هوش مصنوعی */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">تگ‌ها</label>
                      <button onClick={generateAiTags} disabled={aiTagsLoading}
                        className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/60 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                        {aiTagsLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} تولید تگ با AI
                      </button>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {form.tagIds.map(id => {
                        const t = tags.find(t => t.id === id);
                        return t ? <span key={id} className="flex items-center gap-1 rounded-full bg-petrol-100 px-2.5 py-1 text-[10px] font-medium text-petrol-700">{t.name}<button onClick={() => setForm(f => ({ ...f, tagIds: f.tagIds.filter(i => i !== id) }))}><X className="size-3" /></button></span> : null;
                      })}
                      {form.tagIds.length === 0 && <span className="text-[10px] text-slate-400">تگی انتخاب نشده. می‌توانید دستی یا با هوش مصنوعی اضافه کنید.</span>}
                    </div>
                    <div className="flex gap-1">
                      <select value="" onChange={e => { const v = Number(e.target.value); if (v) setForm(f => ({ ...f, tagIds: [...f.tagIds, v] })); }} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none">
                        <option value="">انتخاب تگ...</option>
                        {tags.filter(t => !form.tagIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="تگ جدید..." className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-[10px] outline-none" />
                      <button onClick={async () => { if (!newTag) return; const r = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTag }) }); const d = await r.json(); if (d.ok) { setTags([...tags, d.tag]); setForm(f => ({ ...f, tagIds: [...f.tagIds, d.tag.id] })); setNewTag(""); } }} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] text-white">+</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="size-4 accent-petrol-600" /> محصول ویژه</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="size-4 accent-petrol-600" /> فعال</label>
                  </div>
                </div>
              )}

              {/* ─── تب قیمت و موجودی ─── */}
              {tab === "price" && (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">قیمت (ریال)</label>
                      <input value={form.price} onChange={e => setForm(f => ({ ...f, price: withCommas(e.target.value) }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" dir="ltr" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">موجودی</label>
                      <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" dir="ltr" />
                    </div>
                  </div>

                  {/* تخفیف درصدی یا ریالی */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" checked={form.hasDiscount} onChange={e => setForm(f => ({ ...f, hasDiscount: e.target.checked }))} className="peer sr-only" />
                        <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-red-500 peer-checked:after:translate-x-full" />
                      </label>
                      <span className="text-xs font-semibold text-slate-700">تخفیف ویژه</span>
                    </div>

                    {form.hasDiscount && (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2">
                          <div className="flex rounded-xl border border-slate-200 p-0.5">
                            <button onClick={() => setForm(f => ({ ...f, discountType: "percent" }))} className={cn("rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors", form.discountType === "percent" ? "bg-red-500 text-white" : "text-slate-500")}>درصدی (٪)</button>
                            <button onClick={() => setForm(f => ({ ...f, discountType: "amount" }))} className={cn("rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors", form.discountType === "amount" ? "bg-red-500 text-white" : "text-slate-500")}>مبلغی (ریال)</button>
                          </div>
                          <input
                            value={form.discountValue}
                            onChange={e => setForm(f => ({ ...f, discountValue: f.discountType === "amount" ? withCommas(e.target.value) : e.target.value.replace(/[^0-9]/g, "").slice(0, 3) }))}
                            placeholder={form.discountType === "percent" ? "مثلاً ۲۰" : "مبلغ تخفیف"}
                            className="flex-1 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs outline-none focus:border-red-500" dir="ltr" />
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <span className="text-slate-500">قیمت نهایی پس از تخفیف:</span>
                          <span className="font-bold text-red-600" dir="ltr">{finalPrice().toLocaleString("fa-IR")} ریال</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── تب توضیحات ─── */}
              {tab === "desc" && (
                <div className="space-y-6">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">توضیح کوتاه</label>
                      <AiAssistBar productName={form.title} text={form.shortDesc} short onResult={(html) => setForm(f => ({ ...f, shortDesc: html }))} />
                    </div>
                    <RichEditor content={form.shortDesc} onChange={(html) => setForm(f => ({ ...f, shortDesc: html }))} minHeight={110} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">توضیحات کامل</label>
                      <AiAssistBar productName={form.title} text={form.fullDesc} onResult={(html) => setForm(f => ({ ...f, fullDesc: html }))} />
                    </div>
                    <RichEditor content={form.fullDesc} onChange={(html) => setForm(f => ({ ...f, fullDesc: html }))} minHeight={240} />
                  </div>
                </div>
              )}

              {/* ─── تب تصاویر (ادغام شاخص و گالری) ─── */}
              {tab === "media" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">تصاویر محصول</label>
                      <p className="mt-0.5 text-[10px] text-slate-400">تصاویر را آپلود کنید و روی ستاره بزنید تا تصویر شاخص انتخاب شود.</p>
                    </div>
                    {form.coverImage && (
                      <button type="button" id="removeBgBtn"
                        onClick={async () => {
                          const btn = document.getElementById("removeBgBtn") as HTMLButtonElement;
                          if (btn) { btn.disabled = true; btn.textContent = "در حال پردازش..."; }
                          try {
                            const res = await fetch("/api/admin/remove-bg", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.coverImage, method: "auto" }) });
                            const data = await res.json();
                            if (data.ok) { setForm(f => ({ ...f, coverImage: data.file.url, images: [data.file.url, ...(f.images || [])] })); toast.success(data.message || "✅ پس‌زمینه حذف شد"); }
                            else toast.error(data.error || "خطا در حذف پس‌زمینه");
                          } catch { toast.error("خطا در ارتباط با سرور"); }
                          if (btn) { btn.disabled = false; btn.textContent = "✨ حذف پس‌زمینه"; }
                        }}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50">
                        <Wand2 className="size-3.5" /> ✨ حذف پس‌زمینه
                      </button>
                    )}
                  </div>

                  {/* گرید تصاویر با انتخاب شاخص */}
                  {allImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {allImages.map((img) => {
                        const isCover = img === form.coverImage;
                        return (
                          <div key={img} className={cn("group relative aspect-square overflow-hidden rounded-xl border-2", isCover ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200")}>
                            <img src={img} className="size-full object-cover" />
                            <button type="button" onClick={() => setForm(f => ({ ...f, coverImage: img }))}
                              title={isCover ? "تصویر شاخص" : "انتخاب به‌عنوان شاخص"}
                              className={cn("absolute top-1 right-1 flex size-6 items-center justify-center rounded-full transition-colors", isCover ? "bg-amber-400 text-white" : "bg-white/80 text-slate-400 hover:text-amber-500")}>
                              <Star className={cn("size-3.5", isCover && "fill-current")} />
                            </button>
                            <button type="button" onClick={() => setImages(allImages.filter(i => i !== img))}
                              className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-white/80 text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                              <X className="size-3.5" />
                            </button>
                            {isCover && <span className="absolute bottom-0 inset-x-0 bg-amber-400/90 py-0.5 text-center text-[8px] font-bold text-white">شاخص</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <ImageUpload
                    value={form.images}
                    onChange={(v) => setImages(v as string[])}
                    multiple
                    category="product"
                  />
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-white rounded-b-2xl px-6 pt-4 pb-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {TABS.map((t, i) => (
                  <span key={t.key} className={cn("size-1.5 rounded-full", tab === t.key ? "bg-petrol-600" : "bg-slate-200")} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600">انصراف</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50">
                  <Save className="size-4" /> {saving ? "در حال ذخیره..." : "ذخیره محصول"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, subtitle, ltr }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; subtitle?: string; ltr?: boolean }) {
  return <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required && " *"}</label><input value={value} onChange={e => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />{subtitle && <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>}</div>;
}

function renderCatOptions(cats: Category[], depth: number): React.ReactNode {
  return cats.map(cat => (
    <optgroup key={cat.id} label={"—".repeat(depth) + cat.title}>
      <option value={cat.id}>{"—".repeat(depth)} {cat.title}</option>
      {cat.children && renderCatOptions(cat.children, depth + 1)}
    </optgroup>
  ));
}

function toTree(data: any[]): Category[] {
  const map = new Map<number, Category>();
  data.forEach((c: any) => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  data.forEach((c: any) => {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(map.get(c.id)!);
    else roots.push(map.get(c.id)!);
  });
  return roots;
}
