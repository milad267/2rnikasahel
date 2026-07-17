"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit, Trash2, Save, X, Search, Tag,
  RefreshCw, CheckCircle, XCircle, Package,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Brand {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/brands");
      const data = await res.json();
      if (data.ok) setBrands(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadBrands(); }, [loadBrands]);

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openNewBrand() {
    setEditingBrand(null);
    setFormName("");
    setShowModal(true);
  }

  function openEditBrand(brand: Brand) {
    setEditingBrand(brand);
    setFormName(brand.name);
    setShowModal(true);
  }

  async function saveBrand() {
    const name = formName.trim();
    if (!name) { toast.error("نام برند الزامی است"); return; }
    setSaving(true);
    try {
      if (editingBrand) {
        const res = await fetch("/api/admin/brands", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingBrand.id, name }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ برند ویرایش شد");
          setShowModal(false);
          loadBrands();
        } else toast.error(data.error || "خطا");
      } else {
        const res = await fetch("/api/admin/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ برند اضافه شد");
          setShowModal(false);
          loadBrands();
        } else toast.error(data.error || "خطا");
      }
    } catch { toast.error("خطا در ارتباط با سرور"); }
    setSaving(false);
  }

  async function deleteBrand(id: number) {
    if (!confirm("آیا از حذف این برند اطمینان دارید؟ محصولات مرتبط بدون برند می‌شوند.")) return;
    try {
      const res = await fetch(`/api/admin/brands?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("✅ برند حذف شد");
        loadBrands();
      } else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در حذف"); }
  }

  // ─── Modal ───
  function Modal({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title: string }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex h-40 items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Tag className="size-6 text-petrol-600" strokeWidth={1.6} />
            مدیریت برندها
          </h1>
          <p className="mt-1 text-sm text-slate-500">افزودن، ویرایش و حذف برندهای محصولات</p>
        </div>
        <button onClick={openNewBrand}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg">
          <Plus className="size-4" /> برند جدید
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی برند..." dir="rtl"
          className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-4 text-xs outline-none focus:border-petrol-500" />
      </div>

      {/* Brand count */}
      <p className="text-xs text-slate-400">
        {filteredBrands.length} برند {search && `(مربوط به "${search}")`}
      </p>

      {/* Brands Grid */}
      {filteredBrands.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
          <Tag className="size-12 text-slate-300 mb-4" strokeWidth={1.3} />
          <p className="text-sm font-semibold text-slate-600">
            {search ? "برندی با این نام یافت نشد" : "هنوز برندی اضافه نشده"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {search ? "با عبارت دیگری جستجو کنید" : "برای شروع، یک برند جدید اضافه کنید"}
          </p>
          {!search && (
            <button onClick={openNewBrand}
              className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white">
              <Plus className="size-4" /> افزودن برند
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map((brand) => (
            <div key={brand.id}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-purple-200 hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                    <Tag className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{brand.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {brand.slug}
                      <span className="mx-1">·</span>
                      {brand.createdAt
                        ? new Date(brand.createdAt).toLocaleDateString("fa-IR")
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditBrand(brand)}
                    className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <Edit className="size-3.5" />
                  </button>
                  <button onClick={() => deleteBrand(brand.id)}
                    className="flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Package className="size-3" />
                <span>محصولات مرتبط با این برند</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editingBrand ? "ویرایش برند" : "برند جدید"}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">نام برند</label>
              <input type="text" value={formName} autoFocus
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBrand()}
                placeholder="مثال: سامسونگ، اپل، نیکون..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500" />
            </div>
            {editingBrand && (
              <p className="text-[10px] text-slate-400">
                اسلاگ فعلی: <code dir="ltr" className="text-petrol-600">{editingBrand.slug}</code>
                <br />
                با تغییر نام، اسلاگ نیز به‌روزرسانی می‌شود.
              </p>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                انصراف
              </button>
              <button onClick={saveBrand} disabled={saving || !formName.trim()}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {saving ? "..." : editingBrand ? "ویرایش" : "افزودن"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
