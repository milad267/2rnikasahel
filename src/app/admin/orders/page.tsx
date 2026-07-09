"use client";

import { useEffect, useState } from "react";
import { Search, Eye, Download } from "lucide-react";
import { formatRial } from "@/lib/utils";
import { exportDataAsCsv } from "@/lib/chart-export";

type Order = { id: number; orderNumber: string; status: string; totalAmount: string; createdAt: Date; userName: string | null; };
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

  useEffect(() => {
    fetch("/api/admin/stats?type=recent-orders&limit=50").then(r => r.json()).then(d => setOrders(d.data || [])).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => (filter === "all" || o.status === filter) && (!search || o.orderNumber.includes(search) || (o.userName || "").includes(search)));
  const stats = STATUSES.map(s => ({ status: s, count: orders.filter(o => o.status === s).length, ...STATUS_MAP[s] }));

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
                <td className="px-4 py-3 text-center"><button onClick={() => setSelected(o)} className="rounded-lg p-1.5 text-slate-400 hover:text-petrol-600"><Eye className="size-4" /></button></td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">سفارشی یافت نشد.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>

          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">سفارش #{selected.orderNumber}</h2>
              <button onClick={() => setSelected(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <Row label="مشتری" value={selected.userName || "—"} />
              <Row label="مبلغ" value={formatRial(selected.totalAmount)} />
              <Row label="وضعیت" value={STATUS_MAP[selected.status]?.label || selected.status} />
              <Row label="تاریخ" value={new Date(selected.createdAt).toLocaleDateString("fa-IR")} />
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
