"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Truck, Loader2, Eye, EyeOff, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { formatRial } from "@/lib/utils";

type ShippingMethod = {
  id: number;
  title: string;
  description: string | null;
  cost: string;
  freeThreshold: string;
  deliveryDays: string | null;
  isFree: boolean;
  logo: string | null;
  trackingBaseUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = () => ({
  title: "",
  description: "",
  cost: "0",
  freeThreshold: "0",
  deliveryDays: "۲ تا ۴ روز کاری",
  isFree: false,
  logo: "",
  trackingBaseUrl: "",
  sortOrder: 0,
  isActive: true,
});

export default function ShippingMethodsPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/shipping-methods");
      const data = await res.json();
      if (data.ok) setMethods(data.data);
    } catch {
      toast.error("خطا در دریافت روش‌های ارسال");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (method?: ShippingMethod) => {
    if (method) {
      setForm({
        title: method.title,
        description: method.description || "",
        cost: method.cost,
        freeThreshold: method.freeThreshold,
        deliveryDays: method.deliveryDays || "",
        isFree: method.isFree,
        logo: method.logo || "",
        trackingBaseUrl: method.trackingBaseUrl || "",
        sortOrder: method.sortOrder,
        isActive: method.isActive,
      });
      setEditing(method.id);
    } else {
      setForm(emptyForm());
      setEditing("new");
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("عنوان روش ارسال الزامی است.");
      return;
    }
    setSaving(true);
    try {
      const url = "/api/admin/shipping-methods";
      const method = editing === "new" ? "POST" : "PUT";
      const body = editing === "new" ? form : { ...form, id: editing };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(editing === "new" ? "روش ارسال اضافه شد" : "روش ارسال ویرایش شد");
        cancelEdit();
        await load();
      } else {
        toast.error(data.error || "خطا در ذخیره");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این روش ارسال اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/shipping-methods?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("روش ارسال حذف شد");
        await load();
      } else {
        toast.error(data.error || "خطا در حذف");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    }
  };

  const toggleActive = async (method: ShippingMethod) => {
    try {
      const res = await fetch("/api/admin/shipping-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: method.id, isActive: !method.isActive }),
      });
      const data = await res.json();
      if (data.ok) await load();
    } catch {
      toast.error("خطا در تغییر وضعیت");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-petrol-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">روش‌های ارسال</h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت روش‌های حمل و نقل فروشگاه</p>
        </div>
        {editing === null && (
          <button
            onClick={() => startEdit()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-petrol-600 to-petrol-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md"
          >
            <Plus className="size-4" /> روش جدید
          </button>
        )}
      </div>

      {/* فرم ویرایش/جدید */}
      {editing !== null && (
        <div className="rounded-2xl border border-petrol-200 bg-petrol-50/50 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            {editing === "new" ? "روش ارسال جدید" : "ویرایش روش ارسال"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="مثال: پست پیشتاز"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">روزهای تحویل</label>
              <input
                type="text"
                value={form.deliveryDays}
                onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="مثال: ۲ تا ۴ روز کاری"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">هزینه ارسال (ریال)</label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="۰ = رایگان"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">آستانه ارسال رایگان (ریال)</label>
              <input
                type="number"
                value={form.freeThreshold}
                onChange={(e) => setForm({ ...form, freeThreshold: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="۰ = غیرفعال"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">ترتیب</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">آیکون / لوگو (اموجی)</label>
              <input
                type="text"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="مثال: 📮 🚚 ✈️"
                maxLength={10}
              />
              {form.logo && <span className="mt-1 block text-right text-lg">{form.logo}</span>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">لینک پایه رهگیری</label>
              <input
                type="url"
                value={form.trackingBaseUrl}
                onChange={(e) => setForm({ ...form, trackingBaseUrl: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                placeholder="مثال: https://tracking.post.ir/"
              />
            </div>
            <div className="flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                  className="size-4 accent-petrol-600"
                />
                <span className="text-xs font-medium text-slate-700">ارسال رایگان</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="size-4 accent-petrol-600"
                />
                <span className="text-xs font-medium text-slate-700">فعال</span>
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-petrol-500 resize-none"
              rows={2}
              placeholder="مثال: بیمه‌شده تا درب منزل"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-petrol-600 to-petrol-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50"
            >
              <Save className="size-4" /> {saving ? "..." : "ذخیره"}
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* لیست روش‌های ارسال */}
      {methods.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <Truck className="mx-auto size-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">هیچ روش ارسالی تعریف نشده است.</p>
          <p className="mt-1 text-xs text-slate-400">روش ارسال جدیدی اضافه کنید.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-petrol-100 text-xl text-petrol-700">
                {method.logo || "🚚"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{method.title}</h3>
                  {method.isFree && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      رایگان
                    </span>
                  )}
                  {!method.isActive && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      غیرفعال
                    </span>
                  )}
                </div>
                {method.description && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{method.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>💰 {formatRial(method.cost)}</span>
                  {Number(method.freeThreshold) > 0 && (
                    <span>🎁 رایگان از {formatRial(method.freeThreshold)}</span>
                  )}
                  {method.deliveryDays && <span>🚚 {method.deliveryDays}</span>}
                  {method.trackingBaseUrl && <span>🔗 لینک رهگیری</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(method)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title={method.isActive ? "غیرفعال کردن" : "فعال کردن"}
                >
                  {method.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button
                  onClick={() => startEdit(method)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"
                  title="ویرایش"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  title="حذف"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
