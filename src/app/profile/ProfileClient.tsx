"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Building2, Phone, MapPin, ShieldCheck, Clock, Package,
  Pencil, Plus, Trash2, X, Save, KeyRound, Mail, Star,
} from "lucide-react";
import { cn, formatRial } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { OrderTimeline } from "@/components/profile/OrderTimeline";

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

  // form states
  const [formName, setFormName] = useState(user.name);
  const [formEmail, setFormEmail] = useState(user.email || "");
  const [formCompany, setFormCompany] = useState(user.companyName || "");
  const [formCurrentPwd, setFormCurrentPwd] = useState("");
  const [formNewPwd, setFormNewPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isContractor = user.role === "contractor";

  function clearMsg() {
    setMsg(null);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMsg();
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail || null, companyName: formCompany || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setUser({ ...user, name: formName, email: formEmail || null, companyName: formCompany || null });
      setEditProfile(false);
      setMsg({ type: "success", text: "پروفایل به‌روزرسانی شد." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
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
      setFormCurrentPwd("");
      setFormNewPwd("");
      setMsg({ type: "success", text: "رمز عبور با موفقیت تغییر کرد." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
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
      const res = await fetch("/api/profile/addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (editingAddr) {
        setAddresses(addresses.map((a) => (a.id === editingAddr.id ? data.address : a)));
      } else {
        setAddresses([data.address, ...addresses]);
      }
      setAddressForm(false);
      setEditingAddr(null);
      setMsg({ type: "success", text: editingAddr ? "آدرس ویرایش شد." : "آدرس جدید اضافه شد." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAddress(id: number) {
    if (!confirm("آیا از حذف این آدرس مطمئن هستید؟")) return;
    setLoading(true);
    clearMsg();
    try {
      const res = await fetch(`/api/profile/addresses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAddresses(addresses.filter((a) => a.id !== id));
      setMsg({ type: "success", text: "آدرس حذف شد." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefault(id: number) {
    setLoading(true);
    clearMsg();
    try {
      const res = await fetch("/api/profile/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 lg:pt-44">
      <div className="mx-auto max-w-7xl [&_[id]]:scroll-mt-32">
        {/* پیام‌ها */}
        {msg && (
          <div
            className={cn(
              "mb-4 rounded-2xl p-3 text-center text-xs font-bold",
              msg.type === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-600",
            )}
          >
            {msg.text}
          </div>
        )}

        {/* هدر پروفایل */}
        <div id="profile" className="mb-8 flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-navy-900/10 bg-gradient-to-r from-navy-900/[0.04] via-pearl-100 to-petrol-600/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] sm:size-20">
              {isContractor ? (
                <Building2 className="size-8 sm:size-10" strokeWidth={1.5} />
              ) : (
                <User className="size-8 sm:size-10" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">{user.name}</h1>
                <button
                  type="button"
                  onClick={() => {
                    setFormName(user.name);
                    setFormEmail(user.email || "");
                    setFormCompany(user.companyName || "");
                    setEditProfile(true);
                  }}
                  className="rounded-full p-1.5 text-charcoal-400 transition-colors hover:bg-navy-900/5 hover:text-petrol-600"
                  title="ویرایش پروفایل"
                >
                  <Pencil className="size-4" />
                </button>
                <span className="rounded-full bg-petrol-600/15 px-3 py-0.5 text-[10px] font-bold text-petrol-700">
                  {isContractor ? "پیمانکار / B2B" : "مشتری حقیقی"}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500 sm:text-sm" dir="ltr">
                <Phone className="size-3.5" />
                {user.phone}
              </p>
              {isContractor && user.companyName && (
                <p className="mt-1 text-xs font-semibold text-petrol-700">{user.companyName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChangePassword(true)}
              className="rounded-full border border-navy-900/10 px-4 py-2.5 text-xs font-semibold text-navy-900 transition-all hover:bg-navy-900/[0.04]"
            >
              تغییر رمز عبور
            </button>
            <Link
              href="/shop"
              className="rounded-full bg-petrol-600 px-5 py-2.5 text-xs font-semibold text-pearl-50 shadow-md transition-all hover:bg-petrol-500"
            >
              ثبت سفارش جدید
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* تاریخچه سفارش‌ها */}
          <div id="orders" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
                <Package className="size-5 text-petrol-600" strokeWidth={1.8} />
                تاریخچه سفارش‌ها ({orders.length})
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="card flex flex-col items-center justify-center rounded-[2rem] p-12 text-center">
                <Clock className="size-12 text-charcoal-400" strokeWidth={1.4} />
                <p className="mt-4 text-sm font-medium text-navy-900">هنوز سفارشی ثبت نکرده‌اید</p>
                <Link href="/shop" className="mt-6 rounded-full bg-petrol-600 px-6 py-2.5 text-xs font-semibold text-pearl-50 shadow-md">
                  مشاهده فروشگاه
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
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
                        </div>
                        <span
                          className={cn("rounded-full px-3 py-1 text-[11px] font-bold", {
                            "bg-amber-100 text-amber-700": st.color === "amber",
                            "bg-green-100 text-green-700": st.color === "green",
                            "bg-red-100 text-red-600": st.color === "red",
                            "bg-petrol-100 text-petrol-700": st.color === "petrol",
                            "bg-blue-100 text-blue-700": st.color === "blue",
                          })}
                        >
                          {st.label}
                        </span>
                      </div>
                      {order.status !== "cancelled" && (
                        <div className="mt-5">
                          <OrderTimeline currentStage={st.stage} />
                        </div>
                      )}
                      <div className="mt-5 space-y-2">
                        {items.map((it: any) => (
                          <div key={it.id} className="flex items-center justify-between rounded-xl bg-navy-900/[0.02] px-3 py-2">
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-xs font-bold text-navy-900">{it.productTitle}</p>
                              <p className="text-[10px] text-charcoal-500">
                                {it.variantTitle} × {it.quantity}
                                {it.sku ? ` · کد: ${it.sku}` : ""}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-navy-900">{formatRial(it.lineTotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-navy-900/10 pt-3">
                        <span className="text-sm text-charcoal-500">مبلغ کل:</span>
                        <span className="font-black text-navy-900">{formatRial(order.totalAmount)}</span>
                      </div>
                      {order.paymentRef && (
                        <p className="mt-1 text-[10px] text-charcoal-500">
                          کد پیگیری: <span className="font-mono">{order.paymentRef}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ستون کناری — آدرس‌ها و امنیت */}
          <div className="space-y-6">
            {/* آدرس‌ها */}
            <div className="card rounded-[2rem] p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                  <MapPin className="size-5 text-petrol-600" strokeWidth={1.8} />
                  آدرس‌ها ({addresses.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddr(null);
                    setAddressForm(true);
                  }}
                  className="flex items-center gap-1 rounded-full bg-petrol-600 px-3 py-1.5 text-[10px] font-bold text-pearl-50 shadow-md hover:bg-petrol-500"
                >
                  <Plus className="size-3" />
                  آدرس جدید
                </button>
              </div>

              {addresses.length === 0 ? (
                <p className="mt-4 text-xs leading-6 text-charcoal-500">
                  هنوز آدرسی ثبت نکرده‌اید.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy-900">{addr.title}</span>
                          {addr.isDefault && (
                            <span className="rounded-full bg-petrol-600/10 px-2 py-0.5 text-[10px] text-petrol-700">پیش‌فرض</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(addr.id)}
                              className="rounded-lg p-1 text-charcoal-400 hover:text-petrol-600"
                              title="پیش‌فرض"
                            >
                              <Star className="size-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddr(addr);
                              setAddressForm(true);
                            }}
                            className="rounded-lg p-1 text-charcoal-400 hover:text-petrol-600"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="rounded-lg p-1 text-charcoal-400 hover:text-red-600"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-charcoal-500">
                        {addr.province}، {addr.city}، {addr.postalAddress}
                      </p>
                      {addr.postalCode && (
                        <p className="mt-1 text-[10px] text-charcoal-400">کد پستی: {addr.postalCode}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* امنیت حساب */}
            <div id="settings" className="card rounded-[2rem] p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <ShieldCheck className="size-5 text-petrol-600" strokeWidth={1.8} />
                وضعیت امنیت حساب
              </h2>
              <div className="mt-4 space-y-3 text-xs text-charcoal-500">
                <div className="flex items-center justify-between py-1">
                  <span>احراز هویت شماره موبایل</span>
                  <span className="font-semibold text-green-600">تأییدشده</span>
                </div>
                <div className="flex items-center justify-between border-t border-navy-900/5 py-1">
                  <span>سطح دسترسی</span>
                  <span className="font-semibold text-navy-900">
                    {isContractor ? "حساب B2B صنعتی" : "کاربر عادی"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-navy-900/5 py-1">
                  <button
                    type="button"
                    onClick={() => setChangePassword(true)}
                    className="text-petrol-600 underline hover:text-petrol-500"
                  >
                    تغییر رمز عبور
                  </button>
                </div>
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
            {isContractor && (
              <Field label="نام شرکت" value={formCompany} onChange={setFormCompany} />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditProfile(false)} className="flex-1 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 disabled:opacity-50"
              >
                {loading ? "در حال ذخیره..." : <><Save className="size-4" /> ذخیره تغییرات</>}
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
              <input
                type="password"
                required
                value={formCurrentPwd}
                onChange={(e) => setFormCurrentPwd(e.target.value)}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
              <input
                type="password"
                required
                minLength={6}
                value={formNewPwd}
                onChange={(e) => setFormNewPwd(e.target.value)}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setChangePassword(false)} className="flex-1 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading || formNewPwd.length < 6}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 disabled:opacity-50"
              >
                {loading ? "در حال تغییر..." : <><KeyRound className="size-4" /> تغییر رمز</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/*  Modal: افزودن/ویرایش آدرس                                        */}
      {/* ================================================================ */}
      {addressForm && (
        <Modal onClose={() => { setAddressForm(false); setEditingAddr(null); }} title={editingAddr ? "ویرایش آدرس" : "آدرس جدید"}>
          <form onSubmit={handleAddressSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان (مثلاً منزل، دفتر)" name="title" defaultValue={editingAddr?.title || ""} required />
              <Field label="استان" name="province" defaultValue={editingAddr?.province || ""} required />
              <Field label="شهر" name="city" defaultValue={editingAddr?.city || ""} required />
              <Field label="کد پستی" name="postalCode" defaultValue={editingAddr?.postalCode || ""} dir="ltr" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-navy-900">آدرس کامل</label>
              <textarea
                name="postalAddress"
                required
                rows={3}
                defaultValue={editingAddr?.postalAddress || ""}
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs outline-none focus:border-petrol-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAddressForm(false); setEditingAddr(null); }} className="flex-1 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 disabled:opacity-50"
              >
                {loading ? "در حال ذخیره..." : <><Save className="size-4" /> {editingAddr ? "ویرایش آدرس" : "افزودن آدرس"}</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  helper components                                                   */
/* ------------------------------------------------------------------ */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-charcoal-400 hover:bg-navy-900/5">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  defaultValue,
  onChange,
  required,
  dir,
  type,
}: {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  dir?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-navy-900">{label}</label>
      <input
        name={name}
        type={type || "text"}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        required={required}
        dir={dir}
        className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white"
      />
    </div>
  );
}
