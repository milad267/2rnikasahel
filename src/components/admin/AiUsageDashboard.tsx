"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, Clock3, Coins, RefreshCw, Sigma } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Breakdown = { agent?: string; provider?: string; model?: string; requests: number; totalTokens: number; promptTokens: number; completionTokens: number; costUsd: number; errors: number; successRate: number; avgLatencyMs: number };
type UsageData = {
  range: { days: number; from: string; to: string; eventCount: number };
  kpis: Breakdown;
  timeline: Array<Breakdown & { date: string }>;
  agents: Breakdown[];
  providers: Breakdown[];
  models: Breakdown[];
  configuredAgents: string[];
  freshness: string;
  caveat: string;
};

const COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#4f46e5"];
const number = new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 });

function Kpi({ icon: Icon, label, value, detail, tone }: { icon: typeof Activity; label: string; value: string; detail: string; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${tone}`} />
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p></div>
        <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon className="size-4" /></span>
      </div>
    </div>
  );
}

export function AiUsageDashboard() {
  const [days, setDays] = useState(30);
  const [agent, setAgent] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ days: String(days) });
    if (agent) params.set("agent", agent);
    if (provider) params.set("provider", provider);
    if (model) params.set("model", model);
    setLoading(true); setError("");
    fetch(`/api/admin/ai/usage?${params}`, { signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error || "خطا در دریافت آمار"); return body as UsageData; })
      .then(setData).catch(err => { if (err.name !== "AbortError") setError(err.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [days, agent, provider, model, refreshKey]);

  const agentOptions = useMemo(() => Array.from(new Set([...(data?.configuredAgents || []), ...(data?.agents.map(item => item.agent || "") || [])])).filter(Boolean), [data]);
  const unusedAgents = data?.configuredAgents.filter(item => !data.agents.some(row => row.agent === item)) || [];

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Activity className="size-5 text-teal-600" />رصد مصرف هوش مصنوعی</h2><p className="mt-1 text-xs text-slate-500">مصرف واقعی ثبت‌شده برای هر Agent، Provider و Model</p></div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <select value={days} onChange={event => setDays(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value={7}>۷ روز</option><option value={30}>۳۰ روز</option><option value={90}>۹۰ روز</option></select>
          <select value={agent} onChange={event => setAgent(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="">همه Agentها</option>{agentOptions.map(item => <option key={item}>{item}</option>)}</select>
          <select value={provider} onChange={event => setProvider(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="">همه Providerها</option>{data?.providers.map(item => <option key={item.provider}>{item.provider}</option>)}</select>
          <select value={model} onChange={event => setModel(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="">همه Modelها</option>{data?.models.map(item => <option key={item.model}>{item.model}</option>)}</select>
          <button onClick={() => setRefreshKey(value => value + 1)} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white sm:col-span-1"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />تازه‌سازی</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Sigma} label="کل توکن" value={number.format(data?.kpis.totalTokens || 0)} detail={`${number.format(data?.kpis.promptTokens || 0)} ورودی · ${number.format(data?.kpis.completionTokens || 0)} خروجی`} tone="bg-teal-500" />
        <Kpi icon={Bot} label="درخواست‌ها" value={number.format(data?.kpis.requests || 0)} detail={`${data?.configuredAgents.length || 0} Agent پیکربندی‌شده`} tone="bg-blue-500" />
        <Kpi icon={Activity} label="نرخ موفقیت" value={`${data?.kpis.successRate || 0}٪`} detail={`${data?.kpis.errors || 0} خطا`} tone="bg-emerald-500" />
        <Kpi icon={Clock3} label="میانگین پاسخ" value={`${number.format(data?.kpis.avgLatencyMs || 0)} ms`} detail="از درخواست تا پاسخ provider" tone="bg-amber-500" />
        <Kpi icon={Coins} label="هزینه تخمینی" value={`$${(data?.kpis.costUsd || 0).toFixed(4)}`} detail="برآورد؛ صورتحساب provider قطعی است" tone="bg-violet-500" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h3 className="text-sm font-bold text-slate-900">روند مصرف توکن</h3><p className="text-[10px] text-slate-400">ورودی و خروجی روزانه</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.timeline || []}><defs><linearGradient id="prompt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0f766e" stopOpacity={0.35}/><stop offset="95%" stopColor="#0f766e" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Area type="monotone" dataKey="promptTokens" name="ورودی" stroke="#0f766e" fill="url(#prompt)"/><Area type="monotone" dataKey="completionTokens" name="خروجی" stroke="#7c3aed" fill="#7c3aed22"/></AreaChart></ResponsiveContainer></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-bold text-slate-900">سهم Providerها</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.providers || []} dataKey="totalTokens" nameKey="provider" innerRadius={58} outerRadius={92} paddingAngle={3}>{data?.providers.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-bold text-slate-900">مصرف به تفکیک Agent</h3><div className="mt-3 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.agents || []} layout="vertical" margin={{left:20}}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="agent" width={90} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="totalTokens" name="توکن" radius={[0,6,6,0]}>{data?.agents.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></section>

      {unusedAgents.length > 0 && <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0"/><div><p className="font-bold">Agentهای دارای کلید بدون مصرف در بازه انتخابی</p><p className="mt-1 leading-6">{unusedAgents.join("، ")}</p></div></div>}
      <p className="text-[10px] text-slate-400">آخرین بروزرسانی: {data ? new Date(data.freshness).toLocaleString("fa-IR") : "—"} · {data?.caveat}</p>
    </div>
  );
}

