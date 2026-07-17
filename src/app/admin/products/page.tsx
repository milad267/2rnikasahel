"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Search, Edit, Trash2, Upload, X, Save, Box, Wand2, Sparkles, Loader2, Star, Info, DollarSign, FileText, Images, ListChecks, Layers, ChevronDown, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/admin/RichEditor";
import { AiAssistBar } from "@/components/admin/AiAssistBar";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AiProductImport } from "@/components/admin/AiProductImport";
import { PriceUpdateModal } from "@/components/admin/PriceUpdateModal";
import { validateProduct } from "@/lib/product-validation";

type Product = { id: number; title: string; slug: string; isActive: boolean; categoryTitle: string | null; coverImage: string | null; categoryId: number | null; };
type Category = { id: number; title: string; slug: string; parentId: number | null; children?: Category[]; };
type Brand = { id: number; name: string; slug: string; };
type Tag = { id: number; name: string; slug: string; };
type Unit = { id: number; name: string; symbol: string | null; slug?: string; category?: string; };

// ویژگی محصول: نوع (کلید) و مقدار
type Attr = { key: string; value: string };
// تنوع محصول
type Variant = { name: string; unitId: number; subUnit: string; sku: string; price: string; shortDesc: string; hasDiscount?: boolean; discountType?: string; discountValue?: string; discountPrice?: string };

// مقادیر عددی رایج به‌عنوان پیشنهاد (کاربر می‌تواند مقدار دلخواه هم دستی وارد کند)
const NUM_PRESETS = ["1", "2", "3", "4", "5", "6", "10", "15", "20", "25", "50", "100", "200", "500", "1000", "2000", "5000", "10000"];

// سایز اینچی لوله/اتصالات (بیشترین کاربرد در تأسیسات)
const INCH_PRESETS = ["1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1.1/4", "1.1/2", "2", "2.1/2", "3", "4", "5", "6", "8", "10", "12"];

// زیرواحد (مقدار واحد) پیشنهادی بر اساس slug واحد؛ در همه حال ورود دستی هم ممکن است
function subUnitPresets(slug?: string): string[] {
  if (slug === "inch") return INCH_PRESETS;
  return NUM_PRESETS;
}



type TabKey = "basic" | "price" | "specs" | "variants" | "desc" | "media";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "basic", label: "اطلاعات پایه", icon: Info },
  { key: "price", label: "قیمت و موجودی", icon: DollarSign },
  { key: "specs", label: "ویژگی‌ها", icon: ListChecks },
  { key: "variants", label: "تنوع‌ها", icon: Layers },
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
  const [showPriceUpdate, setShowPriceUpdate] = useState(false);

  // قفل اسکرول بدنه وقتی مودال باز است
  useEffect(() => {
    if (showModal) {
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
  }, [showModal]);

  const [form, setForm] = useState({
    title: "", slug: "", sku: "", brandId: 0,
    shortDesc: "", fullDesc: "",
    price: "", stock: "", unitId: 0, subUnit: "",
    categoryId: 0, tagIds: [] as number[],
    coverImage: "", images: [] as string[],
    isFeatured: false, isActive: true, sortOrder: 0,
    hasDiscount: false, discountType: "percent" as "percent" | "amount", discountValue: "",
  });
  const [newBrand, setNewBrand] = useState("");
  const [newTag, setNewTag] = useState("");

  // واحدها، ویژگی‌ها و تنوع‌ها
  const [units, setUnits] = useState<Unit[]>([]);
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variantRows, setVariantRows] = useState<Variant[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Load products with pagination + search
  const load = useCallback((p?: number, q?: string) => {
    setLoading(true);
    const currentPage = p ?? page;
    const query = q ?? search;
    const params = new URLSearchParams({ page: String(currentPage), limit: "50" });
    if (query) params.set("search", query);

    Promise.all([
      fetch(`/api/admin/products?${params}`).then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
    ]).then(([prods, cats]) => {
      if (prods.ok) {
        setProducts(prods.data);
        setTotalPages(prods.pagination.totalPages);
        setTotalProducts(prods.pagination.total);
      }
      setCategories(toTree(cats));
    }).finally(() => setLoading(false));
  }, [page, search]);

  // Lazy load brands, tags, units only when modal opens
  function loadFormData() {
    return Promise.all([
      fetch("/api/admin/brands").then(r => r.json()),
      fetch("/api/admin/tags").then(r => r.json()),
      fetch("/api/admin/units").then(r => r.json()),
    ]).then(([brs, tgs, uns]) => {
      setBrands(brs.data || brs);
      setTags(tgs.data || tgs);
      setUnits(uns.data || uns);
    });
  }

  // Load initial data
  useEffect(() => {
    load(1, "");
    // Pre-load form data in background
    if (brands.length === 0) {
      fetch("/api/admin/brands").then(r => r.json()).then(d => setBrands(d.data || d));
      fetch("/api/admin/tags").then(r => r.json()).then(d => setTags(d.data || d));
      fetch("/api/admin/units").then(r => r.json()).then(d => setUnits(d.data || d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when page or search changes
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Debounced search
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(1, value);
    }, 400);
  }

  // No more client-side filter needed - API handles it

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
    setForm({ title: "", slug: "", sku: "", brandId: 0, shortDesc: "", fullDesc: "", price: "", stock: "", unitId: 0, subUnit: "", categoryId: 0, tagIds: [], coverImage: "", images: [], isFeatured: false, isActive: true, sortOrder: 0, hasDiscount: false, discountType: "percent", discountValue: "" });
    setAttrs([]);
    setVariantsEnabled(false);
    setVariantRows([]);
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
    const cleanAttrs = attrs.filter(a => a.key.trim() && a.value.trim());
    const cleanVariants = variantRows
      .filter(v => v.name.trim())
      .map(v => ({ ...v, price: String(toNum(v.price)) }));
    
    // Fallback: if slug is empty, generate from title
    let finalSlug = form.slug;
    if (!finalSlug || finalSlug.length < 2) {
      finalSlug = form.title.trim().replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/gi, "").toLowerCase().slice(0, 100);
      if (!finalSlug || finalSlug.length < 2) {
        finalSlug = `product-${Date.now()}`;
      }
    }
    
    const payload = {
      ...form,
      slug: finalSlug,
      price: String(toNum(form.price)),
      discountPrice: String(finalPrice()),
      attrs: cleanAttrs,
      variantsEnabled,
      variants: cleanVariants,
    };
    
    const validation = validateProduct(payload as any);
    
    if (!validation.valid) { 
      toast.error("❌ " + validation.error); 
      return; 
    }
    
    setSaving(true);
    
    // Add timeout
    const timeoutId = setTimeout(() => {
      toast.error("❌ خطا در اتصال به سرور. لطفاً صفحه را refresh کنید.");
      setSaving(false);
    }, 15000); // 15 seconds timeout
    
    try {
      const method = editingId ? "PUT" : "POST";
      const url = `/api/admin/products${editingId ? `/${editingId}` : ""}`;
      
      const res = await fetch(url, {
        method, 
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      
      clearTimeout(timeoutId);
      
      // Check if unauthorized
      if (res.status === 401) {
        toast.error("❌ لطفاً دوباره وارد شوید");
        window.location.href = "/login";
        return;
      }
      
      if (res.status === 403) {
        toast.error("❌ دسترسی غیرمجاز");
        return;
      }
      
      if (res.status === 500) {
        toast.error("❌ خطای سرور. لطفاً کنسول مرورگر را چک کنید.");
        return;
      }
      
      const data = await res.json();
      
      if (!data.ok) {
        const errorMsg = data.error || "خطا در ذخیره محصول";
        toast.error("❌ " + errorMsg);
        return;
      }
      
      toast.success(editingId ? "✅ محصول ویرایش شد" : "✅ محصول ساخته شد");
      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) { 
      clearTimeout(timeoutId);
      toast.error("❌ خطا: " + (e.message || "مشکل در اتصال به سرور")); 
    }
    finally { 
      clearTimeout(timeoutId);
      setSaving(false); 
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این محصول مطمئن هستید؟\nدر صورت وجود در سبد خرید کاربران، از سبدها هم حذف می‌شود.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      let data: { ok?: boolean; error?: string; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = { ok: false, error: `خطای سرور (${res.status})` };
      }
      if (res.ok && data.ok) {
        toast.success(data.message || "محصول حذف شد");
        // Optimistic UI: فوراً از لیست بردار، بعد لیست را refresh کن
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setTotalProducts((t) => Math.max(0, t - 1));
        load();
      } else {
        toast.error(data.error || "خطا در حذف محصول");
      }
    } catch (e: any) {
      toast.error(e?.message || "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  // بارگذاری اطلاعات محصول برای ویرایش
  async function loadProduct(id: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "خطا در دریافت محصول");
      
      const product = data.product;
      
      // پر کردن فرم
      const firstVariant = product.variants?.[0];
      setForm({
        title: product.title || "",
        slug: product.slug || "",
        sku: firstVariant?.sku || "",
        brandId: product.brandId || 0,
        shortDesc: product.subtitle || "",
        fullDesc: product.description || "",
        price: firstVariant?.price || "",
        stock: String(firstVariant?.stock || 0),
        unitId: firstVariant?.unitId || 0,
        subUnit: firstVariant?.unitValue || "",
        categoryId: product.categoryId || 0,
        tagIds: product.tagIds || [],
        coverImage: product.coverImage || "",
        images: product.images || [],
        isFeatured: product.isFeatured || false,
        isActive: product.isActive !== false,
        sortOrder: product.sortOrder || 0,
        hasDiscount: firstVariant?.hasDiscount === true,
        discountType: firstVariant?.discountType || "percent",
        discountValue: firstVariant?.discountValue || "",
      });
      
      // پر کردن ویژگی‌ها
      const specSheet = firstVariant?.specSheet || {};
      setAttrs(Object.entries(specSheet).map(([key, value]) => ({ key, value: String(value) })));
      
      // پر کردن تنوع‌ها
      if (product.variants && product.variants.length > 0) {
        setVariantsEnabled(product.variants.length > 1);
        setVariantRows(product.variants.map((v: any) => ({
          name: v.name,
          unitId: v.unitId || 0,
          subUnit: v.unitValue || "",
          sku: v.sku,
          price: String(v.price),
          shortDesc: "",
          hasDiscount: v.hasDiscount === true,
          discountType: v.discountType || "percent",
          discountValue: v.discountValue || "",
          discountPrice: v.discountPrice || "",
        })));
      } else {
        setVariantsEnabled(false);
        setVariantRows([]);
      }
      
      // بارگذاری برندها و تگ‌ها
      await loadFormData();
      
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
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
            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="جستجو..." className="flex-1 bg-transparent text-xs text-slate-800 outline-none" />
          </div>
          <button onClick={() => setShowPriceUpdate(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
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
                <th className="px-3 py-3 text-center font-semibold text-slate-500 w-10">#</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">محصول</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">دسته</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/80">
                  <td className="px-3 py-3 text-center text-xs text-slate-400 font-mono">{(page - 1) * 50 + idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        {p.coverImage ? <img src={p.coverImage} alt={p.title} className="size-full rounded-xl object-cover" loading="lazy" /> : <Box className="size-5" />}
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
                      <button onClick={() => { setEditingId(p.id); loadProduct(p.id).then(() => setShowModal(true)); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"><Edit className="size-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">محصولی یافت نشد.</td></tr>}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <span className="text-[10px] text-slate-500">صفحه {page} از {totalPages} ({totalProducts} محصول)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">قبلی</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pNum = start + i;
                  if (pNum > totalPages) return null;
                  return (
                    <button key={pNum} onClick={() => setPage(pNum)}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-medium ${pNum === page ? "bg-petrol-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {pNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">بعدی</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* دستیار هوشمند ایجاد محصول */}
      <AiProductImport />

      {/* مودال آپدیت قیمت از اکسل */}
      <PriceUpdateModal open={showPriceUpdate} onClose={() => setShowPriceUpdate(false)} />

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
                    <Field label="نام محصول" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required maxLength={300} />
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">کد محصول (SKU)</label>
                      <div className="flex gap-1.5">
                        <input value={form.sku} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, sku: v, slug: skuToSlug(v) })); }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" dir="ltr" />
                        <button onClick={generateSku} className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100" title="تولید خودکار کد">تولید</button>
                      </div>
                    </div>
                    {/* Slug خودکار از نام محصول ساخته می‌شود */}
                    <input type="hidden" value={form.slug} />
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">برند</label>
                        <a href="/admin/brands" target="_blank" className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800">
                          <ExternalLink className="size-3" strokeWidth={1.5} />
                          مدیریت برندها
                        </a>
                      </div>
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
                      <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))} 
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-200 appearance-none cursor-pointer"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")", backgroundPosition: "left 0.75rem center", backgroundSize: "1rem", backgroundRepeat: "no-repeat" }}>
                        <option value={0}>بدون دسته</option>
                        {renderCatOptions(categories, 0)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">واحد کالا</label>
                        <UnitSelect units={units} value={form.unitId} onChange={(id) => setForm(f => ({ ...f, unitId: id, subUnit: "" }))} onAddUnit={(u) => setUnits(prev => [...prev, u])} />
                        <p className="mt-1 text-[10px] text-slate-400">متر، اینچ، عدد و...</p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">زیرواحد</label>
                        <SubUnitSelect units={units} unitId={form.unitId} value={form.subUnit} onChange={(v) => setForm(f => ({ ...f, subUnit: v }))} />
                        <p className="mt-1 text-[10px] text-slate-400">سایز، مقدار دقیق</p>
                      </div>
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
                        <div className="h-6 w-11 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-red-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
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

              {/* ─── تب ویژگی‌ها (نوع / مقدار) ─── */}
              {tab === "specs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">ویژگی‌های محصول</label>
                      <p className="mt-0.5 text-[10px] text-slate-400">هر ویژگی شامل «نوع» و «مقدار» است (مثلاً: جنس = برنج، فشار کاری = ۱۶ بار).</p>
                    </div>
                    <button type="button" onClick={() => setAttrs(a => [...a, { key: "", value: "" }])}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-slate-700">
                      <Plus className="size-3.5" /> افزودن ویژگی
                    </button>
                  </div>

                  {attrs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
                      هنوز ویژگی‌ای اضافه نشده است.
                    </div>
                  )}

                  {attrs.length > 0 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-[10px] font-semibold text-slate-500">
                        <span>نوع ویژگی</span>
                        <span>مقدار ویژگی</span>
                        <span className="w-8" />
                      </div>
                      {attrs.map((a, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input value={a.key} onChange={e => setAttrs(list => list.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="مثلاً: جنس" className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500" />
                          <input value={a.value} onChange={e => setAttrs(list => list.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="مثلاً: برنج" className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-petrol-500" />
                          <button type="button" onClick={() => setAttrs(list => list.filter((_, j) => j !== i))} className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── تب تنوع‌ها ─── */}
              {tab === "variants" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" checked={variantsEnabled} onChange={e => { const on = e.target.checked; setVariantsEnabled(on); if (on && variantRows.length === 0) setVariantRows([{ name: "", unitId: 0, subUnit: "", sku: "", price: "", shortDesc: "" }]); }} className="peer sr-only" />
                        <div className="h-6 w-11 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-petrol-600 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
                      </label>
                      <div>
                        <span className="text-xs font-semibold text-slate-700">این محصول تنوع دارد</span>
                        <p className="text-[10px] text-slate-400">برای محصولاتی که در چند واحد/سایز/قیمت عرضه می‌شوند.</p>
                      </div>
                    </div>
                  </div>

                  {variantsEnabled && (
                    <div className="space-y-2">
                      {variantRows.map((v, i) => (
                        <VariantAccordion
                          key={i}
                          index={i}
                          variant={v}
                          units={units}
                          onUpdate={(updated) => setVariantRows(list => list.map((x, j) => j === i ? updated : x))}
                          onDelete={() => setVariantRows(list => list.filter((_, j) => j !== i))}
                          onAddUnit={(u) => setUnits(prev => [...prev, u])}
                        />
                      ))}
                      <button type="button" onClick={() => setVariantRows(list => [...list, { name: "", unitId: 0, subUnit: "", sku: "", price: "", shortDesc: "" }])}
                        className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2.5 text-[11px] font-semibold text-slate-500 hover:border-petrol-400 hover:text-petrol-600">
                        <Plus className="size-4" /> افزودن تنوع جدید
                      </button>
                    </div>
                  )}
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

                  {/* تگ‌ها */}
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
                </div>
              )}

              {/* ─── تب تصاویر ─── */}
              {tab === "media" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">تصاویر محصول</label>
                      <p className="mt-0.5 text-[10px] text-slate-400">روی دکمه AI یک تصویر کلیک کنید تا ویرایشگر باز شود (برش، چرخش، فیلتر، حذف پس‌زمینه، ...)</p>
                    </div>
                  </div>

                  {/* کامپوننت ImageUpload با ویرایشگر کامل */}
                  <ImageUpload
                    value={allImages}
                    onChange={(newImages) => {
                      const arr = Array.isArray(newImages) ? newImages : [newImages].filter(Boolean) as string[];
                      setImages(arr);
                      // اگر تصویر شاخص حذف شده بود، اولین تصویر رو شاخص کن
                      if (!arr.includes(form.coverImage)) {
                        setForm(f => ({ ...f, coverImage: arr[0] || "" }));
                      }
                    }}
                    multiple
                    category="product"
                    sizeHint="📐 سایز پیشنهادی: ۱۲۰۰×۱۲۰۰ پیکسل | فرمت‌ها: JPG، PNG، WebP، GIF، HEIC"
                  />

                  {/* انتخاب تصویر شاخص */}
                  {allImages.length > 1 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <label className="text-[10px] font-semibold text-amber-800 mb-2 block">🌟 تصویر شاخص (نمایش اصلی):</label>
                      <div className="flex flex-wrap gap-2">
                        {allImages.map(img => (
                          <button key={img} type="button" onClick={() => setForm(f => ({ ...f, coverImage: img }))}
                            className={cn(
                              "relative size-14 overflow-hidden rounded-lg border-2 transition-all",
                              img === form.coverImage ? "border-amber-500 ring-2 ring-amber-200 opacity-100" : "border-slate-200 opacity-60 hover:opacity-90"
                            )}>
                            <img src={img} alt="تصویر محصول" className="size-full object-cover" />
                            {img === form.coverImage && (
                              <span className="absolute inset-0 flex items-center justify-center bg-amber-500/40">
                                <Star className="size-4 text-white fill-white" />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

// انتخابگر واحد کالا — dropdown سفارشی + امکان افزودن واحد دستی
/** کامپوننت آکاردیونی تنوع */
function VariantAccordion({ index, variant, units, onUpdate, onDelete, onAddUnit }: {
  index: number;
  variant: { name: string; unitId: number; subUnit: string; sku: string; price: string; shortDesc: string };
  units: Unit[];
  onUpdate: (v: typeof variant) => void;
  onDelete: () => void;
  onAddUnit: (u: Unit) => void;
}) {
  const [open, setOpen] = useState(false);

  const title = variant.name?.trim() || `تنوع ${index + 1}`;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* هدر - کلیک برای باز/بسته شدن */}
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
      >
        <span>{title}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex size-6 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="size-3.5" />
          </button>
          <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.8} />
        </div>
      </button>

      {/* محتوا - نمایش فقط در حالت باز */}
      {open && (
        <div className="p-3 space-y-2 border-t border-slate-100">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-600">نام تنوع</label>
              <input value={variant.name} onChange={e => onUpdate({ ...variant, name: e.target.value })}
                placeholder="مثلاً: نیم اینچ"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-petrol-500" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-slate-600">واحد کالا</label>
                <UnitSelect units={units} value={variant.unitId}
                  onChange={(id) => onUpdate({ ...variant, unitId: id, subUnit: "" })}
                  onAddUnit={onAddUnit} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-slate-600">زیرواحد</label>
                <SubUnitSelect units={units} unitId={variant.unitId} value={variant.subUnit}
                  onChange={(val) => onUpdate({ ...variant, subUnit: val })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-600">کد محصول (SKU)</label>
              <input value={variant.sku} onChange={e => onUpdate({ ...variant, sku: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-petrol-500" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-600">قیمت (ریال)</label>
              <input value={variant.price} onChange={e => onUpdate({ ...variant, price: withCommas(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-petrol-500" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-600">توضیح کوتاه</label>
            <input value={variant.shortDesc} onChange={e => onUpdate({ ...variant, shortDesc: e.target.value })}
              placeholder="توضیح مختصر این تنوع"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-petrol-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function UnitSelect({ units, value, onChange, onAddUnit }: { units: Unit[]; value: number; onChange: (id: number) => void; onAddUnit?: (u: Unit) => void }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = units.find(u => u.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function addUnit() {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const r = await fetch("/api/admin/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const d = await r.json();
      if (d.ok && d.unit) {
        onAddUnit?.(d.unit);
        onChange(d.unit.id);
        setNewName("");
        setOpen(false);
        toast.success("واحد جدید اضافه شد ✓");
      } else toast.error(d.error || "خطا در افزودن واحد");
    } catch { toast.error("خطا در ارتباط با سرور"); }
    finally { setAdding(false); }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none hover:border-petrol-400 focus:border-petrol-500">
        <span className={cn(!selected && "text-slate-400")}>
          {selected ? `${selected.name}${selected.symbol ? ` (${selected.symbol})` : ""}` : "بدون واحد"}
        </span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => { onChange(0); setOpen(false); }}
              className={cn("flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-slate-50", value === 0 ? "font-semibold text-petrol-700" : "text-slate-600")}>
              بدون واحد {value === 0 && <Check className="size-3.5" />}
            </button>
            {units.map(u => (
              <button key={u.id} type="button" onClick={() => { onChange(u.id); setOpen(false); }}
                className={cn("flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-slate-50", value === u.id ? "font-semibold text-petrol-700" : "text-slate-600")}>
                <span>{u.name}{u.symbol ? ` (${u.symbol})` : ""}</span>
                {value === u.id && <Check className="size-3.5" />}
              </button>
            ))}
          </div>
          {/* افزودن واحد دستی */}
          <div className="mt-1 flex items-center gap-1 border-t border-slate-100 px-2 pt-1.5">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUnit(); } }}
              placeholder="واحد جدید..." className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-petrol-500" />
            <button type="button" onClick={addUnit} disabled={adding || !newName.trim()}
              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">
              {adding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />} افزودن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// انتخابگر زیرواحد (مقدار واحد) — ترکیب ورود دستی + پیشنهادهای عددی/اینچی
function SubUnitSelect({ units, unitId, value, onChange }: { units: Unit[]; unitId: number; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unit = units.find(u => u.id === unitId);
  const presets = subUnitPresets(unit?.slug);
  // پیشنهادها را بر اساس متن واردشده فیلتر کن
  const filtered = value ? presets.filter(p => p.includes(value)) : presets;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-petrol-500">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="مقدار (مثلاً ۵ یا 1/2)"
          className="w-full rounded-xl bg-transparent px-3 py-2.5 text-xs outline-none"
          dir="ltr"
        />
        <button type="button" onClick={() => setOpen(o => !o)} className="px-2 text-slate-400 hover:text-slate-600">
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {filtered.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
              className={cn("flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-slate-50", value === opt ? "font-semibold text-petrol-700" : "text-slate-600")} dir="ltr">
              <span>{opt}{unit?.symbol ? ` ${unit.symbol}` : ""}</span>
              {value === opt && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, subtitle, ltr, maxLength }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; subtitle?: string; ltr?: boolean; maxLength?: number }) {
  return <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required && " *"}</label><input value={value} onChange={e => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} maxLength={maxLength} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />{subtitle && <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>}</div>;
}

function renderCatOptions(cats: Category[], depth: number): React.ReactNode[] {
  return cats.flatMap(cat => [
    <option key={cat.id} value={cat.id} style={{ paddingRight: 8 + depth * 16 }}>
      {"—".repeat(depth)} {cat.title}
    </option>,
    ...(cat.children ? renderCatOptions(cat.children, depth + 1) : []),
  ]);
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
