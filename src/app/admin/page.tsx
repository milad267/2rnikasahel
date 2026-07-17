"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend,
} from "recharts";
import {
  Users, Package, ShoppingBag, Wallet, FileText, AlertTriangle,
  Clock, BarChart3, ExternalLink, Download, Image as ImageIcon,
  FileSpreadsheet, ChevronDown, TrendingUp, TrendingDown, Activity,
  Calendar, DollarSign, UserPlus, RefreshCw, Eye, ShoppingCart,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { formatRial, cn } from "@/lib/utils";
import { exportDataAsCsv, exportSvgAsPng } from "@/lib/chart-export";
import Link from "next/link";

// ─── types ───
type Overview = {
  products: number; variants: number; orders: number; users: number;
  pendingOrders: number; lowStockItems: number;
  avgOrderValue: string; totalRevenue: string; todayRevenue: string;
};
type SalesTrend = { date: string; total: string; count: number }[];
type OrderStatus = { status: string; count: number }[];
type MonthlySales = { month: string; total: string }[];
type TopCategory = { categoryTitle: string | null; totalSales: string; count: number }[];
type TopProduct = { id: number; title: string; totalSold: number; totalRevenue: string }[];
type RecentOrder = { id: number; orderNumber: string; status: string; totalAmount: string; createdAt: Date; userName: string | null };

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "در انتظار پرداخت", color: "#f59e0b" },
  paid: { label: "پرداخت‌شده", color: "#3b82f6" },
  processing: { label: "آماده‌سازی", color: "#6366f1" },
  shipped: { label: "ارسال‌شده", color: "#1c6a7c" },
  delivered: { label: "تحویل‌شده", color: "#10b981" },
  cancelled: { label: "لغوشده", color: "#ef4444" },
};

const CHART_COLORS = ["#1c6a7c", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#14b8a6"];

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrend>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales>([]);
  const [topCats, setTopCats] = useState<TopCategory>([]);
  const [topProds, setTopProds] = useState<TopProduct>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [newUsers, setNewUsers] = useState<{ date: string; count: number }[]>([]);
  const [convRate, setConvRate] = useState<{ totalUsers: number; deliveredOrders: number; rate: number } | null>(null);
  const [traffic, setTraffic] = useState<{ source: string; value: number; color: string }[]>([]);
  const [weeklyComp, setWeeklyComp] = useState<{ day: string; thisWeek: number; lastWeek: number }[]>([]);
  const [hourlyTraffic, setHourlyTraffic] = useState<{ hour: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url);
        return await res.json();
      } catch { return { data: null }; }
    };

    Promise.all([
      safeFetch("/api/admin/stats?type=overview"),
      safeFetch("/api/admin/stats?type=sales-trend&days=7"),
      safeFetch("/api/admin/stats?type=orders-status"),
      safeFetch("/api/admin/stats?type=monthly-sales"),
      safeFetch("/api/admin/stats?type=top-categories"),
      safeFetch("/api/admin/stats?type=top-selling&limit=5"),
      safeFetch("/api/admin/stats?type=recent-orders&limit=5"),
      safeFetch("/api/admin/stats?type=new-users&days=30"),
      safeFetch("/api/admin/stats?type=conversion-rate"),
      safeFetch("/api/admin/stats?type=traffic-sources"),
      safeFetch("/api/admin/stats?type=weekly-comparison"),
      safeFetch("/api/admin/stats?type=hourly-traffic"),
    ]).then(([ov, st, os, ms, tc, tp, ro, nu, cr, tr, wc, ht]) => {
      if (ov?.data) setOverview(ov.data);
      if (st?.data) setSalesTrend(st.data);
      if (os?.data) setOrderStatus(os.data);
      if (ms?.data) setMonthlySales(ms.data);
      if (tc?.data) setTopCats(tc.data);
      if (tp?.data) setTopProds(tp.data);
      if (ro?.data) setRecentOrders(ro.data);
      if (nu?.data) setNewUsers(nu.data);
      if (cr?.data) setConvRate(cr.data);
      if (tr?.data) setTraffic(tr.data);
      if (wc?.data) setWeeklyComp(wc.data);
      if (ht?.data) setHourlyTraffic(ht.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">داشبورد مدیریت</h1>
          <p className="mt-1 text-sm text-slate-500">نمای کلی از عملکرد و آمار فروشگاه</p>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="size-3.5" /> بروزرسانی
        </button>
      </div>

      {/* ── ردیف ۱: کارت‌های KPI اصلی ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="کاربران کل" value={overview?.users ?? 0} icon={Users} change="+۱۲٪" color="blue" />
        <KpiCard title="محصولات" value={overview?.products ?? 0} icon={Package} change="+" color="violet" />
        <KpiCard title="سفارشات" value={overview?.orders ?? 0} icon={ShoppingBag} change="+۸٪" color="pink" />
        <KpiCard title="درآمد کل" value={formatRial(overview?.totalRevenue ?? "0")} icon={Wallet} change="+۱۵٪" color="green" />
      </div>

      {/* ── ردیف ۲: کارت‌های ثانویه ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="درآمد امروز" value={formatRial(overview?.todayRevenue ?? "۰")} icon={DollarSign} color="emerald" />
        <MiniCard title="میانگین ارزش سفارش" value={formatRial(overview?.avgOrderValue ?? "۰")} icon={BarChart3} color="blue" />
        <MiniCard title="سفارشات در انتظار" value={String(overview?.pendingOrders ?? 0)} icon={Clock} color="amber" />
        <MiniCard title="موجودی کم" value={String(overview?.lowStockItems ?? 0)} icon={AlertTriangle} color="red" />
      </div>

      {/* ── بخش A: تحلیل فروش ── */}
      <SectionTitle icon={TrendingUp} title="تحلیل فروش" />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="روند فروش ۷ روز اخیر" exportData={salesTrend}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesTrend}>
              <defs><linearGradient id="salesG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1c6a7c" stopOpacity={0.3}/><stop offset="100%" stopColor="#1c6a7c" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#1c6a7c" fill="url(#salesG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="فروش ماهانه" exportData={monthlySales}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#1c6a7c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="مقایسه: این هفته vs هفته قبل" exportData={weeklyComp}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyComp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Line type="monotone" dataKey="thisWeek" stroke="#3b82f6" strokeWidth={2} name="این هفته" />
              <Line type="monotone" dataKey="lastWeek" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="هفته قبل" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ساعات پرترافیک" exportData={hourlyTraffic}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourlyTraffic}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1c6a7c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── بخش B: وضعیت سفارشات و محصولات ── */}
      <SectionTitle icon={Activity} title="وضعیت سفارشات و محصولات" />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="وضعیت سفارشات" exportData={orderStatus.map(o => ({ وضعیت: STATUS_MAP[o.status]?.label || o.status, تعداد: o.count }))}>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={orderStatus.map(o => ({ name: STATUS_MAP[o.status]?.label || o.status, value: o.count }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {orderStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="پرفروش‌ترین دسته‌بندی‌ها" exportData={topCats}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topCats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="categoryTitle" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="totalSales" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── بخش C: کاربران و ترافیک ── */}
      <SectionTitle icon={Users} title="کاربران و ترافیک" />

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="کاربران جدید (۳۰ روز)" exportData={newUsers}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={newUsers}>
              <defs><linearGradient id="userG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#userG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="نرخ تبدیل" exportData={convRate ? [{ کاربران: convRate.totalUsers, تحویل: convRate.deliveredOrders, نرخ: convRate.rate }] : []}>
          <div className="flex items-center justify-center h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={20} data={convRate ? [{ name: "نرخ تبدیل", value: convRate.rate, fill: "#10b981" }] : []}>
                <RadialBar dataKey="value" cornerRadius={10} />
                <text x="50%" y="45%" textAnchor="middle" className="text-3xl font-bold" fill="#0f172a">{convRate?.rate ?? 0}%</text>
                <text x="50%" y="58%" textAnchor="middle" className="text-[10px]" fill="#64748b">نرخ تبدیل</text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="منابع ترافیک" exportData={traffic.map(t => ({ منبع: t.source, درصد: t.value }))}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={traffic} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="source" label={({ value }) => `${value}%`} labelLine={false}>
                {traffic.map((t, i) => <Cell key={i} fill={t.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── بخش D: جداول ── */}
      <SectionTitle icon={Activity} title="جزئیات" />

      <div className="grid gap-6 lg:grid-cols-2">
        <TableCard title="آخرین سفارشات" link="/admin/orders">
          {recentOrders.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">سفارشی ثبت نشده است.</p>
          ) : (
            recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-900">#{o.orderNumber}</p>
                  <p className="text-[10px] text-slate-500">{o.userName || "—"}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">{formatRial(o.totalAmount)}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", {
                    "bg-green-100 text-green-700": o.status === "delivered",
                    "bg-blue-100 text-blue-700": o.status === "paid",
                    "bg-amber-100 text-amber-700": o.status === "pending_payment",
                    "bg-slate-100 text-slate-600": !["delivered","paid","pending_payment"].includes(o.status),
                  })}>{STATUS_MAP[o.status]?.label || o.status}</span>
                </div>
              </div>
            ))
          )}
        </TableCard>

        <TableCard title="پرفروش‌ترین محصولات" link="/admin/products">
          {topProds.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">هنوز فروشی ثبت نشده است.</p>
          ) : (
            topProds.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{p.title}</p>
                  <p className="text-[10px] text-slate-500">{p.totalSold} عدد فروخته شده</p>
                </div>
                <span className="text-xs font-bold text-emerald-700">{formatRial(p.totalRevenue)}</span>
              </div>
            ))
          )}
        </TableCard>
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
      <Icon className="size-4 text-petrol-600" strokeWidth={1.8} />
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, change, color }: { title: string; value: string | number; icon: any; change: string; color: string }) {
  const gradients: Record<string, string> = {
    blue: "from-blue-600 to-blue-400",
    violet: "from-violet-600 to-violet-400",
    pink: "from-pink-600 to-pink-400",
    green: "from-emerald-600 to-emerald-400",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[color]} p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black">{typeof value === "number" ? value.toLocaleString() : value}</p>
          <p className="mt-1 text-[11px] font-medium text-white/80">{title}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="size-5" strokeWidth={1.5} />
        </div>
      </div>
      <span className="absolute bottom-2 left-3 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm">{change}</span>
    </div>
  );
}

function MiniCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-black">{value}</p>
          <p className="mt-1 text-[11px] font-medium">{title}</p>
        </div>
        <Icon className="size-5 opacity-60" strokeWidth={1.5} />
      </div>
    </div>
  );
}

function ChartCard({ title, children, exportData }: { title: string; children: React.ReactNode; exportData?: Record<string, unknown>[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const safeName = title.replace(/[\\/:*?"<>|]+/g, "").slice(0, 40);

  useEffect(() => { if (!menuOpen) return; const c = () => setMenuOpen(false); document.addEventListener("click", c); return () => document.removeEventListener("click", c); }, [menuOpen]);

  return (
    <div ref={ref} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100">
            <Download className="size-3.5" /> خروجی <ChevronDown className={cn("size-3 transition-transform", menuOpen && "rotate-180")} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-9 z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              <button onClick={() => { exportSvgAsPng(ref.current, safeName); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <ImageIcon className="size-3.5 text-petrol-600" /> تصویر (PNG)
              </button>
              <button disabled={!exportData?.length} onClick={() => { if (exportData) exportDataAsCsv(exportData, safeName); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <FileSpreadsheet className="size-3.5 text-emerald-600" /> داده (CSV)
              </button>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function TableCard({ title, link, children }: { title: string; link: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <Link href={link} className="flex items-center gap-1 text-[11px] font-medium text-petrol-600 hover:text-petrol-500">
          مشاهده همه <ExternalLink className="size-3" />
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
