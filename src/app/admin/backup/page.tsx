"use client";

import { useState } from "react";
import { Database, Download, Upload, RefreshCw, HardDrive, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function BackupPage() {
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [history, setHistory] = useState<{ file: string; size: string; date: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    // اسکن پوشه بکاپ
    fetch("/api/admin/backup?action=list").then(r => r.json()).then(d => {
      if (d.ok) setHistory(d.files || []);
    }).catch(() => {}).finally(() => setLoaded(true));
  }

  async function createBackup() {
    setBacking(true);
    try {
      const res = await fetch("/api/admin/backup?action=create");
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ بکاپ با موفقیت ساخته شد: ${data.file}`);
        setHistory(prev => [{ file: data.file, size: data.size, date: data.date }, ...prev]);
      } else {
        toast.error(data.error || "خطا");
      }
    } catch { toast.error("خطا در ساخت بکاپ"); }
    setBacking(false);
  }

  async function downloadBackup(filename: string) {
    window.open(`/api/admin/backup?action=download&file=${encodeURIComponent(filename)}`, "_blank");
  }

  async function restoreBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sql,.dump,.sql.gz";
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      if (!confirm("⚠️ آیا از بازیابی این بکاپ مطمئن هستید؟ تمام داده‌های فعلی با داده‌های بکاپ جایگزین می‌شوند.")) return;

      setRestoring(true);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/backup?action=restore", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) toast.success("✅ بکاپ با موفقیت بازیابی شد");
        else toast.error(data.error || "خطا");
      } catch { toast.error("خطا در بازیابی"); }
      setRestoring(false);
    };
    input.click();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Database className="size-6 text-petrol-600" strokeWidth={1.6} /> پشتیبان‌گیری و بازیابی</h1>
        <p className="mt-1 text-sm text-slate-500">مدیریت پشتیبان‌گیری از دیتابیس</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <button onClick={createBackup} disabled={backing} className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-petrol-200 bg-petrol-50/50 p-8 transition-colors hover:border-petrol-400 hover:bg-petrol-50 disabled:opacity-50">
          <HardDrive className="size-10 text-petrol-600" strokeWidth={1.3} />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">ایجاد پشتیبان جدید</p>
            <p className="mt-1 text-[11px] text-slate-500">یک نسخه کامل از دیتابیس تهیه می‌کند</p>
          </div>
          {backing && <RefreshCw className="size-5 animate-spin text-petrol-600" />}
        </button>

        <button onClick={restoreBackup} disabled={restoring} className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-8 transition-colors hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50">
          <Upload className="size-10 text-amber-600" strokeWidth={1.3} />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">بازیابی از فایل</p>
            <p className="mt-1 text-[11px] text-slate-500">فایل SQL بکاپ را آپلود کنید</p>
          </div>
          {restoring && <RefreshCw className="size-5 animate-spin text-amber-600" />}
        </button>
      </div>

      {/* تاریخچه بکاپ‌ها */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Clock className="size-4" strokeWidth={1.6} /> تاریخچه بکاپ‌ها</h3>
        {history.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <Database className="size-8 mb-2" strokeWidth={1.2} />
            <p className="text-xs">هنوز بکاپی ساخته نشده است</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Download className="size-4 text-petrol-600" strokeWidth={1.6} />
                  <div>
                    <p className="text-xs font-medium text-slate-900">{h.file}</p>
                    <p className="text-[10px] text-slate-500">{h.date} • {h.size}</p>
                  </div>
                </div>
                <button onClick={() => downloadBackup(h.file)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200">دانلود</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* اخطار */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" strokeWidth={1.5} />
        <div className="text-xs leading-6 text-amber-900">
          <p className="font-semibold">توجه:</p>
          <p>بازیابی بکاپ تمام داده‌های فعلی را با داده‌های بکاپ جایگزین می‌کند. این عملیات غیرقابل بازگشت است.</p>
          <p>توصیه می‌شود قبل از بازیابی، یک بکاپ جدید از وضعیت فعلی تهیه کنید.</p>
        </div>
      </div>
    </div>
  );
}
