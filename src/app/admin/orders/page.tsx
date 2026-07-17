"use client";

import { useEffect, useState } from "react";
import { Search, Eye, Download, Plus, Trash2, Package, MapPin, Clock, Truck, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatRial } from "@/lib/utils";
import { exportDataAsCsv } from "@/lib/chart-export";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

type Order = { id: number; orderNumber: string; status: string; totalAmount: string; createdAt: Date; userName: string | null; shippingMethodId: number | null; };

type TrackingEvent = {
  id: number;
  orderId: number;
  status: string;
  title: string;
  description: string | null;
  trackingCode: string | null;
  estimatedDelivery: string | null;
  location: string | null;
  createdAt: string;
};

const TRACKING_STATUS_MAP: Record<string, { label: string; icon: string }> = {
  processing: { label: "در حال پردازش", icon: "📦" },
  picked_up: { label: "مرسوله تحویل پیک شد", icon: "📮" },
  in_transit: { label: "در مسیر ارسال", icon: "🚚" },
  out_for_delivery: { label: "خارج از مرکز توزیع", icon: "🚛" },
  delivered: { label: "تحویل داده شد", icon: "✅" },
  failed_attempt: { label: "تلاش ناموفق", icon: "❌" },
  returned: { label: "مرجوع شد", icon: "↩️" },
  customs: { label: "در گمرک", icon: "🏛️" },
  warehouse: { label: "در انبار", icon: "🏭" },
};
const STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "در انتظار پرداخت", color: "amber" },
  paid: { label: "پرداخت شده", color: "blue" },
  processing: { label: "آماده‌سازی", color: "indigo" },
  shipped: { label: "ارسال شده", color: "petrol" },
  delivered: { label: "تحویل شده", color: "green" },
  cancelled: { label: "لغو شده", color: "red" },
};

const colorClass = (c: string) => c === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" : c === "blue" ? "border-blue-200 bg-blue-50 text-blue-700" : c === "green" ? "border-green-200 bg-green-50 text-green-700" : c === "red" ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 bg-slate-50 text-slate-600";
const statusBadge = (s: string) => { const m = STATUS_MAP[s]; if (!m) return "bg-slate-100 text-slate-600"; const c = m.color; return c === "amber" ? "bg-amber-100 text-amber-700" : c === "blue" ? "bg-blue-100 text-blue-700" : c === "green" ? "bg-green-100 text-green-700" : c === "red" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"; };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showAddTracking, setShowAddTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    status: "picked_up",
    title: "",
    description: "",
    trackingCode: "",
    location: "",
    estimatedDelivery: "",
  });
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [expandedTracking, setExpandedTracking] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats?type=recent-orders&limit=50").then(r => r.json()).then(d => setOrders(d.data || [])).finally(() => setLoading(false));
  }, []);

  // قفل اسکرول بدنه وقتی مودال باز است
  useEffect(() => {
    if (selected) {
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
  }, [selected]);

  const loadTracking = async (orderId: number) => {
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`);
      const data = await res.json();
      if (data.ok) setTrackingEvents(data.data);
    } catch {
      // ignore
    } finally {
      setTrackingLoading(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelected(order);
    setShowAddTracking(false);
    setTrackingForm({ status: "picked_up", title: "", description: "", trackingCode: "", location: "", estimatedDelivery: "" });
    loadTracking(order.id);
  };

  const handleAddTracking = async () => {
    if (!trackingForm.title.trim()) {
      toast.error("عنوان رویداد الزامی است.");
      return;
    }
    if (!selected) return;
    setTrackingSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${selected.id}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackingForm),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("رویداد رهگیری اضافه شد");
        setShowAddTracking(false);
        setTrackingForm({ status: "picked_up", title: "", description: "", trackingCode: "", location: "", estimatedDelivery: "" });
        await loadTracking(selected.id);
        // رفرش لیست سفارشات
        const res2 = await fetch("/api/admin/stats?type=recent-orders&limit=50");
        const data2 = await res2.json();
        if (data2.ok) setOrders(data2.data || []);
      } else {
        toast.error(data.error || "خطا در ذخیره");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setTrackingSaving(false);
    }
  };

  const handleDeleteTracking = async (eventId: number) => {
    if (!confirm("آیا از حذف این رویداد رهگیری اطمینان دارید؟")) return;
    if (!selected) return;
    try {
      const res = await fetch(`/api/admin/orders/${selected.id}/tracking?eventId=${eventId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("رویداد رهگیری حذف شد");
        await loadTracking(selected.id);
      } else {
        toast.error(data.error || "خطا در حذف");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    }
  };

  const filtered = orders.filter(o => (filter === "all" || o.status === filter) && (!search || o.orderNumber.includes(search) || (o.userName || "").includes(search)));
  const stats = STATUSES.map(s => ({ status: s, count: orders.filter(o => o.status === s).length, ...STATUS_MAP[s] }));

  // پیشنهاد عنوان بر اساس وضعیت
  const suggestTitle = (status: string) => {
    const suggestions: Record<string, string> = {
      picked_up: "مرسوله به پست تحویل داده شد",
      in_transit: "مرسوله در مسیر ارسال",
      out_for_delivery: "مرسوله در مرکز توزیع مقصد",
      delivered: "مرسوله با موفقیت تحویل داده شد",
      failed_attempt: "تحویل ناموفق - مشتری در محل نبود",
      returned: "مرسوله به فرستنده بازگشت داده شد",
      customs: "مرسوله در گمرک",
      warehouse: "مرسوله در انبار",
    };
    return suggestions[status] || "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">مدیریت سفارشات</h1>
        <p className="mt-1 text-sm text-slate-500">{orders.length} سفارش موجود</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {stats.map(s => <div key={s.status} className={`rounded-xl border p-3 text-center ${colorClass(s.color)}`}>
          <p className="text-lg font-black">{s.count}</p>
          <p className="text-[10px] font-medium">{s.label}</p>
        </div>)}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="size-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..." className="flex-1 bg-transparent text-xs outline-none" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none">
          <option value="all">همه وضعیت‌ها</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>)}
        </select>
        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={() => exportDataAsCsv(
            filtered.map(o => ({
              "شماره سفارش": o.orderNumber,
              "مشتری": o.userName || "—",
              "مبلغ": o.totalAmount,
              "وضعیت": STATUS_MAP[o.status]?.label || o.status,
              "تاریخ": new Date(o.createdAt).toLocaleDateString("fa-IR"),
            })),
            `سفارشات-${new Date().toLocaleDateString("fa-IR")}`,
          )}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
        >
          <Download className="size-4" />
          خروجی Excel
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-right font-semibold text-slate-600">سفارش</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">مشتری</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">مبلغ</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">وضعیت</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">تاریخ</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">جزئیات</th>
            </tr></thead>
            <tbody>
              {filtered.map(o => <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                <td className="px-4 py-3 font-bold text-slate-900">#{o.orderNumber}</td>
                <td className="px-4 py-3 text-slate-600">{o.userName || "—"}</td>
                <td className="px-4 py-3 text-left font-bold text-slate-900">{formatRial(o.totalAmount)}</td>
                <td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(o.status)}`}>{STATUS_MAP[o.status]?.label || o.status}</span></td>
                <td className="px-4 py-3 text-center text-slate-500">{new Date(o.createdAt).toLocaleDateString("fa-IR")}</td>
                <td className="px-4 py-3 text-center"><button onClick={() => openOrderDetail(o)} className="rounded-lg p-1.5 text-slate-400 hover:text-petrol-600"><Eye className="size-4" /></button></td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">سفارشی یافت نشد.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* هدر */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">سفارش #{selected.orderNumber}</h2>
              <button onClick={() => setSelected(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            {/* اطلاعات سفارش */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-6 p-4 rounded-xl bg-slate-50">
              <Row label="مشتری" value={selected.userName || "—"} />
              <Row label="مبلغ" value={formatRial(selected.totalAmount)} />
              <Row label="وضعیت" value={STATUS_MAP[selected.status]?.label || selected.status} />
              <Row label="تاریخ" value={new Date(selected.createdAt).toLocaleDateString("fa-IR")} />
            </div>

            {/* بخش رهگیری */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setExpandedTracking(!expandedTracking)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <Truck className="size-4 text-petrol-600" />
                  رهگیری مرسوله
                  <svg className={`size-3 transition-transform ${expandedTracking ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => { setShowAddTracking(!showAddTracking); setTrackingForm({ status: "picked_up", title: "", description: "", trackingCode: "", location: "", estimatedDelivery: "" }); }}
                  className="flex items-center gap-1.5 rounded-xl bg-petrol-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-petrol-500"
                >
                  <Plus className="size-3" />
                  رویداد جدید
                </button>
              </div>

              {/* فرم افزودن رویداد */}
              {showAddTracking && (
                <div className="rounded-xl border border-petrol-200 bg-petrol-50/50 p-4 mb-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900">رویداد رهگیری جدید</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-700">وضعیت</label>
                      <select
                        value={trackingForm.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          setTrackingForm({
                            ...trackingForm,
                            status: newStatus,
                            title: suggestTitle(newStatus) || trackingForm.title,
                          });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-petrol-500"
                      >
                        {Object.entries(TRACKING_STATUS_MAP).map(([key, val]) => (
                          <option key={key} value={key}>{val.icon} {val.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-700">عنوان رویداد *</label>
                      <input
                        type="text"
                        value={trackingForm.title}
                        onChange={(e) => setTrackingForm({ ...trackingForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-petrol-500"
                        placeholder="مثال: مرسوله به پست تحویل داده شد"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-700">کد رهگیری</label>
                      <input
                        type="text"
                        value={trackingForm.trackingCode}
                        onChange={(e) => setTrackingForm({ ...trackingForm, trackingCode: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-petrol-500"
                        placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-700">موقعیت مکانی</label>
                      <input
                        type="text"
                        value={trackingForm.location}
                        onChange={(e) => setTrackingForm({ ...trackingForm, location: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-petrol-500"
                        placeholder="مثال: تهران، مرکز توزیع"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-700">تخمین زمان تحویل</label>
                      <input
                        type="datetime-local"
                        value={trackingForm.estimatedDelivery}
                        onChange={(e) => setTrackingForm({ ...trackingForm, estimatedDelivery: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-petrol-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold text-slate-700">توضیحات</label>
                      <textarea
                        value={trackingForm.description}
                        onChange={(e) => setTrackingForm({ ...trackingForm, description: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-petrol-500 resize-none"
                        rows={2}
                        placeholder="توضیحات اضافی..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddTracking}
                      disabled={trackingSaving}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-petrol-600 to-petrol-700 px-4 py-2 text-[10px] font-semibold text-white shadow-md disabled:opacity-50"
                    >
                      {trackingSaving ? "..." : "افزودن رویداد"}
                    </button>
                    <button
                      onClick={() => setShowAddTracking(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-semibold text-slate-600"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              {/* لیست رویدادهای رهگیری */}
              {expandedTracking && (
                <div className="space-y-0">
                  {trackingLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="size-5 animate-spin rounded-full border-3 border-petrol-600 border-t-transparent" />
                    </div>
                  ) : trackingEvents.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                      <Package className="mx-auto size-8 text-slate-300 mb-2" />
                      <p className="text-xs font-medium text-slate-500">هیچ رویداد رهگیری ثبت نشده است.</p>
                      <p className="mt-1 text-[10px] text-slate-400">برای این سفارش هنوز رویداد رهگیری اضافه نشده.</p>
                    </div>
                  ) : (
                    <div className="relative pr-5">
                      {/* خط عمودی */}
                      <div className="absolute right-[7px] top-2 bottom-2 w-0.5 bg-petrol-200" />

                      {trackingEvents.map((event, index) => {
                        const ts = TRACKING_STATUS_MAP[event.status] || { label: event.status, icon: "📋" };
                        const isLast = index === trackingEvents.length - 1;
                        return (
                          <div key={event.id} className={`relative flex gap-3 pb-4 ${isLast ? "" : ""}`}>
                            {/* دایره روی خط */}
                            <div className="absolute -right-[13px] top-1 z-10 flex size-6 items-center justify-center rounded-full bg-petrol-100 border-2 border-white text-xs">
                              {ts.icon}
                            </div>
                            {/* محتوا */}
                            <div className="flex-1 mr-4 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{event.title}</p>
                                  <p className="text-[10px] text-slate-500">{ts.label}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(event.createdAt).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteTracking(event.id)}
                                    className="rounded p-0.5 text-slate-300 hover:text-red-500"
                                    title="حذف"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              </div>
                              {event.description && (
                                <p className="mt-0.5 text-[10px] text-slate-500">{event.description}</p>
                              )}
                              <div className="mt-1 flex flex-wrap gap-2">
                                {event.trackingCode && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">
                                    🏷️ {event.trackingCode}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">
                                    <MapPin className="size-2.5" /> {event.location}
                                  </span>
                                )}
                                {event.estimatedDelivery && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">
                                    <Clock className="size-2.5" /> {new Date(event.estimatedDelivery).toLocaleDateString("fa-IR")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* دکمه‌ها */}
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => downloadInvoicePdf(selected.orderNumber)}
                className="flex items-center gap-1.5 rounded-xl bg-petrol-600 px-4 py-2 text-[10px] font-semibold text-white hover:bg-petrol-500">
                <Download className="size-3.5" /> دانلود فاکتور (PDF)
              </button>
              <a href={`/api/invoices?orderNumber=${selected.orderNumber}`} target="_blank"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
                <ExternalLink className="size-3.5" /> مشاهده آنلاین
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}:</span><span className="font-semibold">{value}</span></div>;
}
