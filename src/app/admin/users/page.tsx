"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";

const ADMIN_MODULES = [
  { key: "dashboard", label: "داشبورد" },
  { key: "products", label: "محصولات" },
  { key: "orders", label: "سفارشات" },
  { key: "categories", label: "دسته‌بندی‌ها" },
  { key: "blog", label: "بلاگ" },
  { key: "slider", label: "اسلایدر" },
  { key: "contact", label: "پیام‌ها" },
  { key: "payments", label: "پرداخت‌ها" },
  { key: "users", label: "کاربران" },
  { key: "settings", label: "تنظیمات" },
];

export default function UsersPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/admin-users").then(r => r.json()).then(data => {
      if (data.ok) setAdmins(data.admins);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function handleCreate() {
    if (!form.name || !form.phone || form.password.length < 6) {
      toast.error("نام، شماره موبایل و رمز عبور (حداقل ۶ کاراکتر) الزامی است"); return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/admin-users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, permissions }),
    });
    const data = await res.json();
    if (data.ok) { toast.success("✅ ادمین جدید ساخته شد"); setShowModal(false); setForm({ name: "", phone: "", password: "" }); setPermissions([]); load(); }
    else toast.error(data.error);
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف دسترسی ادمین این کاربر مطمئن هستید؟")) return;
    const res = await fetch(`/api/admin/admin-users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) { toast.success("✅ دسترسی ادمین لغو شد"); load(); }
    else toast.error(data.error);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Users className="size-6 text-petrol-600" strokeWidth={1.6} /> مدیریت کاربران ادمین</h1>
          <p className="mt-1 text-sm text-slate-500">{admins.length} کاربر ادمین</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"><Plus className="size-4" /> ادمین جدید</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-right font-semibold text-slate-600">نام</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">موبایل</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">ایمیل</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">نقش</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} className="border-b border-slate-50">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><UserCog className="size-4 text-slate-400" /><span className="font-semibold text-slate-900">{a.name}</span></div></td>
                <td className="px-4 py-3 text-slate-600" dir="ltr">{a.phone}</td>
                <td className="px-4 py-3 text-slate-600">{a.email || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${a.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {a.role === "superadmin" ? "سوپر ادمین" : "ادمین"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{a.isActive ? "فعال" : "غیرفعال"}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {a.role !== "superadmin" && (
                    <button onClick={() => handleDelete(a.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal ساخت ادمین جدید */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>

          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900"><Shield className="inline size-5 ms-1 text-purple-600" strokeWidth={1.6} /> ادمین جدید</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">نام</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">شماره موبایل</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">رمز عبور (حداقل ۶ کاراکتر)</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">دسترسی‌ها</label>
                <div className="flex flex-wrap gap-2">
                  {ADMIN_MODULES.map(m => (
                    <label key={m.key} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={permissions.includes(m.key)} onChange={e => setPermissions(e.target.checked ? [...permissions, m.key] : permissions.filter(p => p !== m.key))} className="size-3.5 accent-purple-600" />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600">انصراف</button>
              <button onClick={handleCreate} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                {saving ? "..." : "ایجاد ادمین"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
