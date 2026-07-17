"use client";

import { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, XCircle, Loader2, Server, Mail, Database, ShieldCheck, Users, Globe, HelpCircle, Lock, Play, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StepId = "welcome" | "domain" | "email" | "admin" | "backup" | "done";

interface SetupStep {
  id: StepId;
  label: string;
  icon: any;
  desc: string;
  help?: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
}

const STEPS: SetupStep[] = [
  { id: "domain", label: "🌐 دامنه و CDN", icon: Globe, desc: "تنظیم دامنه و راهنمای CDN", status: "pending", help: "بعد از نصب، IP سرور رو توی پنل CDN به عنوان A Record تنظیم کن:\n[IP_SERVER] → yourdomain.com\n\n📌 کلودفلر (Cloudflare):\n۱. وارد پنل کلودفلر شوید\n۲. A Record: @ → YOUR_SERVER_IP\n۳. Proxy Status: Proxied (نارنجی)\n۴. SSL/TLS: Full\n\n📌 اَروان کلود (ArvanCloud):\n۱. وارد پنل اروان کلود شوید\n۲. DNS → افزودن رکورد\n۳. نوع: A - نام: @ - مقدار: YOUR_SERVER_IP\n۴. TTL: ۱۲۰ ثانیه\n۵. وضعیت CDN: فعال (سبز)\n۶. SSL: رایگان از اروان\n\nپورت: ۸۰ (HTTP) و ۴۴۳ (HTTPS)\nبعد از نصب سایت روی https://yourdomain.com در دسترس است." },
  { id: "email", label: "📧 ایمیل خودمیزبان", icon: Mail, desc: "تنظیم SMTP برای ارسال ایمیل", status: "pending", help: "ایمیل‌های سیستم از آدرس noreply@domain.com ارسال می‌شن.\nتنظیمات SMTP را می‌توانید بعداً از پنل مدیریت تغییر دهید." },
  { id: "admin", label: "👤 کاربر ادمین", icon: Users, desc: "ساخت کاربر سوپرادمین", status: "pending", help: "یک کاربر سوپرادمین برای ورود به پنل مدیریت ساخته می‌شه." },
  { id: "backup", label: "💾 بکاپ خودکار", icon: Database, desc: "تنظیمات بکاپ", status: "pending", help: "پوشه backups/ در APP_DATA_DIR ساخته می‌شه.\nتنظیمات بکاپ خودکار را می‌توانید بعداً از پنل مدیریت تغییر دهید." },
];

export function SetupWizard() {
  const [currentStep, setCurrentStep] = useState<StepId>("welcome");
  const [steps, setSteps] = useState<SetupStep[]>(STEPS.map(s => ({ ...s, status: "pending" as const })));
  const [running, setRunning] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [fullLog, setFullLog] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [enableHttps, setEnableHttps] = useState(true);
  const [osInfo, setOsInfo] = useState("");
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logoAnim, setLogoAnim] = useState(false);
  const [installerStatus, setInstallerStatus] = useState<{ stage: string; status: string; message: string } | null>(null);
  const [installerRunning, setInstallerRunning] = useState(false);

  const totalSteps = STEPS.length;
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const doneSteps = steps.filter(s => s.status === "done" || s.status === "skipped").length;

  useEffect(() => {
    setLogoAnim(true);
    setDomain(window.location.hostname);
  }, []);


  async function detectOS() {
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "detect" }),
      });
      const data = await res.json();
      setOsInfo(data.os || "Linux");
    } catch { setOsInfo("Linux"); }
  }

  async function runStep(stepId: StepId) {
    setRunning(true);
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: "running" as const } : s));
    setShowHelp(null);
    
    try {
      const body: any = { step: stepId, domain, email: adminEmail, https: enableHttps };
      if (stepId === "admin") { body.adminName = adminName; body.adminPhone = adminPhone; body.adminPassword = adminPassword; }
      
      const res = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      setFullLog(prev => [...prev, `--- ${steps.find(s => s.id === stepId)?.label} ---`, ...(data.log || [])]);
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: data.ok ? ("done" as const) : ("error" as const) } : s));
      if (!data.ok) toast.error(`خطا در ${steps.find(s => s.id === stepId)?.label}`);
    } catch (e: any) {
      setFullLog(prev => [...prev, `❌ ${stepId}: ${e.message}`]);
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: "error" as const } : s));
    }
    setRunning(false);
    setProgress(Math.round(((doneSteps + 1) / totalSteps) * 100));
  }

  async function runAll() {
    for (const step of STEPS) {
      setCurrentStep(step.id);
      await runStep(step.id);
    }
    setCurrentStep("done");
    setAllDone(true);
    setProgress(100);
    toast.success("✅ راه‌اندازی کامل شد!");
    
    // Trigger Installer Worker automatically
    await triggerInstaller();
  }

  async function triggerInstaller() {
    setInstallerRunning(true);
    setFullLog(prev => [...prev, "", "🚀 شروع Installer Worker...", ""]);
    
    try {
      // Trigger installer (no setup token)
      const res = await fetch("/api/setup/trigger-installer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setFullLog(prev => [...prev, `✅ ${data.message}`]);
        toast.success("Installer Worker شروع شد");
        
        // Start polling for status
        pollInstallerStatus();
      } else {
        setFullLog(prev => [...prev, `❌ ${data.error}`]);
        toast.error(data.error || "خطا در شروع Installer Worker");
        setInstallerRunning(false);
      }
    } catch (e: any) {
      setFullLog(prev => [...prev, `❌ ${e.message}`]);
      toast.error("خطا در ارتباط با سرور");
      setInstallerRunning(false);
    }
  }

  async function pollInstallerStatus() {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/setup/installer-status");
        const data = await res.json();
        
        if (data.ok) {
          setInstallerStatus({
            stage: data.state,
            status: data.status,
            message: data.message,
          });
          
          setFullLog(prev => {
            const lastLine = prev[prev.length - 1];
            const newLine = `[${data.state}] ${data.message}`;
            if (lastLine !== newLine) {
              return [...prev, newLine];
            }
            return prev;
          });
          
          // Stop polling if completed or failed
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(pollInterval);
            setInstallerRunning(false);
            
            if (data.status === "completed") {
              toast.success("✅ نصب با موفقیت کامل شد!");
              setFullLog(prev => [...prev, "", "🎉 نصب با موفقیت کامل شد!", ""]);
            } else {
              toast.error("❌ نصب با خطا مواجه شد");
              setFullLog(prev => [...prev, "", "❌ نصب با خطا مواجه شد", ""]);
            }
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 3000); // Poll every 3 seconds
  }

  function goToStep(stepId: StepId) {
    if (!running) setCurrentStep(stepId);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-petrol-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        
        {/* 🎬 صفحه خوش‌آمدگویی */}
        {currentStep === "welcome" && (
          <div className="text-center">
            <div className={cn("transition-all duration-1000 transform", logoAnim ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
              <div className="flex justify-center mb-6">
                <div className="flex size-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-petrol-500 via-petrol-600 to-navy-800 shadow-2xl animate-pulse-slow">
                  <Sparkles className="size-12 text-white" />
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">درنیکا ساحل</h1>
              <p className="text-lg text-pearl-200/60 mb-2">Dornika Sahel — Setup Wizard</p>
              <p className="text-sm text-pearl-200/40 mb-8">سیستم عامل: {osInfo || "در حال تشخیص..."}</p>
            </div>

            <div className="mx-auto mb-4 max-w-md text-right">
              <p className="text-xs text-pearl-200/60">
                مرحله نصب بدون نیاز به توکن انجام می‌شود.
              </p>
            </div>
            <button onClick={async () => { await detectOS(); setCurrentStep("domain"); setProgress(5); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-petrol-600 to-petrol-500 px-8 py-4 text-base font-bold text-white shadow-2xl hover:opacity-90 transition-all hover:scale-105">
              <Play className="size-5" /> شروع راه‌اندازی
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-pearl-200/30">
              <Server className="size-3" /> {osInfo}
            </div>
          </div>
        )}

        {/* 📋 مراحل نصب */}
        {currentStep !== "welcome" && currentStep !== "done" && (
          <div className="space-y-6">
            {/* نوار پیشرفت */}
            <div className="relative pt-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white">راه‌اندازی سرور</h2>
                <span className="text-xs text-pearl-200/50">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-l from-petrol-500 to-petrol-300 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[8px] text-pearl-200/30">
                {STEPS.map((s, i) => <span key={s.id} className={cn(i <= currentIndex ? "text-petrol-400" : "")}>{i + 1}</span>)}
              </div>
            </div>

            {/* دکمه بازگشت و راهنما */}
            <div className="flex items-center justify-between">
              <button onClick={() => { const prev = STEPS[currentIndex - 1]; if (prev) goToStep(prev.id); }} disabled={currentIndex === 0 || running}
                className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-[11px] text-white/50 hover:bg-white/10 disabled:opacity-30">
                <ArrowLeft className="size-3" /> قبلی
              </button>
              {steps.find(s => s.id === currentStep)?.help && (
                <button onClick={() => setShowHelp(showHelp === currentStep ? null : currentStep)}
                  className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-3 py-1.5 text-[11px] text-amber-400 hover:bg-amber-500/30">
                  <HelpCircle className="size-3" /> راهنما
                </button>
              )}
            </div>

            {/* راهنمای باز شده */}
            {showHelp === currentStep && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-200/90 leading-6 whitespace-pre-line">
                {steps.find(s => s.id === currentStep)?.help?.replace("[IP_SERVER]", window.location.hostname || "SERVER_IP")}
              </div>
            )}

            {/* محتوای مرحله */}
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              {/* هدر مرحله */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-petrol-500/20 to-petrol-600/10 border border-petrol-500/20">
                  {steps.find(s => s.id === currentStep)?.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{steps.find(s => s.id === currentStep)?.label}</h3>
                  <p className="text-xs text-pearl-200/50">{steps.find(s => s.id === currentStep)?.desc}</p>
                </div>
              </div>

              {/* فیلدهای اختصاصی هر مرحله */}
              <div className="space-y-4">
                {currentStep === "domain" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-pearl-200/80 mb-2">🌐 دامنه سایت</label>
                      <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="dornika.shop"
                        className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-petrol-500 placeholder:text-white/30 font-mono" />
                    </div>
                    <div className="rounded-xl bg-blue-500/10 p-3 text-[11px] text-blue-300 leading-6">
                      <p className="font-semibold mb-1">📌 راهنمای تنظیم CDN:</p>
                      <details>
                        <summary className="cursor-pointer text-blue-400">🔵 کلودفلر (Cloudflare)</summary>
                        <ol className="list-decimal list-inside space-y-1 mt-2">
                          <li>وارد پنل کلودفلر شوید</li>
                          <li>یک <strong>A Record</strong> ایجاد کنید</li>
                          <li>Name: <code className="bg-white/10 px-1 rounded">@</code> یا <code className="bg-white/10 px-1 rounded">www</code></li>
                          <li>IPv4: <code className="bg-white/10 px-1 rounded">{window.location.hostname || "SERVER_IP"}</code></li>
                          <li>Proxy: <strong>Proxied</strong> (نارنجی)</li>
                          <li>SSL/TLS: <strong>Full</strong></li>
                        </ol>
                      </details>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-green-400">🟢 اروان کلود (ArvanCloud)</summary>
                        <ol className="list-decimal list-inside space-y-1 mt-2">
                          <li>وارد پنل اروان کلود شوید</li>
                          <li>DNS → <strong>افزودن رکورد</strong></li>
                          <li>نوع: <strong>A</strong> - نام: <strong>@</strong></li>
                          <li>مقدار: <code className="bg-white/10 px-1 rounded">{window.location.hostname || "SERVER_IP"}</code></li>
                          <li>CDN: <strong>فعال</strong> (سبز)</li>
                          <li>SSL: <strong>رایگان</strong> از اروان</li>
                        </ol>
                      </details>
                    </div>
                  </div>
                )}

                {currentStep === "email" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-pearl-200/80 mb-2">📧 ایمیل ادمین</label>
                      <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com"
                        className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-petrol-500 placeholder:text-white/30 font-mono" />
                    </div>
                    <div className="rounded-xl bg-blue-500/10 p-3 text-[11px] text-blue-300 leading-6">
                      <p>این ایمیل برای دریافت اعلان‌های سیستم و SSL استفاده می‌شود.</p>
                    </div>
                  </div>
                )}

                {currentStep === "admin" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-pearl-200/80 mb-2">نام ادمین</label>
                      <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="مدیر سیستم"
                        className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-petrol-500 placeholder:text-white/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-pearl-200/80 mb-2">شماره موبایل</label>
                      <input type="text" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="09123456789"
                        className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-petrol-500 placeholder:text-white/30 font-mono" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-pearl-200/80 mb-2">رمز عبور</label>
                      <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="حداقل ۱۲ کاراکتر"
                        className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-petrol-500 placeholder:text-white/30" />
                    </div>
                  </div>
                )}

                {currentStep === "backup" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-blue-500/10 p-3 text-[11px] text-blue-300 leading-6">
                      <p>پوشه بکاپ در مسیر APP_DATA_DIR/backups ساخته می‌شود.</p>
                      <p className="mt-2">تنظیمات بکاپ خودکار را می‌توانید بعداً از پنل مدیریت تغییر دهید.</p>
                    </div>
                  </div>
                )}

                {/* دکمه اجرا */}
                <button onClick={() => runStep(currentStep)} disabled={running || steps.find(s => s.id === currentStep)?.status === "done"}
                  className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all",
                    steps.find(s => s.id === currentStep)?.status === "done"
                      ? "bg-emerald-600 text-white"
                      : "bg-gradient-to-r from-petrol-600 to-petrol-500 text-white hover:opacity-90",
                    "disabled:opacity-50")}>
                  {steps.find(s => s.id === currentStep)?.status === "done" ? <><CheckCircle2 className="size-5" /> انجام شد</>
                    : running ? <><Loader2 className="size-5 animate-spin" /> در حال اجرا...</>
                    : <><Play className="size-5" /> اجرای این مرحله</>}
                </button>
              </div>
            </div>

            {/* دکمه نصب کامل */}
            <button onClick={runAll} disabled={running}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50 transition-all">
              <Server className="size-5" /> اجرای تمام مراحل به صورت خودکار
            </button>
          </div>
        )}

        {/* 🎉 صفحه اتمام */}
        {currentStep === "done" && (
          <div className="text-center space-y-6">
            <div className={cn("transition-all duration-1000", "scale-100 opacity-100")}>
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "flex size-24 items-center justify-center rounded-full border-4 transition-all",
                  installerStatus?.status === "completed" ? "bg-emerald-500/20 border-emerald-500/30" :
                  installerStatus?.status === "failed" ? "bg-red-500/20 border-red-500/30" :
                  "bg-petrol-500/20 border-petrol-500/30 animate-pulse"
                )}>
                  {installerStatus?.status === "completed" ? (
                    <CheckCircle2 className="size-12 text-emerald-400" />
                  ) : installerStatus?.status === "failed" ? (
                    <XCircle className="size-12 text-red-400" />
                  ) : (
                    <Loader2 className="size-12 text-petrol-400 animate-spin" />
                  )}
                </div>
              </div>
              
              <h1 className="text-3xl font-black text-white mb-2">
                {installerStatus?.status === "completed" ? "✅ نصب کامل شد" :
                 installerStatus?.status === "failed" ? "❌ نصب با خطا مواجه شد" :
                 "⏳ در حال نصب..."}
              </h1>
              
              <p className="text-sm text-pearl-200/60 mb-4">
                {installerStatus?.message || "Installer Worker در حال اجرای تنظیمات نهایی است..."}
              </p>

              {installerStatus && (
                <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-left space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-pearl-200/60">مرحله:</span>
                      <span className="text-white font-mono">{installerStatus.stage}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-pearl-200/60">وضعیت:</span>
                      <span className={cn(
                        "font-mono",
                        installerStatus.status === "completed" ? "text-emerald-400" :
                        installerStatus.status === "failed" ? "text-red-400" :
                        "text-petrol-400"
                      )}>{installerStatus.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {installerStatus?.status === "completed" && (
                <div className="max-w-md mx-auto mt-6 space-y-3">
                  <a href="/admin" className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-petrol-600 to-petrol-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-all">
                    ورود به پنل مدیریت
                  </a>
                  <a href="/" className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15 transition-all">
                    مشاهده سایت
                  </a>
                </div>
              )}

              {installerRunning && (
                <p className="text-xs text-pearl-200/40 mt-4">
                  لطفاً صبر کنید... Installer Worker در حال اجرای تنظیمات است.
                  <br />
                  می‌توانید پیشرفت را با دستور زیر بررسی کنید:
                  <br />
                  <code className="text-petrol-400">sudo journalctl -u dornika-installer -f</code>
                </p>
              )}
            </div>

            {fullLog.length > 0 && (
              <details className="text-right">
                <summary className="text-xs text-pearl-200/40 cursor-pointer hover:text-pearl-200/60">مشاهده گزارش کامل</summary>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-black/30 p-4 space-y-1 text-left" dir="ltr">
                  {fullLog.map((line, i) => (
                    <p key={i} className={`text-[10px] font-mono ${
                      line.startsWith("✅") ? "text-emerald-400" : 
                      line.startsWith("❌") ? "text-red-400" :
                      line.startsWith("🚀") ? "text-petrol-400" :
                      line.startsWith("🎉") ? "text-emerald-400" :
                      "text-white/50"
                    }`}>{line}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;
