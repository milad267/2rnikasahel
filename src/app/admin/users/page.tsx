"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Edit,
  Search,
  Save,
  X,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Image,
  Download,
  ShoppingBag,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatRial } from "@/lib/utils";
import { ADMIN_MODULES, type AdminModule } from "@/lib/admin-permissions";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

type AdminUserRow = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: string;
  companyName?: string;
  isActive: boolean;
  createdAt?: string;
  permissions?: AdminModule[];
};

type RoleTemplate = {
  slug: string;
  name: string;
  modules: AdminModule[];
};

const BUILTIN_ROLES = [
  { value: "superadmin", label: "سوپر ادمین", desc: "دسترسی کامل به همه بخش‌ها", color: "purple" },
  { value: "admin", label: "ادمین", desc: "دسترسی مدیریتی محدود", color: "blue" },
];

function roleColor(role?: string) {
  if (!role) return "bg-slate-500";
  if (role === "superadmin") return "bg-purple-500";
  if (role === "admin") return "bg-blue-500";
  return "bg-slate-500";
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);

  const [search, setSearch] = useState("");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  // orders modal
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [ordersUser, setOrdersUser] = useState<AdminUserRow | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userOrdersItems, setUserOrdersItems] = useState<Record<number, any[]>>({});
  const [ordersLoading, setOrdersLoading] = useState(false);

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

  const [form, setForm] = useState({ name: "", phone: "", password: "", email: "", company: "" });
  const [role, setRole] = useState<string>("admin");
  const [permissions, setPermissions] = useState<(AdminModule | "*")[]>([]);
  const [saving, setSaving] = useState(false);

  // role templates
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ slug: "", name: "", modules: [] as AdminModule[] });

  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // modules list for UI checkboxes
  const ADMIN_MODULE_GROUPS = useMemo(() => {
    const groups: Record<string, { key: AdminModule; label: string }[]> = {
      "مدیریت فروشگاه": [],
      "محتوا": [],
      "سیستم": [],
      "هوش مصنوعی": [],
      "خدمات": [],
    };

    const groupMap: Record<string, string> = {
      products: "مدیریت فروشگاه",
      categories: "مدیریت فروشگاه",
      orders: "مدیریت فروشگاه",
      blog: "محتوا",
      slides: "محتوا",
      features: "محتوا",
      dashboard: "سیستم",
      users: "سیستم",
      settings: "سیستم",
      admins: "سیستم",
      ai: "هوش مصنوعی",
      "ai-price": "هوش مصنوعی",
      uploads: "خدمات",
      sms: "خدمات",
    };

    for (const mod of ADMIN_MODULES) {
      const g = groupMap[mod.key] || "سایر";
      if (!groups[g]) groups[g] = [];
      groups[g].push({ key: mod.key, label: mod.label });
    }

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([group, items]) => ({ group, items }));
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admin-users");
      const data = await res.json();
      if (data.ok) {
        setAdmins(data.admins as AdminUserRow[]);
      } else {
        toast.error(data?.error || "خطا در لود کاربران");
      }
    } catch {
      toast.error("خطا در لود کاربران");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/role-templates");
      const data = await res.json();
      if (data.ok) setTemplates(data.templates as RoleTemplate[]);
      else toast.error(data?.error || "خطا در لود قالب‌ها");
    } catch {
      toast.error("خطا در لود قالب‌ها");
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadTemplates();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim();
    if (!s) return admins;
    return admins.filter((a) => a.name?.includes(s) || a.phone?.includes(s));
  }, [admins, search]);

  const roleTemplatesBySlug = useMemo(() => {
    const m = new Map<string, RoleTemplate>();
    for (const t of templates) m.set(t.slug, t);
    return m;
  }, [templates]);

  const roleIsRoleTemplate = (r: string) => Boolean(roleTemplatesBySlug.get(r));

  const activeUsers = filtered;
  const roleTakenUsers = filtered.filter((u) => u.role !== "customer" && u.role !== "contractor");
  const nonRoleTakenUsers = filtered.filter((u) => u.role === "customer" || u.role === "contractor");

  async function syncPermissionsForUser(userId: number, roleValue: string) {
    const res = await fetch(`/api/admin/permissions?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(roleValue)}`);
    const data = await res.json();
    if (!data.ok) {
      toast.error(data?.error || "خطا در لود دسترسی‌ها");
      return [];
    }
    return (data.modules || []) as AdminModule[];
  }

  function openCreate() {
    setEditingUser(null);
    setForm({ name: "", phone: "", password: "", email: "", company: "" });
    setRole("admin");
    setPermissions([]);
    setShowModal(true);
  }

  async function openEdit(user: AdminUserRow) {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      password: "",
      email: user.email || "",
      company: user.companyName || "",
    });

    setRole(user.role || "admin");

    // For non-superadmin, backend returns empty permissions in GET /api/admin/admin-users.
    // So we fetch permissions explicitly.
    if (user.role === "superadmin") {
      // superadmin permissions are all modules; backend might not provide them
      // We'll fetch anyway for consistency.
    }

    const perms = await syncPermissionsForUser(user.id, user.role || "customer");
    setPermissions(perms);

    setShowModal(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این کاربر مطمئن هستید؟")) return;
    const res = await fetch(`/api/admin/admin-users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      toast.success("✅ حذف شد");
      await loadUsers();
    } else toast.error(data?.error || "خطا");
  }

  async function toggleActive(id: number, current: boolean) {
    const res = await fetch("/api/admin/admin-users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !current }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success(!current ? "✅ فعال شد" : "⛔ غیرفعال شد");
      await loadUsers();
    } else toast.error(data?.error || "خطا");
  }

  async function openUserOrders(user: AdminUserRow) {
    setOrdersUser(user);
    setShowOrdersModal(true);
    setOrdersLoading(true);
    setUserOrders([]);
    setUserOrdersItems({});
    try {
      const res = await fetch(`/api/admin/users/${user.id}/orders`);
      const data = await res.json();
      if (data.ok) {
        setUserOrders(data.orders || []);
        setUserOrdersItems(data.itemsByOrder || {});
      } else {
        toast.error(data?.error || "خطا در دریافت سفارش‌ها");
      }
    } catch {
      toast.error("خطا در دریافت سفارش‌ها");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function applyTemplate(templateSlug: string) {
    const t = roleTemplatesBySlug.get(templateSlug);
    if (!t) {
      toast.error("قالب پیدا نشد");
      return;
    }
    setRole(t.slug);
    setPermissions(t.modules);
  }

  async function handleSave() {
    if (!form.name || !form.phone || (!editingUser && form.password.length < 6)) {
      toast.error("نام، شماره موبایل و رمز عبور (حداقل ۶ کاراکتر) الزامی است");
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const body: any = {
          id: editingUser.id,
          permissions,
          role,
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          companyName: form.company || null,
        };
        // اگر رمز عبور پر شده بود، بفرست
        if (form.password && form.password.length >= 6) {
          body.password = form.password;
        }
        const res = await fetch("/api/admin/admin-users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ کاربر با موفقیت به‌روزرسانی شد");
          setShowModal(false);
          await loadUsers();
        } else toast.error(data?.error || "خطا");
      } else {
        const res = await fetch("/api/admin/admin-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            password: form.password,
            email: form.email,
            companyName: form.company,
            permissions,
            // backend role is restricted to admin; for custom roles, we need an additional backend change.
            // So create flow will still create admin account only.
            // Role application is managed via PUT after creation.
            role,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("✅ کاربر ساخته شد");
          setShowModal(false);
          await loadUsers();
        } else toast.error(data?.error || "خطا");
      }
    } catch {
      toast.error("خطا");
    } finally {
      setSaving(false);
    }
  }

  const MODULES_FOR_UI = useMemo(() => {
    return ADMIN_MODULES.map((m) => m.key);
  }, []);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Users className="size-6 text-petrol-600" strokeWidth={1.6} /> مدیریت کاربران
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {admins.length} کاربر
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800"
        >
          <UserPlus className="size-4" /> کاربر جدید
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" strokeWidth={1.6} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کاربر..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 text-xs outline-none focus:border-petrol-500"
          />
        </div>
      </div>

      {/* Users sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-800">کاربران عادی</p>
            <p className="text-xs text-slate-500">customer/contractor</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-3 text-right font-semibold text-slate-600">نام</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">نقش</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {nonRoleTakenUsers.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("flex size-8 items-center justify-center rounded-full text-white text-[10px] font-bold", roleColor(a.role))}>
                        {a.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold">
                      {a.role || "customer"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(a.id, a.isActive)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all",
                        a.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-600 hover:bg-red-200",
                      )}
                    >
                      {a.isActive ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                      {a.isActive ? "فعال" : "غیرفعال"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"
                        title="ویرایش"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => openUserOrders(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"
                        title="سفارش‌ها"
                      >
                        <ShoppingBag className="size-3.5" />
                      </button>
                      {a.role !== "superadmin" && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {nonRoleTakenUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    موردی نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-800">کاربران نقش‌گرفته</p>
            <p className="text-xs text-slate-500">role != customer/contractor</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-3 text-right font-semibold text-slate-600">نام</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">نقش</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {roleTakenUsers.map((a) => {
                const t = roleTemplatesBySlug.get(a.role);
                const roleLabel = t?.name || a.role;
                return (
                  <tr key={a.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("flex size-8 items-center justify-center rounded-full text-white text-[10px] font-bold", roleColor(a.role))}>
                          {a.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-[10px] font-bold">
                        {roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(a.id, a.isActive)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all",
                          a.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-600 hover:bg-red-200",
                        )}
                      >
                        {a.isActive ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                        {a.isActive ? "فعال" : "غیرفعال"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(a)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"
                          title="ویرایش"
                        >
                          <Edit className="size-3.5" />
                        </button>
                        <button
                          onClick={() => openUserOrders(a)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-petrol-600"
                          title="سفارش‌ها"
                        >
                          <ShoppingBag className="size-3.5" />
                        </button>
                        {a.role !== "superadmin" && (
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="حذف"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {roleTakenUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    موردی نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="size-5 text-purple-600" />
                {editingUser ? `ویرایش: ${editingUser.name}` : "کاربر جدید"}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-[11px] font-bold text-slate-700 mb-3">اطلاعات پایه</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-600">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-600">شماره موبایل</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* فیلد ایمیل - برای کاربر جدید و ویرایش */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-600">ایمیل</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* فیلد شرکت - برای کاربر جدید و ویرایش */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-600">شرکت / سازمان</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* فیلد رمز عبور جدید */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-600">
                      {editingUser ? "رمز عبور جدید (اختیاری)" : "رمز عبور *"}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder={editingUser ? "در صورت تمایل رمز جدید وارد کنید" : "حداقل ۶ کاراکتر"}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                    {editingUser && (
                      <p className="mt-0.5 text-[9px] text-amber-500">خالی بگذارید تا رمز فعلی保持不变</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-600">نقش (role)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* نقش‌های ثابت */}
                      {BUILTIN_ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => { setRole(r.value); setPermissions(r.value === "superadmin" ? ["*"] : permissions); }}
                          className={cn(
                            "rounded-lg border px-2.5 py-2 text-[10px] font-medium transition-all text-right",
                            role === r.value
                              ? "border-purple-300 bg-purple-50 text-purple-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300",
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setRole("customer"); setPermissions([]); }}
                        className={cn(
                          "rounded-lg border px-2.5 py-2 text-[10px] font-medium transition-all text-right",
                          role === "customer" ? "border-purple-300 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        مشتری (customer)
                      </button>
                      {/* قالب‌های role template */}
                      {templates.map((t) => (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => applyTemplate(t.slug)}
                          className={cn(
                            "rounded-lg border px-2.5 py-2 text-[10px] font-medium transition-all text-right",
                            role === t.slug
                              ? "border-purple-300 bg-purple-50 text-purple-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300",
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {roleIsRoleTemplate(role) && (
                  <div className="mt-3 text-[10px] text-slate-600">
                    قالب انتخاب‌شده: <span className="font-bold">{roleTemplatesBySlug.get(role)?.name}</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-slate-700">دسترسی‌های ماژول</p>
                  <span className="text-[10px] text-slate-500">{permissions.length} ماژول</span>
                </div>

                {/* چک‌باکس دسترسی‌ها */}
                <div className="space-y-3">
                  {ADMIN_MODULE_GROUPS.map(({ group, items }) => (
                    <div key={group}>
                      <p className="text-[10px] font-bold text-slate-500 mb-1.5">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((mod) => {
                          const checked = permissions.includes(mod.key);
                          return (
                            <button
                              key={mod.key}
                              type="button"
                              onClick={() => {
                                if (role === "superadmin") {
                                  toast.error("دسترسی سوپر ادمین قابل تغییر نیست");
                                  return;
                                }
                                setPermissions((prev) =>
                                  checked
                                    ? prev.filter((p) => p !== mod.key)
                                    : [...prev, mod.key]
                                );
                              }}
                              className={cn(
                                "rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all",
                                checked
                                  ? "border-purple-300 bg-purple-50 text-purple-700"
                                  : "border-slate-200 text-slate-500 hover:border-slate-300",
                                role === "superadmin" && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              {mod.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {permissions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-1.5">کلیدهای فعال:</p>
                    <div className="flex flex-wrap gap-1">
                      {permissions.map((m) => (
                        <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600 font-mono">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-slate-50/50">
              <p className="text-[10px] text-slate-400">نقش: {role}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  انصراف
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50 hover:bg-slate-800"
                >
                  <Save className="size-4" /> {saving ? "..." : "ذخیره"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: سفارش‌های کاربر */}
      {showOrdersModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowOrdersModal(false)}
        >
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="size-5 text-petrol-600" />
                {ordersUser ? `سفارش‌های ${ordersUser.name}` : "سفارش‌ها"}
              </h2>
              <button onClick={() => setShowOrdersModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-petrol-600" />
                </div>
              ) : userOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="mx-auto size-12 text-slate-300" strokeWidth={1.2} />
                  <p className="mt-4 text-sm font-semibold text-slate-500">هنوز سفارشی ثبت نشده</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map((order: any) => {
                    const items = userOrdersItems[order.id] || [];
                    const statusLabels: Record<string, string> = {
                      pending_payment: "در انتظار پرداخت", paid: "پرداخت شده",
                      processing: "در حال پردازش", shipped: "ارسال شده",
                      delivered: "تحویل شده", cancelled: "لغو شده",
                    };
                    const statusColors: Record<string, string> = {
                      pending_payment: "bg-amber-100 text-amber-700",
                      paid: "bg-blue-100 text-blue-700",
                      processing: "bg-indigo-100 text-indigo-700",
                      shipped: "bg-petrol-100 text-petrol-700",
                      delivered: "bg-green-100 text-green-700",
                      cancelled: "bg-red-100 text-red-600",
                    };
                    return (
                      <div key={order.id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">#{order.orderNumber}</span>
                            <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold", statusColors[order.status] || "bg-slate-100 text-slate-600")}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
                            <button onClick={() => downloadInvoicePdf(order.orderNumber)}
                              className="flex items-center gap-1 rounded-lg bg-petrol-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-petrol-500">
                              <Download className="size-3" /> دانلود فاکتور
                            </button>
                            <a href={`/api/invoices?orderNumber=${order.orderNumber}`} target="_blank"
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>

                        {items.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {items.map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-semibold text-slate-900">{item.productTitle}</span>
                                  {item.variantTitle && <span className="text-[10px] text-slate-500 mr-1">- {item.variantTitle}</span>}
                                  <span className="text-[10px] text-slate-400 mr-2">×{item.quantity}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-900">{formatRial(item.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[10px] text-slate-400">
                            {order.shippingAddress ? `📍 ${order.shippingAddress.slice(0, 40)}...` : "بدون آدرس"}
                          </span>
                          <span className="text-sm font-black text-slate-900">{formatRial(order.totalAmount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

