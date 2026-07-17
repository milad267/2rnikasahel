"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database, Download, Upload, RefreshCw, Clock, AlertTriangle, Trash2,
  FileJson, FileCode, HardDriveDownload, CalendarClock, History, Save,
  Play, CheckCircle2, Package, Users, ShoppingCart, Newspaper, Settings2,
  GitBranch, Globe, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type BackupFile = { file: string; type: "json" | "sql"; size: string; date: string; auto: boolean; mtime: number };
type BackupGroup = { id: string; label: string; desc: string; tableCount: number };
type AutoConfig = {
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly";
  time: string;
  weekday: number;
  retention: number;
  groups: string[];
  lastRun: string | null;
};

const GROUP_ICONS: Record<string, any> = {
  products: Package,
  customers: Users,
  orders: ShoppingCart,
  content: Newspaper,
  settings: Settings2,
};

const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
const FREQ_LABEL: Record<string, string> = { hourly: "هر ساعت", daily: "روزانه", weekly: "هفتگی" };

type TabId = "create" | "auto" | "restore" | "history" | "update";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "create", label: "بکاپ‌گیری", icon: HardDriveDownload },
  { id: "auto", label: "بکاپ خودکار", icon: CalendarClock },
  { id: "restore", label: "بازیابی", icon: Upload },
  { id: "update", label: "بروزرسانی", icon: Globe },
  { id: "history", label: "تاریخچه", icon: History },
];

export default function BackupPage() {
  const [tab, setTab] = useState<TabId>("create");

  // shared data
  const [groups, setGroups] = useState<BackupGroup[]>([]);
  const [history, setHistory] = useState<BackupFile[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // create tab
  const [selected, setSelected] = useState<string[]>([]);
  const [backingJson, setBackingJson] = useState(false);
  const [backingSql, setBackingSql] = useState(false);

  // auto tab
  const [config, setConfig] = useState<AutoConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);

  // restore tab — two‑step: upload → preview → confirm
  const [restoring, setRestoring] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    file: string;
    originalName: string;
    meta: { version: number; createdAt: string; groups: string[] | "all"; tableCount: number; totalRows: number };
    tables: Record<string, { rowCount: number }>;
  } | null>(null);

  // update tab
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [updateMethod, setUpdateMethod] = useState<"github" | "zip" | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const d = await fetch("/api/admin/backup?action=list").then((r) => r.json());
      if (d.ok) setHistory(d.files || []);
    } catch {
      /* ignore */
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const d = await fetch("/api/admin/backup?action=groups").then((r) => r.json());
      if (d.ok) setGroups(d.groups || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const d = await fetch("/api/admin/backup?action=config").then((r) => r.json());
      if (d.ok) setConfig(d.config);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadHistory();
    loadConfig();
  }, [loadGroups, loadHistory, loadConfig]);

  function toggleGroup(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  const allSelected = groups.length > 0 && selected.length === groups.length;
  function toggleAll() {
    setSelected(allSelected ? [] : groups.map((g) => g.id));
  }

  async function createJsonBackup() {
    setBackingJson(true);
    try {
      const res = await fetch("/api/admin/backup?action=create-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // خالی = بکاپ کامل
        body: JSON.stringify({ groups: allSelected ? [] : selected }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ بکاپ ساخته شد — ${data.tables} جدول، ${data.rows} ردیف (${data.size})`);
        await loadHistory();
      } else {
        toast.error(data.error || "خطا در ساخت بکاپ");
      }
    } catch {
      toast.error("خطا در ساخت بکاپ JSON");
    }
    setBackingJson(false);
  }

  async function createSqlBackup() {
    setBackingSql(true);
    try {
      const res = await fetch("/api/admin/backup?action=create", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ بکاپ SQL ساخته شد: ${data.file}`);
        await loadHistory();
      } else {
        toast.error(data.error || "خطا (احتمالاً pg_dump نصب نیست — از بکاپ JSON استفاده کنید)");
      }
    } catch {
      toast.error("خطا در ساخت بکاپ SQL");
    }
    setBackingSql(false);
  }

  function downloadBackup(filename: string) {
    window.open(`/api/admin/backup?action=download&file=${encodeURIComponent(filename)}&zip=true`, "_blank");
  }

  async function deleteBackup(filename: string) {
    if (!confirm(`آیا از حذف فایل «${filename}» مطمئن هستید؟`)) return;
    try {
      const res = await fetch(`/api/admin/backup?action=delete&file=${encodeURIComponent(filename)}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success("فایل حذف شد");
        setHistory((prev) => prev.filter((h) => h.file !== filename));
      } else toast.error(data.error || "خطا");
    } catch {
      toast.error("خطا در حذف");
    }
  }

  async function restoreUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      setRestorePreview(null);
      setRestoring(true);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/backup?action=restore-upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          setRestorePreview({
            file: data.file,
            originalName: data.originalName,
            meta: data.meta,
            tables: data.tables,
          });
        } else toast.error(data.error || "خطا در آپلود");
      } catch {
        toast.error("خطا در آپلود فایل");
      }
      setRestoring(false);
    };
    input.click();
  }

  async function restoreConfirmed() {
    if (!restorePreview) return;
    if (!confirm("⚠️ آیا از بازیابی این بکاپ مطمئن هستید؟ تمام داده‌های فعلی جدول‌های موجود در بکاپ با داده‌های فایل جایگزین می‌شوند.")) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/backup?action=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: restorePreview.file, confirmed: true }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ ${data.message || "بازیابی با موفقیت انجام شد"}`);
        setRestorePreview(null);
        await loadHistory();
      } else toast.error(data.error || "خطا");
    } catch {
      toast.error("خطا در بازیابی");
    }
    setRestoring(false);
  }

  async function saveConfig() {
    if (!config) return;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/backup?action=auto-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        toast.success("✅ تنظیمات بکاپ خودکار ذخیره شد");
      } else toast.error(data.error || "خطا در ذخیره تنظیمات");
    } catch {
      toast.error("خطا در ذخیره تنظیمات");
    }
    setSavingConfig(false);
  }

  async function runAutoNow() {
    if (!config) return;
    setRunningAuto(true);
    try {
      // force-run: create backup with auto prefix & configured groups
      const res = await fetch("/api/admin/backup?action=create-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: config.groups, auto: true }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ بکاپ خودکار ساخته شد — ${data.tables} جدول، ${data.rows} ردیف (${data.size})`);
        await loadHistory();
        await loadConfig(); // refresh lastRun
      } else toast.error(data.error || "خطا");
    } catch {
      toast.error("خطا در اجرای بکاپ");
    }
    setRunningAuto(false);
  }

  function setCfg<K extends keyof AutoConfig>(key: K, value: AutoConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleConfigGroup(id: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      const has = prev.groups.includes(id);
      return { ...prev, groups: has ? prev.groups.filter((g) => g !== id) : [...prev.groups, id] };
    });
  }

  const last3 = history.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Database className="size-6 text-petrol-600" strokeWidth={1.6} /> پشتیبان‌گیری و بازیابی
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            بکاپ انتخابی از بخش‌های مختلف، بکاپ خودکار زمان‌بندی‌شده و بازیابی سیستم
          </p>
        </div>
        {config?.enabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-4" /> بکاپ خودکار فعال ({FREQ_LABEL[config.frequency]})
          </span>
        )}
      </div>

      {/* تب‌ها */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                active ? "bg-white text-petrol-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.7} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── تب بکاپ‌گیری ─── */}
      {tab === "create" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">انتخاب بخش‌ها برای بکاپ</h3>
                <p className="mt-0.5 text-xs text-slate-500">بخش‌های مورد نظر را انتخاب کنید یا برای بکاپ کامل، همه را انتخاب کنید</p>
              </div>
              <button
                onClick={toggleAll}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                {allSelected ? "لغو انتخاب همه" : "انتخاب همه"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => {
                const Icon = GROUP_ICONS[g.id] || Database;
                const on = selected.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`flex items-start gap-3 rounded-xl border-2 p-4 text-right transition-all ${
                      on ? "border-petrol-400 bg-petrol-50/60" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className={`mt-0.5 rounded-lg p-2 ${on ? "bg-petrol-100 text-petrol-700" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="size-5" strokeWidth={1.6} />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{g.label}</span>
                        {on && <CheckCircle2 className="size-4 text-petrol-600" />}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-slate-500">{g.desc}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">{g.tableCount} جدول</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={createJsonBackup}
                disabled={backingJson}
                className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-petrol-700 disabled:opacity-50"
              >
                {backingJson ? <RefreshCw className="size-4 animate-spin" /> : <FileJson className="size-4" />}
                {selected.length === 0 || allSelected ? "ساخت بکاپ کامل (JSON)" : `ساخت بکاپ ${selected.length} بخش (JSON)`}
              </button>
              <button
                onClick={createSqlBackup}
                disabled={backingSql}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {backingSql ? <RefreshCw className="size-4 animate-spin" /> : <FileCode className="size-4" />}
                بکاپ کامل SQL (pg_dump)
              </button>
              <span className="text-[11px] text-slate-400">
                روش JSON روی همه سرورها کار می‌کند؛ SQL نیازمند نصب pg_dump است.
              </span>
            </div>
          </div>

          {/* آخرین بکاپ‌ها */}
          {historyLoaded && history.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <History className="size-4 text-petrol-600" strokeWidth={1.7} /> آخرین بکاپ‌ها
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {history.slice(0, 3).map((h) => (
                  <div key={h.file} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {h.type === "json" ? <FileJson className="size-4 text-petrol-600" strokeWidth={1.6} /> : <FileCode className="size-4 text-slate-500" strokeWidth={1.6} />}
                        {h.auto && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">خودکار</span>}
                      </div>
                      <button onClick={() => downloadBackup(h.file)} className="rounded-lg bg-petrol-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-petrol-700">
                        <Download className="size-3" />
                      </button>
                    </div>
                    <p className="mt-2 truncate text-[11px] font-medium text-slate-900" title={h.file}>{h.file}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{h.date} · {h.size}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── تب بکاپ خودکار ─── */}
      {tab === "auto" && (
        <div className="space-y-5">
          {!config ? (
            <div className="flex justify-center py-12"><RefreshCw className="size-6 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                {/* فعال‌سازی */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">فعال‌سازی بکاپ خودکار</p>
                    <p className="mt-0.5 text-xs text-slate-500">سیستم به‌صورت زمان‌بندی‌شده از داده‌ها بکاپ می‌گیرد</p>
                  </div>
                  <button
                    onClick={() => setCfg("enabled", !config.enabled)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${config.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${config.enabled ? "right-1" : "right-6"}`} />
                  </button>
                </div>

                <div className={`mt-5 space-y-5 transition-opacity ${config.enabled ? "" : "pointer-events-none opacity-50"}`}>
                  {/* تناوب */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">تناوب بکاپ</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["hourly", "daily", "weekly"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setCfg("frequency", f)}
                          className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                            config.frequency === f ? "border-petrol-400 bg-petrol-50 text-petrol-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {FREQ_LABEL[f]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ساعت + روز هفته */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {config.frequency !== "hourly" && (
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-700">ساعت اجرا</label>
                        <input
                          type="time"
                          value={config.time}
                          onChange={(e) => setCfg("time", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-petrol-400"
                        />
                      </div>
                    )}
                    {config.frequency === "weekly" && (
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-700">روز هفته</label>
                        <select
                          value={config.weekday}
                          onChange={(e) => setCfg("weekday", Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-petrol-400"
                        >
                          {WEEKDAYS.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-700">تعداد بکاپ نگهداری‌شده</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={config.retention}
                        onChange={(e) => setCfg("retention", Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-petrol-400"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">بکاپ‌های خودکار قدیمی‌تر به‌صورت خودکار حذف می‌شوند</p>
                    </div>
                  </div>

                  {/* بخش‌ها */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">بخش‌های بکاپ خودکار (خالی = کامل)</label>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((g) => {
                        const on = config.groups.includes(g.id);
                        const Icon = GROUP_ICONS[g.id] || Database;
                        return (
                          <button
                            key={g.id}
                            onClick={() => toggleConfigGroup(g.id)}
                            className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition ${
                              on ? "border-petrol-400 bg-petrol-50 text-petrol-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <Icon className="size-3.5" strokeWidth={1.7} /> {g.label}
                          </button>
                        );
                      })}
                    </div>
                    {config.groups.length === 0 && (
                      <p className="mt-1.5 text-[10px] text-slate-400">هیچ بخشی انتخاب نشده — بکاپ کامل گرفته می‌شود</p>
                    )}
                  </div>
                </div>

                {/* آخرین اجرا */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="size-4" strokeWidth={1.6} />
                    آخرین اجرا: {config.lastRun ? new Date(config.lastRun).toLocaleString("fa-IR") : "هرگز"}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={runAutoNow}
                      disabled={runningAuto}
                      className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {runningAuto ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />} اجرای فوری
                    </button>
                    <button
                      onClick={saveConfig}
                      disabled={savingConfig}
                      className="flex items-center gap-2 rounded-xl bg-petrol-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-petrol-700 disabled:opacity-50"
                    >
                      {savingConfig ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />} ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <AlertTriangle className="size-5 shrink-0 text-sky-600" strokeWidth={1.5} />
                <p className="text-xs leading-6 text-sky-900">
                  زمان‌بند تا وقتی سرور روشن است هر دقیقه بررسی می‌شود. برای اطمینان بیشتر در محیط عملیاتی می‌توانید یک cron خارجی هم تنظیم کنید که به‌صورت دوره‌ای درخواست <code className="rounded bg-white px-1 font-mono">POST /api/admin/backup?action=tick</code> بفرستد.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── تب بازیابی ─── */}
      {tab === "restore" && (
        <div className="space-y-5">
          {!restorePreview ? (
            /* مرحله ۱: انتخاب فایل */
            <button
              onClick={restoreUpload}
              disabled={restoring}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-10 transition-colors hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50"
            >
              {restoring ? <RefreshCw className="size-10 animate-spin text-amber-600" /> : <Upload className="size-10 text-amber-600" strokeWidth={1.3} />}
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">آپلود فایل بکاپ</p>
                <p className="mt-1 text-xs text-slate-500">فایل JSON بکاپ را انتخاب کنید تا اطلاعات آن بررسی شود</p>
              </div>
            </button>
          ) : (
            /* مرحله ۲: اطلاعات بکاپ و تأیید */
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileJson className="size-4 text-petrol-600" strokeWidth={1.7} /> اطلاعات فایل بکاپ
              </h3>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500">نام فایل</p>
                  <p className="mt-1 text-xs font-medium text-slate-900 truncate" title={restorePreview.originalName}>{restorePreview.originalName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500">تاریخ ساخت</p>
                  <p className="mt-1 text-xs font-medium text-slate-900">{new Date(restorePreview.meta.createdAt).toLocaleString("fa-IR")}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500">جدول‌ها</p>
                  <p className="mt-1 text-xs font-medium text-slate-900">{restorePreview.meta.tableCount} جدول</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500">ردیف‌ها</p>
                  <p className="mt-1 text-xs font-medium text-slate-900">{restorePreview.meta.totalRows.toLocaleString("fa-IR")} ردیف</p>
                </div>
              </div>

              {/* لیست جدول‌ها */}
              <div>
                <p className="mb-2 text-[10px] font-bold text-slate-500">جدول‌های موجود در بکاپ</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(restorePreview.tables).map(([name, info]) => (
                    <span key={name} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-700">
                      {name} <span className="text-slate-400">({info.rowCount} ردیف)</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button onClick={() => setRestorePreview(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  انتخاب فایل دیگر
                </button>
                <button
                  onClick={restoreConfirmed}
                  disabled={restoring}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {restoring ? <RefreshCw className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {restoring ? "در حال بازیابی..." : "شروع بازیابی"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="size-5 shrink-0 text-red-600" strokeWidth={1.5} />
            <div className="text-xs leading-6 text-red-900">
              <p className="font-bold">هشدار مهم:</p>
              <p>بازیابی، تمام داده‌های فعلی جدول‌های موجود در فایل بکاپ را با داده‌های فایل جایگزین می‌کند. این عملیات غیرقابل بازگشت است.</p>
              <p>پیش از بازیابی، حتماً یک بکاپ کامل از وضعیت فعلی تهیه کنید.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── تب بروزرسانی ─── */}
      {tab === "update" && (
        <div className="space-y-5">
          {/* روش اول: GitHub */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
              <GitBranch className="size-4 text-petrol-600" strokeWidth={1.7} /> بروزرسانی از GitHub
            </h3>
            <p className="mb-4 text-xs text-slate-500">آدرس مخزن GitHub خود را وارد کنید تا آخرین تغییرات کشیده شود. اطلاعات دیتابیس حفظ می‌شود.</p>
            <div className="flex gap-3">
              <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git" dir="ltr"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono" />
              <button onClick={async () => {
                if (!githubUrl.trim()) { toast.error("لطفاً آدرس GitHub را وارد کنید"); return; }
                setUpdating(true); setUpdateMethod("github"); setUpdateLog([]);
                try {
                  const res = await fetch("/api/admin/backup?action=git-pull", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ repo: githubUrl.trim() }),
                  });
                  const data = await res.json();
                  setUpdateLog(data.log || []);
                  if (data.ok) toast.success("✅ بروزرسانی با موفقیت انجام شد");
                  else toast.error(data.error || "خطا");
                } catch { toast.error("خطا در ارتباط با سرور"); }
                setUpdating(false);
              }} disabled={updating}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                {updating && updateMethod === "github" ? <RefreshCw className="size-4 animate-spin" /> : <GitBranch className="size-4" />}
                {updating && updateMethod === "github" ? "در حال بروزرسانی..." : "کشیدن تغییرات"}
              </button>
            </div>
          </div>

          {/* روش دوم: آپلود ZIP */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
              <Upload className="size-4 text-petrol-600" strokeWidth={1.7} /> آپلود فایل پروژه (ZIP)
            </h3>
            <p className="mb-4 text-xs text-slate-500">فایل ZIP پروژه را آپلود کنید تا جایگزین فایل‌های فعلی شود. دیتابیس دست نخورده باقی می‌ماند.</p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-6 py-8 transition-colors hover:border-amber-400 hover:bg-amber-50">
              <Upload className="size-8 text-amber-600" strokeWidth={1.3} />
              <span className="text-sm font-bold text-slate-900">فایل ZIP را انتخاب کنید</span>
              <span className="text-xs text-slate-500">فایل پروژه را به صورت ZIP آپلود کنید</span>
              <input type="file" accept=".zip" className="hidden" disabled={updating}
                onChange={async (e) => {
                  const file = e.target?.files?.[0];
                  if (!file) return;
                  setUpdating(true); setUpdateMethod("zip"); setUpdateLog([]);
                  const fd = new FormData();
                  fd.append("file", file);
                  try {
                    const res = await fetch("/api/admin/backup?action=update-from-zip", { method: "POST", body: fd });
                    const data = await res.json();
                    setUpdateLog(data.log || []);
                    if (data.ok) toast.success("✅ پروژه با موفقیت بروزرسانی شد");
                    else toast.error(data.error || "خطا");
                  } catch { toast.error("خطا"); }
                  setUpdating(false);
                }} />
            </label>
          </div>

          {/* لاگ بروزرسانی */}
          {updateLog.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <RefreshCw className="size-4 text-petrol-600" strokeWidth={1.7} /> گزارش بروزرسانی
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {updateLog.map((line, i) => (
                  <p key={i} className={`text-[11px] font-mono ${line.includes("✅") ? "text-emerald-600" : line.includes("❌") ? "text-red-600" : "text-slate-600"}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* هشدار */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <AlertCircle className="size-5 shrink-0 text-amber-600" strokeWidth={1.5} />
            <div className="text-xs leading-6 text-amber-900">
              <p className="font-bold">نکات مهم بروزرسانی:</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li>بروزرسانی فقط فایل‌های پروژه را تغییر می‌دهد — دیتابیس کاملاً حفظ می‌شود.</li>
                <li>بعد از بروزرسانی، ممکن است نیاز به اجرای <code className="bg-amber-100 px-1 rounded">npm install</code> و <code className="bg-amber-100 px-1 rounded">npm run build</code> باشد.</li>
                <li>پیشنهاد می‌شود قبل از بروزرسانی یک بکاپ کامل تهیه کنید.</li>
                <li>برای بروزرسانی از GitHub، سرور باید به اینترنت دسترسی داشته باشد و git نصب باشد.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── تب تاریخچه ─── */}
      {tab === "history" && (
        <div className="space-y-5">
          {/* ۳ بکاپ اخیر */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Clock className="size-4 text-petrol-600" strokeWidth={1.7} /> ۳ بکاپ اخیر
              </h3>
              <button onClick={loadHistory} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200">
                <RefreshCw className="size-3" /> بروزرسانی
              </button>
            </div>
            {!historyLoaded ? (
              <div className="flex justify-center py-8"><RefreshCw className="size-5 animate-spin text-slate-400" /></div>
            ) : last3.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400">
                <Database className="mb-2 size-8" strokeWidth={1.2} />
                <p className="text-xs">هنوز بکاپی ساخته نشده است</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {last3.map((h) => (
                  <div key={h.file} className="rounded-xl border-2 border-petrol-100 bg-petrol-50/40 p-4">
                    <div className="flex items-center gap-2">
                      {h.type === "json" ? <FileJson className="size-5 text-petrol-600" strokeWidth={1.6} /> : <FileCode className="size-5 text-slate-500" strokeWidth={1.6} />}
                      {h.auto && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">خودکار</span>}
                    </div>
                    <p className="mt-2 truncate text-[11px] font-bold text-slate-900" title={h.file}>{h.file}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{h.date}</p>
                    <p className="text-[10px] text-slate-400">{h.size}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => downloadBackup(h.file)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-petrol-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-petrol-700">
                        <Download className="size-3" /> دانلود
                      </button>
                      <button onClick={() => deleteBackup(h.file)} className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* همه بکاپ‌ها */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <History className="size-4" strokeWidth={1.7} /> همه بکاپ‌ها
              {historyLoaded && <span className="text-[10px] font-normal text-slate-400">({history.length})</span>}
            </h3>
            {!historyLoaded ? (
              <div className="flex justify-center py-8"><RefreshCw className="size-5 animate-spin text-slate-400" /></div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400">
                <Database className="mb-2 size-8" strokeWidth={1.2} />
                <p className="text-xs">هنوز بکاپی ساخته نشده است</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.file} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {h.type === "json" ? <FileJson className="size-4 text-petrol-600" strokeWidth={1.6} /> : <FileCode className="size-4 text-slate-500" strokeWidth={1.6} />}
                      <div>
                        <p className="flex items-center gap-2 text-xs font-medium text-slate-900">
                          {h.file}
                          {h.auto && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">خودکار</span>}
                        </p>
                        <p className="text-[10px] text-slate-500">{h.date} • {h.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => downloadBackup(h.file)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200">دانلود</button>
                      <button onClick={() => deleteBackup(h.file)} className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
