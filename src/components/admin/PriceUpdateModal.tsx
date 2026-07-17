"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, X, Loader2, Check, AlertCircle, Percent, FileSpreadsheet, Download, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportRow {
  row: number;
  code: string;
  price: number | null;
  status: "matched" | "updated" | "not_found" | "invalid";
  oldPrice?: string;
  newPrice?: string;
  error?: string;
}

interface PriceUpdateResult {
  ok: boolean;
  dryRun: boolean;
  jobId: number;
  totalRows: number;
  matchedRows: number;
  updatedRows: number;
  errorRows: number;
  percentageOffset: number;
  report: ReportRow[];
  error?: string;
}

export function PriceUpdateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceUpdateResult | null>(null);
  const [percentageOffset, setPercentageOffset] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [applying, setApplying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // قفل اسکرول بدنه وقتی مودال باز است
  useEffect(() => {
    if (open) {
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
  }, [open]);

  async function handleUpload(doApply: boolean) {
    if (!file) { toast.error("لطفاً فایل اکسل را انتخاب کنید"); return; }
    
    if (doApply) {
      setApplying(true);
    } else {
      setLoading(true);
    }
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dryRun", doApply ? "false" : "true");
      fd.append("percentageOffset", String(percentageOffset));

      const res = await fetch("/api/admin/ai/price-update", { method: "POST", body: fd });
      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error || "خطا در پردازش فایل");
        return;
      }

      setResult(data);

      if (doApply) {
        toast.success(`✅ ${data.updatedRows} قیمت با موفقیت به‌روزرسانی شد`);
        // بعد از اعمال، دوباره dry-run بگیر برای نمایش نتیجه
        const fd2 = new FormData();
        fd2.append("file", file);
        fd2.append("dryRun", "true");
        fd2.append("percentageOffset", String(percentageOffset));
        const res2 = await fetch("/api/admin/ai/price-update", { method: "POST", body: fd2 });
        const data2 = await res2.json();
        if (data2.ok) setResult(data2);
      } else {
        if (data.errorRows > 0) {
          toast.warning(`⚠️ ${data.matchedRows} تطابق یافت شد، ${data.errorRows} خطا`);
        } else {
          toast.success(`✅ ${data.matchedRows} قیمت برای به‌روزرسانی آماده است`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
      setApplying(false);
    }
  }

  function reset() {
    setFile(null);
    setLoading(false);
    setResult(null);
    setPercentageOffset(0);
    setShowPreview(true);
    setApplying(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  const statusCounts = result?.report?.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={close}>
          <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-green-600" strokeWidth={1.6} />
                  آپدیت قیمت از فایل اکسل
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  آپلود فایل اکسل با ستون‌های CODE/SKU و PRICE/قیمت — تطبیق خودکار با تنوع‌ها
                </p>
              </div>
              <button onClick={close} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* بخش آپلود فایل */}
              <div className={cn("rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                file ? "border-green-300 bg-green-50/30" : "border-slate-300 bg-slate-50/50 hover:border-petrol-400"
              )}>
                {!file ? (
                  <label className="flex cursor-pointer flex-col items-center gap-2">
                    <Upload className="size-8 text-slate-400" strokeWidth={1.2} />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">فایل اکسل را انتخاب کنید</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">فرمت‌های مجاز: xlsx, xls, csv</p>
                    </div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="size-8 text-green-600" strokeWidth={1.4} />
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={() => setFile(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* درصد افزایش/کاهش */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="size-4 text-slate-500" strokeWidth={1.6} />
                  <span className="text-xs font-semibold text-slate-700">درصد افزایش/کاهش (اختیاری)</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">قیمت‌های فایل را به صورت خودکار درصدی افزایش یا کاهش دهید. مقدار منفی برای کاهش قیمت.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={percentageOffset}
                    onChange={e => setPercentageOffset(Number(e.target.value) || 0)}
                    placeholder="مثلاً: ۱۰ برای افزایش ۱۰٪، ۵- برای کاهش ۵٪"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-500 dir-ltr"
                    dir="ltr"
                  />
                  <span className="text-xs font-semibold text-slate-500">%</span>
                </div>
                {percentageOffset !== 0 && (
                  <div className={cn("mt-2 rounded-lg px-3 py-1.5 text-[10px] font-medium",
                    percentageOffset > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {percentageOffset > 0 ? `↑ همه قیمت‌ها ${percentageOffset}% افزایش می‌یابند` : `↓ همه قیمت‌ها ${Math.abs(percentageOffset)}% کاهش می‌یابند`}
                  </div>
                )}
              </div>

              {/* دکمه‌های اقدام */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleUpload(false)}
                  disabled={!file || loading || applying}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  {loading ? "در حال بررسی..." : "بررسی تطابق (Dry Run)"}
                </button>
                {result && result.matchedRows > 0 && !result.dryRun === false && (
                  <button
                    onClick={() => handleUpload(true)}
                    disabled={!file || loading || applying}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
                  >
                    {applying ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {applying ? "در حال اعمال..." : "اعمال تغییرات"}
                  </button>
                )}
              </div>

              {/* نتایج */}
              {result && (
                <div className="space-y-3">
                  {/* خلاصه */}
                  <div className="grid grid-cols-4 gap-3">
                    <SummaryCard label="کل ردیف‌ها" value={result.totalRows} color="slate" />
                    <SummaryCard label="تطابق یافته" value={result.matchedRows} color="green" />
                    <SummaryCard label="خطا" value={result.errorRows} color="red" />
                    {result.percentageOffset !== 0 && (
                      <SummaryCard label="درصد اعمال شده" value={`${result.percentageOffset > 0 ? "+" : ""}${result.percentageOffset}%`} color="purple" />
                    )}
                  </div>

                  {/* وضعیت dry-run */}
                  <div className={cn("rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2",
                    result.dryRun ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"
                  )}>
                    {result.dryRun ? (
                      <><Search className="size-4" /> این یک بررسی آزمایشی (Dry Run) است — هیچ تغییری اعمال نشده. دکمه «اعمال تغییرات» را بزنید تا قیمت‌ها به‌روزرسانی شوند.</>
                    ) : (
                      <><Check className="size-4" /> قیمت‌ها با موفقیت به‌روزرسانی شدند.</>
                    )}
                  </div>

                  {/* جدول جزئیات */}
                  <div>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"
                    >
                      {showPreview ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      جزئیات ردیف‌ها ({result.report.length} ردیف)
                    </button>

                    {showPreview && (
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                              <th className="px-3 py-2 text-right font-semibold text-slate-500">ردیف</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500">کد (SKU)</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500">قیمت جدید</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500">قیمت قبلی</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-500">وضعیت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.report.map((r, i) => (
                              <tr key={i} className={cn("border-b border-slate-50",
                                r.status === "invalid" || r.status === "not_found" ? "bg-red-50/50" :
                                r.status === "updated" ? "bg-green-50/50" : ""
                              )}>
                                <td className="px-3 py-2 text-slate-400 font-mono">{r.row}</td>
                                <td className="px-3 py-2 font-mono text-slate-800">{r.code}</td>
                                <td className="px-3 py-2 font-mono text-slate-800" dir="ltr">{r.newPrice ? Number(r.newPrice).toLocaleString() : "—"}</td>
                                <td className="px-3 py-2 font-mono text-slate-400" dir="ltr">{r.oldPrice ? Number(r.oldPrice).toLocaleString() : "—"}</td>
                                <td className="px-3 py-2 text-center">
                                  <StatusBadge status={r.status} error={r.error} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">
                ستون‌های مورد نیاز: <span className="font-mono font-semibold text-slate-600">CODE</span> یا <span className="font-mono font-semibold text-slate-600">SKU</span> برای کد کالا و <span className="font-mono font-semibold text-slate-600">PRICE</span> یا <span className="font-mono font-semibold text-slate-600">قیمت</span> برای قیمت
              </p>
              <button onClick={close} className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: "slate" | "green" | "red" | "purple" }) {
  const colors = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={cn("rounded-xl border p-3 text-center", colors[color])}>
      <p className="text-lg font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-[10px] mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function StatusBadge({ status, error }: { status: string; error?: string }) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    matched: { label: "تطابق", color: "bg-blue-100 text-blue-700", icon: Check },
    updated: { label: "به‌روز شد", color: "bg-green-100 text-green-700", icon: Check },
    not_found: { label: "پیدا نشد", color: "bg-red-100 text-red-700", icon: AlertCircle },
    invalid: { label: "نامعتبر", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  };
  const m = map[status] || { label: status, color: "bg-slate-100 text-slate-600", icon: AlertCircle };
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold", m.color)}
      title={error}>
      <Icon className="size-2.5" />
      {m.label}
    </span>
  );
}

function Search({ className, ...props }: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
