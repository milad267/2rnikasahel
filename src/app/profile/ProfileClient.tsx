"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Building2, Phone, MapPin, ShieldCheck, Clock, Package,
  Pencil, Plus, Trash2, X, Save, KeyRound, Mail, Star, Camera,
  Bell, BellRing, BellOff, CreditCard, FileText, Download,
  Search, Filter, ChevronDown, ChevronUp, Eye, EyeOff,
	  Globe, Smartphone, LogOut, History, RefreshCw,
	  Copy, CheckCheck, Truck, Receipt, Lock, Shield, Loader2,
} from "lucide-react";
import { cn, formatRial } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { OrderTimeline } from "@/components/profile/OrderTimeline";
import { PayNowButton } from "@/components/orders/PayNowButton";
import { ProvinceCitySelect } from "@/components/ui/ProvinceCitySelect";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

/* ------------------------------------------------------------------ */
/*  types                                                               */
/* ------------------------------------------------------------------ */

type UserData = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  companyName: string | null;
  avatar: string | null;
  birthDate: string | null;
};

type AddressData = {
  id: number;
  userId: number;
  title: string;
  province: string;
  city: string;
  postalAddress: string;
  postalCode: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  isDefault: boolean;
};

type OrderData = {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  paymentRef: string | null;
  shippingAddress: string;
  createdAt: Date;
};

type Props = {
  user: UserData;
  orders: OrderData[];
  itemsByOrder: Record<number, any[]>;
  addresses: AddressData[];
};

const STATUS_LABELS: Record<string, { label: string; color: string; stage: number }> = {
  pending_payment: { label: "در انتظار پرداخت", color: "amber", stage: 0 },
  paid: { label: "پرداخت‌شده", color: "blue", stage: 1 },
  processing: { label: "در حال آماده‌سازی", color: "indigo", stage: 2 },
  shipped: { label: "ارسال‌شده", color: "petrol", stage: 3 },
  delivered: { label: "تحویل‌شده", color: "green", stage: 4 },
  cancelled: { label: "لغوشده", color: "red", stage: 0 },
};

/* ------------------------------------------------------------------ */
/*  main component                                                      */
/* ------------------------------------------------------------------ */

export function ProfileClient({ user: initialUser, orders, itemsByOrder, addresses: initialAddresses }: Props) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [addresses, setAddresses] = useState(initialAddresses);

  // modal states
  const [editProfile, setEditProfile] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [addressForm, setAddressForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<AddressData | null>(null);
  const [addrProvince, setAddrProvince] = useState("");
  const [addrCity, setAddrCity] = useState("");

  // form states
  const [formName, setFormName] = useState(user.name);
  const [formEmail, setFormEmail] = useState(user.email || "");
  const [formCompany, setFormCompany] = useState(user.companyName || "");
  const [formBirthDate, setFormBirthDate] = useState(user.birthDate || "");
  const [formCurrentPwd, setFormCurrentPwd] = useState("");
  const [formNewPwd, setFormNewPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // order filters
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");

  // avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"notifications" | "privacy" | "display">("notifications");
  const [notifSms, setNotifSms] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifTelegram, setNotifTelegram] = useState(false);
  const [notifOrderUpdates, setNotifOrderUpdates] = useState(true);
  const [notifPromotions, setNotifPromotions] = useState(false);
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [language, setLanguage] = useState<"fa" | "en">("fa");
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // دریافت آواتار در اولین لود
  useEffect(() => {
    fetch("/api/profile/avatar")
      .then(r => r.json())
      .then(d => { if (d.ok && d.url) setAvatarUrl(d.url); })
      .catch(() => {});
  }, []);

  const isContractor = user.role === "contractor";
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  // نمایش سطح دسترسی بر اساس نقش
  const roleLabel = (() => {
    switch (user.role) {
      case "superadmin": return "سوپر مدیر";
      case "admin": return "مدیر";
      case "contractor": return "پیمانکار / B2B";
      case "customer": return "مشتری";
      default: return "کاربر";
    }
  })();

  const roleColor = (() => {
    switch (user.role) {
      case "superadmin": return "text-purple-600";
      case "admin": return "text-petrol-600";
      case "contractor": return "text-blue-600";
      case "customer": return "text-navy-900";
      default: return "text-charcoal-500";
    }
  })();

  function clearMsg() { setMsg(null); }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMsg();
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail || null, companyName: formCompany || null, birthDate: formBirthDate || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setUser({ ...user, name: formName, email: formEmail || null, companyName: formCompany || null, birthDate: formBirthDate || null });
      setEditProfile(false);
      setMsg({ type: "success", text: "پروفایل با موفقیت به‌روزرسانی شد." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally { setLoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMsg();
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: formCurrentPwd, newPassword: formNewPwd }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setChangePassword(false);
      setFormCurrentPwd(""); setFormNewPwd("");
      setMsg({ type: "success", text: "رمز عبور با موفقیت تغییر کرد." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally { setLoading(false); }
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMsg();
    const fd = new FormData(e.target as HTMLFormElement);
    const body: Record<string, any> = Object.fromEntries(fd);
    try {
      const method = editingAddr ? "PUT" : "POST";
      if (editingAddr) body.id = editingAddr.id;
      const res = await fetch("/api/profile/addresses", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (editingAddr) { setAddresses(addresses.map((a) => (a.id === editingAddr.id ? data.address : a))); }
      else { setAddresses([data.address, ...addresses]); }
      setAddressForm(false); setEditingAddr(null);
      setMsg({ type: "success", text: editingAddr ? "آدرس ویرایش شد." : "آدرس جدید اضافه شد." });
    } catch (err) { setMsg({ type: "error", text: (err as Error).message }); }
    finally { setLoading(false); }
  }

  async function handleDeleteAddress(id: number) {
    if (!confirm("آیا از حذف این آدرس مطمئن هستید؟")) return;
    setLoading(true); clearMsg();
    try {
      const res = await fetch(`/api/profile/addresses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAddresses(addresses.filter((a) => a.id !== id));
      setMsg({ type: "success", text: "آدرس حذف شد." });
    } catch (err) { setMsg({ type: "error", text: (err as Error).message }); }
    finally { setLoading(false); }
  }

  async function handleSetDefault(id: number) {
    setLoading(true); clearMsg();
    try {
      const res = await fetch("/api/profile/addresses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isDefault: true }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) { setMsg({ type: "error", text: (err as Error).message }); }
    finally { setLoading(false); }
  }

  // ─── Filters ───
  const filteredOrders = orders.filter(o => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (orderSearch && !o.orderNumber.includes(orderSearch)) return false;
    return true;
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending_payment").length,
    processing: orders.filter(o => o.status === "processing" || o.status === "paid").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    delivered: orders.filter(o => o.status === "delivered").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem] [&_[id]]:scroll-mt-32">
        {/* پیام‌ها */}
        {msg && (
          <div className={cn("mb-4 rounded-2xl p-3 text-center text-xs font-bold", msg.type === "success" ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-600")}>
            {msg.text}
          </div>
        )}

        {/* ─── هدر پروفایل ─── */}
        <div id="profile" className="mb-8 flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-navy-900/10 bg-gradient-to-r from-navy-900/[0.04] via-pearl-100 to-petrol-600/[0.05] p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] sm:size-20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="size-full object-cover" />
                ) : isContractor ? (
                  <Building2 className="size-7 sm:size-10" strokeWidth={1.5} />
                ) : (
                  <User className="size-7 sm:size-10" strokeWidth={1.5} />
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-pearl-50 shadow-md border border-navy-900/10 text-navy-700 hover:bg-pearl-100 disabled:opacity-50" title="تغییر عکس پروفایل">
                {avatarUploading ? <Loader2 className="size-3 animate-spin" strokeWidth={1.8} /> : <Camera className="size-3" strokeWidth={1.8} />}
              </button>
              {/* اینپوت مخفی برای انتخاب فایل */}
              <input type="file" ref={fileInputRef} accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
                    const data = await res.json();
                    if (!data.ok) throw new Error(data.error);
                    setAvatarUrl(data.url);
                    toast("✅ عکس پروفایل با موفقیت تغییر کرد");
                  } catch (err: any) {
                    toast("❌ " + (err.message || "خطا در آپلود"));
                  } finally {
                    setAvatarUploading(false);
                    if (e.target) e.target.value = "";
                  }
                }} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg font-bold text-navy-900 sm:text-2xl">{user.name}</h1>
                <button type="button" onClick={() => { setFormName(user.name); setFormEmail(user.email || ""); setFormCompany(user.companyName || ""); setFormBirthDate(user.birthDate || ""); setEditProfile(true); }}
                  className="rounded-full p-1.5 text-charcoal-400 transition-colors hover:bg-navy-900/5 hover:text-petrol-600" title="ویرایش پروفایل">
                  <Pencil className="size-4" />
                </button>
                <span className={cn(
                  "rounded-full px-3 py-0.5 text-[10px] font-bold",
                  user.role === "superadmin" && "bg-purple-600/15 text-purple-700",
                  user.role === "admin" && "bg-petrol-600/15 text-petrol-700",
                  user.role === "contractor" && "bg-blue-600/15 text-blue-700",
                  user.role === "customer" && "bg-petrol-600/15 text-petrol-700",
                  !["superadmin", "admin", "contractor", "customer"].includes(user.role) && "bg-charcoal-600/15 text-charcoal-700"
                )}>
                  {roleLabel}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-500 sm:gap-3">
                <span className="flex items-center gap-1"><Phone className="size-3.5" /> {user.phone}</span>
                {user.email && <span className="flex items-center gap-1"><Mail className="size-3.5" /> {user.email}</span>}
              </div>
              {isContractor && user.companyName && <p className="mt-1 text-xs font-semibold text-petrol-700">{user.companyName}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-2 max-sm:w-full">
            <button type="button" onClick={() => setShowSettings(true)}
              className="rounded-full border border-navy-900/10 px-4 py-2.5 text-xs font-semibold text-navy-900 transition-all hover:bg-navy-900/[0.04] max-sm:w-full max-sm:px-3 max-sm:py-2">
              <Bell className="inline size-3.5 ml-1" strokeWidth={1.6} />تنظیمات حساب
            </button>
            <button type="button" onClick={() => setChangePassword(true)}
              className="rounded-full border border-navy-900/10 px-4 py-2.5 text-xs font-semibold text-navy-900 transition-all hover:bg-navy-900/[0.04] max-sm:w-full max-sm:px-3 max-sm:py-2">
              <KeyRound className="inline size-3.5 ml-1" strokeWidth={1.6} />تغییر رمز
            </button>
            <Link href="/shop" className="rounded-full bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-pearl-50 shadow-md transition-all hover:bg-petrol-500 max-sm:w-full max-sm:px-3 max-sm:py-2 max-sm:text-center">
              ثبت سفارش جدید
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* ═══ ستون اصلی: سفارش‌ها ═══ */}
          <div id="orders" className="space-y-6">
            {/* آمار سفارش‌ها */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: "کل", value: orderStats.total, color: "slate" },
                { label: "در انتظار", value: orderStats.pending, color: "amber" },
                { label: "در حال پردازش", value: orderStats.processing, color: "blue" },
                { label: "ارسال شده", value: orderStats.shipped, color: "petrol" },
                { label: "تحویل شده", value: orderStats.delivered, color: "green" },
                { label: "لغو شده", value: orderStats.cancelled, color: "red" },
              ].map(s => (
                <div key={s.label} className={cn("rounded-xl border p-2 text-center", `border-${s.color}-200 bg-${s.color}-50/50`)}>
                  <p className={cn("text-lg font-bold", `text-${s.color}-700`)}>{s.value}</p>
                  <p className="text-[8px] text-charcoal-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* جستجو و فیلتر */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-charcoal-400" strokeWidth={1.6} />
                <input type="text" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="جستجوی شماره سفارش..."
                  className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pr-9 text-xs outline-none focus:border-petrol-500" />
              </div>
              <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}
                className="rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-xs outline-none focus:border-petrol-500">
                <option value="all">همه سفارش‌ها</option>
                <option value="pending_payment">در انتظار پرداخت</option>
                <option value="processing">در حال پردازش</option>
                <option value="shipped">ارسال شده</option>
                <option value="delivered">تحویل شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
              <button className="rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-charcoal-500 hover:bg-navy-900/[0.04]" title="بروزرسانی">
                <RefreshCw className="size-3.5" strokeWidth={1.6} />
              </button>
            </div>

            {/* لیست سفارش‌ها */}
            {filteredOrders.length === 0 ? (
              <div className="card flex flex-col items-center justify-center rounded-[2rem] p-12 text-center">
                <Clock className="size-12 text-charcoal-400" strokeWidth={1.4} />
                <p className="mt-4 text-sm font-medium text-navy-900">هیچ سفارشی یافت نشد</p>
                <Link href="/shop" className="mt-6 rounded-full bg-petrol-600 px-6 py-2.5 text-xs font-semibold text-pearl-50 shadow-md">مشاهده فروشگاه</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const items = itemsByOrder[order.id] || [];
                  const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending_payment;
                  return (
                    <div key={order.id} className="card rounded-[1.75rem] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-900/10 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy-900">سفارش #{order.orderNumber}</span>
                          <span className="rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[10px] font-medium text-charcoal-500">
                            {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                          </span>
                          {order.paymentRef && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-mono text-blue-600" title="کد پیگیری">
                              <CheckCheck className="inline size-2.5 ml-0.5" strokeWidth={2} />
                              {order.paymentRef.slice(-8)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold", {
                            "bg-amber-100 text-amber-700": st.color === "amber",
                            "bg-green-100 text-green-700": st.color === "green",
                            "bg-red-100 text-red-600": st.color === "red",
                            "bg-petrol-100 text-petrol-700": st.color === "petrol",
                            "bg-blue-100 text-blue-700": st.color === "blue",
                          })}>{st.label}</span>
                          <button onClick={async () => {
                            await navigator.clipboard.writeText(order.orderNumber);
                            toast("شماره سفارش کپی شد");
                          }} className="text-charcoal-400 hover:text-navy-900">
                            <Copy className="size-3" strokeWidth={1.6} />
                          </button>
                        </div>
                      </div>

                      {order.status !== "cancelled" && <div className="mt-5"><OrderTimeline currentStage={st.stage} /></div>}

                      <div className="mt-5 space-y-2">
                        {items.map((it: any) => (
                          <div key={it.id} className="flex items-center justify-between rounded-xl bg-navy-900/[0.02] px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-xs font-bold text-navy-900">{it.productTitle}</p>
                              <p className="text-[10px] text-charcoal-500">{it.variantTitle} × {it.quantity}{it.sku ? ` · کد: ${it.sku}` : ""}</p>
                            </div>
                            <span className="text-xs font-semibold text-navy-900 mr-2">{formatRial(it.lineTotal)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-navy-900/10 pt-3">
                        <span className="text-xs text-charcoal-500">
                          {order.shippingAddress && <><Truck className="inline size-3 ml-1" strokeWidth={1.5} />{order.shippingAddress.slice(0, 30)}...</>}
                        </span>
                        <span className="font-black text-navy-900">{formatRial(order.totalAmount)}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link href={`/orders/${order.orderNumber}`}
                          className="rounded-full border border-navy-900/10 px-4 py-2 text-[11px] font-semibold text-navy-900 transition-all hover:bg-navy-900/[0.04]">
                          <Eye className="inline size-3 ml-1" strokeWidth={1.6} />جزئیات
                        </Link>
                        <button onClick={() => downloadInvoicePdf(order.orderNumber)}
                          className="rounded-full border border-petrol-100 bg-petrol-50 px-4 py-2 text-[11px] font-semibold text-petrol-700 transition-all hover:bg-petrol-100">
                          <Download className="inline size-3 ml-1" strokeWidth={1.6} />دانلود فاکتور
                        </button>
                        {order.status === "shipped" && (
                          <Link href={`/orders/${order.orderNumber}`}
                            className="rounded-full border border-petrol-100 bg-petrol-50 px-4 py-2 text-[11px] font-semibold text-petrol-700 transition-all hover:bg-petrol-100">
                            <Truck className="inline size-3 ml-1" strokeWidth={1.6} />پیگیری مرسوله
                          </Link>
                        )}
                        {items.length > 0 && (
                          <button onClick={() => {
                            const text = items.map((it: any) => `${it.productTitle} - ${it.variantTitle} × ${it.quantity}`).join("\n");
                            navigator.clipboard.writeText(text);
                            toast("لیست کالاها کپی شد");
                          }} className="rounded-full border border-navy-900/10 px-3 py-2 text-[10px] text-charcoal-500 hover:bg-navy-900/[0.04]">
                            <FileText className="inline size-3 ml-1" strokeWidth={1.5} />کپی لیست
                          </button>
                        )}
                        {order.status === "pending_payment" && <PayNowButton orderId={order.id} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ ستون کناری ═══ */}
          <div className="space-y-6">
            {/* ─── آدرس‌ها ─── */}
            <div className="card rounded-[2rem] p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                  <MapPin className="size-5 text-petrol-600" strokeWidth={1.8} />
                  آدرس‌ها ({addresses.length})
                </h2>
                <button type="button" onClick={() => { setEditingAddr(null); setAddrProvince(""); setAddrCity(""); setAddressForm(true); }}
                  className="flex items-center gap-1 rounded-full bg-petrol-600 px-3 py-1.5 text-[10px] font-bold text-pearl-50 shadow-md hover:bg-petrol-500">
                  <Plus className="size-3" /> جدید
                </button>
              </div>

              {addresses.length === 0 ? (
                <p className="mt-4 text-xs leading-6 text-charcoal-500">هنوز آدرسی ثبت نکرده‌اید.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy-900">{addr.title}</span>
                          {addr.isDefault && <span className="rounded-full bg-petrol-600/10 px-2 py-0.5 text-[10px] text-petrol-700">پیش‌فرض</span>}
                          {addr.receiverName && <span className="text-[9px] text-charcoal-400">تحویل {addr.receiverName}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {!addr.isDefault && (
                            <button type="button" onClick={() => handleSetDefault(addr.id)} className="rounded-lg p-1 text-charcoal-400 hover:text-petrol-600" title="پیش‌فرض">
                              <Star className="size-3.5" />
                            </button>
                          )}
                          <button type="button" onClick={() => { setEditingAddr(addr); setAddrProvince(addr.province); setAddrCity(addr.city); setAddressForm(true); }}
                            className="rounded-lg p-1 text-charcoal-400 hover:text-petrol-600"><Pencil className="size-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="rounded-lg p-1 text-charcoal-400 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-charcoal-500">{addr.province}، {addr.city}، {addr.postalAddress}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-charcoal-400">
                        {addr.postalCode && <span>📮 {addr.postalCode}</span>}
                        {addr.receiverPhone && <span>📞 {addr.receiverPhone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── امنیت حساب ─── */}
            <div id="settings" className="card rounded-[2rem] p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <ShieldCheck className="size-5 text-petrol-600" strokeWidth={1.8} />
                امنیت حساب
              </h2>
              <div className="mt-4 space-y-3 text-xs text-charcoal-500">
                {[
                  { label: "شماره موبایل", icon: "smartphone", Icon: Smartphone, value: "تأییدشده", valueColor: "text-green-600" },
                  { label: "رمز عبور", icon: "lock", Icon: Lock, value: "فعال", valueColor: "text-green-600" },
                  { label: "سطح دسترسی", icon: "shield", Icon: Shield, value: roleLabel, valueColor: roleColor },
                  { label: "ایمیل", icon: "mail", Icon: Mail, value: user.email ? "ثبت شده" : "ثبت نشده", valueColor: user.email ? "text-green-600" : "text-amber-600" },
                  { label: "ورودهای اخیر", icon: "clock", Icon: Clock, value: "لحظاتی پیش", valueColor: "text-charcoal-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-t border-navy-900/5 py-2">
                    <span className="flex items-center gap-1.5">
                      <item.Icon className="size-3.5 text-charcoal-400" strokeWidth={1.5} />
                      {item.label}
                    </span>
                    <span className={cn("font-semibold", item.valueColor)}>{item.value}</span>
                  </div>
                ))}
                <div className="border-t border-navy-900/5 pt-2">
                  <button type="button" onClick={() => setChangePassword(true)} className="text-petrol-600 underline hover:text-petrol-500 text-xs">
                    تغییر رمز عبور
                  </button>
                </div>
              </div>
            </div>

            {/* ─── فعالیت‌های اخیر ─── */}
            <div className="card rounded-[2rem] p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <History className="size-5 text-petrol-600" strokeWidth={1.8} />
                آخرین فعالیت‌ها
              </h2>
              <div className="mt-4 space-y-3">
                {orders.slice(0, 5).map((order) => {
                  const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending_payment;
                  return (
                    <div key={order.id} className="flex items-start gap-3 border-b border-navy-900/5 pb-2 last:border-0">
                      <div className={cn("mt-0.5 size-2 rounded-full shrink-0", {
                        "bg-amber-400": st.color === "amber", "bg-green-500": st.color === "green",
                        "bg-red-500": st.color === "red", "bg-petrol-500": st.color === "petrol",
                        "bg-blue-500": st.color === "blue",
                      })} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-navy-900">سفارش {order.orderNumber}</p>
                        <p className="text-[9px] text-charcoal-400">{st.label}</p>
                      </div>
                      <span className="text-[9px] text-charcoal-400 shrink-0">{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                  );
                })}
                {orders.length === 0 && <p className="text-[10px] text-charcoal-500 text-center py-4">هنوز فعالیتی ثبت نشده</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  Modal: ویرایش پروفایل                                             */}
      {/* ================================================================ */}
      {editProfile && (
        <Modal onClose={() => setEditProfile(false)} title="ویرایش پروفایل">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Field label="نام و نام خانوادگی" value={formName} onChange={setFormName} required />
            <Field label="ایمیل" value={formEmail} onChange={setFormEmail} dir="ltr" type="email" />
            <Field label="تاریخ تولد" value={formBirthDate} onChange={setFormBirthDate} type="date" />
            <Field label="شماره موبایل" value={user.phone} disabled dir="ltr" />
            {isContractor && <Field label="نام شرکت" value={formCompany} onChange={setFormCompany} />}
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditProfile(false)} className="flex-1 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">انصراف</button>
              <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 disabled:opacity-50">
                {loading ? "..." : <><Save className="size-4" /> ذخیره</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/*  Modal: تغییر رمز عبور                                            */}
      {/* ================================================================ */}
      {changePassword && (
        <Modal onClose={() => setChangePassword(false)} title="تغییر رمز عبور">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">رمز عبور فعلی</label>
              <input type="password" required value={formCurrentPwd} onChange={(e) => setFormCurrentPwd(e.target.value)}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500" dir="ltr" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
              <input type="password" required minLength={6} value={formNewPwd} onChange={(e) => setFormNewPwd(e.target.value)}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500" dir="ltr" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setChangePassword(false)} className="flex-1 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">انصراف</button>
              <button type="submit" disabled={loading || formNewPwd.length < 6}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 disabled:opacity-50">
                {loading ? "..." : <><KeyRound className="size-4" /> تغییر رمز</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/*  Modal: آدرس جدید / ویرایش آدرس                                   */}
      {/* ================================================================ */}
      {addressForm && (
        <Modal onClose={() => { setAddressForm(false); setEditingAddr(null); }} title={editingAddr ? "ویرایش آدرس" : "آدرس جدید"}>
          <form onSubmit={handleAddressSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان (منزل، دفتر)" name="title" defaultValue={editingAddr?.title || ""} required />
              <Field label="کد پستی" name="postalCode" defaultValue={editingAddr?.postalCode || ""} dir="ltr" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نام تحویل‌گیرنده" name="receiverName" defaultValue={editingAddr?.receiverName || ""} />
              <Field label="تلفن تحویل‌گیرنده" name="receiverPhone" defaultValue={editingAddr?.receiverPhone || ""} dir="ltr" />
            </div>
            <ProvinceCitySelect province={addrProvince} city={addrCity} onProvinceChange={setAddrProvince} onCityChange={setAddrCity} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">آدرس کامل</label>
              <textarea name="postalAddress" required rows={3} defaultValue={editingAddr?.postalAddress || ""}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAddressForm(false); setEditingAddr(null); }} className="flex-1 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">انصراف</button>
              <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 disabled:opacity-50">
                {loading ? "..." : <><Save className="size-4" /> {editingAddr ? "ویرایش" : "افزودن"}</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/*  Modal: تنظیمات حساب                                               */}
      {/* ================================================================ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="mx-4 w-full max-w-lg max-h-[85vh] flex flex-col rounded-[2rem] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* هدر مودال */}
            <div className="flex items-center justify-between p-6 border-b border-navy-900/10">
              <h3 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <Bell className="size-4 text-petrol-600" strokeWidth={1.8} />
                تنظیمات حساب
              </h3>
              <button onClick={() => setShowSettings(false)} className="rounded-full p-1 text-charcoal-400 hover:bg-navy-900/5">
                <X className="size-5" />
              </button>
            </div>

            {/* تب‌ها */}
            <div className="flex border-b border-navy-900/10 px-6">
              {[
                { id: "notifications", label: "🔔 اعلان‌ها" },
                { id: "privacy", label: "🔒 حریم خصوصی" },
                { id: "display", label: "🎨 نمایش" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setSettingsTab(tab.id as any)}
                  className={cn("px-4 py-3 text-[11px] font-semibold border-b-2 transition-all -mb-[1px]",
                    settingsTab === tab.id ? "border-petrol-600 text-petrol-700" : "border-transparent text-charcoal-500 hover:text-navy-900")}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* محتوای تب‌ها */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* ─── تب اعلان‌ها ─── */}
              {settingsTab === "notifications" && (
                <>
                  <p className="text-[10px] text-charcoal-500 leading-5">انتخاب کنید از چه راه‌هایی اطلاع‌رسانی دریافت کنید.</p>
                  <div className="space-y-3">
                    {[
                      { label: "📱 پیامک (SMS)", value: notifSms, set: setNotifSms, desc: "وضعیت سفارش‌ها و پیام‌های مهم" },
                      { label: "📧 ایمیل", value: notifEmail, set: setNotifEmail, desc: "فاکتورها و تأییدیه‌های خرید" },
                      { label: "🤖 تلگرام", value: notifTelegram, set: setNotifTelegram, desc: "اطلاع‌رسانی سریع وضعیت سفارش" },
                    ].map((item, i) => (
                      <label key={i} className="flex items-center justify-between rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 cursor-pointer hover:bg-navy-900/[0.04]">
                        <div>
                          <span className="text-xs font-medium text-navy-900">{item.label}</span>
                          <p className="text-[9px] text-charcoal-400 mt-0.5">{item.desc}</p>
                        </div>
                        <div className={cn("relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors shrink-0 overflow-hidden", item.value ? "bg-petrol-600" : "bg-navy-900/20")} onClick={() => item.set(!item.value)}>
                          <span className={cn("block size-4 rounded-full bg-white shadow-sm transition-transform", item.value ? "translate-x-4" : "translate-x-0")} />
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-navy-900/10 pt-4">
                    <p className="text-[10px] font-semibold text-navy-900 mb-2">دریافت اعلان برای:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "🛒 تغییر وضعیت سفارش", value: notifOrderUpdates, set: setNotifOrderUpdates },
                        { label: "🎉 تخفیف‌ها و پیشنهادها", value: notifPromotions, set: setNotifPromotions },
                      ].map((item, i) => (
                        <button key={i} onClick={() => item.set(!item.value)}
                          className={cn("rounded-lg border px-3 py-1.5 text-[10px] font-medium transition-all", item.value ? "border-petrol-200 bg-petrol-50 text-petrol-700" : "border-navy-900/10 text-charcoal-500 hover:bg-navy-900/[0.02]")}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── تب حریم خصوصی ─── */}
              {settingsTab === "privacy" && (
                <>
                  <p className="text-[10px] text-charcoal-500 leading-5">تنظیم کنید چه اطلاعاتی در پروفایل شما نمایش داده شود.</p>
                  <div className="space-y-3">
                    {[
                      { label: "📱 نمایش شماره موبایل در پروفایل", value: showPhone, set: setShowPhone },
                      { label: "📧 نمایش ایمیل در پروفایل", value: showEmail, set: setShowEmail },
                      { label: "📜 ذخیره تاریخچه جستجو", value: saveHistory, set: setSaveHistory },
                    ].map((item, i) => (
                      <label key={i} className="flex items-center justify-between rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 cursor-pointer hover:bg-navy-900/[0.04]">
                        <span className="text-xs font-medium text-navy-900">{item.label}</span>
                        <div className={cn("relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors shrink-0 overflow-hidden", item.value ? "bg-petrol-600" : "bg-navy-900/20")} onClick={() => item.set(!item.value)}>
                          <span className={cn("block size-4 rounded-full bg-white shadow-sm transition-transform", item.value ? "translate-x-4" : "translate-x-0")} />
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* ─── تب نمایش ─── */}
              {settingsTab === "display" && (
                <>
                  <p className="text-[10px] text-charcoal-500 leading-5">تنظیمات ظاهری حساب خود را سفارشی کنید.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-navy-900">زبان</label>
                      <select value={language} onChange={e => setLanguage(e.target.value as "fa" | "en")}
                        className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500">
                        <option value="fa">🇮🇷 فارسی</option>
                        <option value="en">🇬🇧 English</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-navy-900">قالب نمایش</label>
                      <div className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-[10px] font-medium text-charcoal-500">
                        حالت روشن برای همه بخش‌ها فعال است.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* فوتر */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-navy-900/10">
              <button onClick={() => setShowSettings(false)} className="rounded-full border border-navy-900/10 px-6 py-2.5 text-xs font-semibold text-navy-900">
                بستن
              </button>
              <button onClick={() => { setShowSettings(false); toast("✅ تنظیمات ذخیره شد"); }}
                className="rounded-full bg-petrol-600 px-6 py-2.5 text-xs font-semibold text-pearl-50 shadow-md hover:bg-petrol-500">
                <Save className="inline size-3.5 ml-1" strokeWidth={1.6} />ذخیره تنظیمات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  helpers                                                             */
/* ------------------------------------------------------------------ */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-charcoal-400 hover:bg-navy-900/5"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, value, defaultValue, onChange, required, dir, type, disabled }: {
  label: string; name?: string; value?: string; defaultValue?: string;
  onChange?: (v: string) => void; required?: boolean; dir?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-navy-900">{label}</label>
      <input name={name} type={type || "text"} value={value} defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        required={required} dir={dir} disabled={disabled}
        className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white disabled:opacity-60" />
    </div>
  );
}

function toast(msg: string) {
  const el = document.createElement("div");
  el.className = "fixed bottom-6 right-6 z-[999] rounded-2xl bg-navy-900 text-white px-5 py-3 text-xs font-semibold shadow-2xl animate-slideUp";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
