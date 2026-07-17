"use client";

import { useState, useEffect } from "react";
import { SetupWizard } from "@/app/setup/page";
import { Server, Globe, Mail, ShieldCheck, RefreshCw, CheckCircle2, XCircle, AlertCircle, Terminal, Play, Save, Loader2, HardDrive, Cpu, Clock, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ServiceInfo {
  name: string;
  status: "running" | "stopped" | "not_installed" | "unknown";
  version?: string;
  port?: number;
  pid?: number;
  error?: string;
}

interface SystemInfo {
  os: string;
  hostname: string;
  uptime: string;
  memory: string;
  disk: string;
  cpu: string;
}

export default function ServerSettingsPage() {
  const [tab, setTab] = useState<"status" | "domain" | "email" | "ssl" | "install">("status");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/server/status");
      const data = await res.json();
      if (data.ok) {
        setServices(data.services);
        setSystem(data.system);
      } else {
        setError(data.error || "خطا در دریافت وضعیت");
      }
    } catch (e: any) {
      setError(e.message || "خطا در ارتباط با سرور");
      // fallback به داده‌های پیش‌فرض
      setServices([
        { name: "PostgreSQL", status: "unknown", port: 5432 },
        { name: "Nginx", status: "unknown", port: 80 },
        { name: "Sendmail/Postfix", status: "unknown" },
        { name: "Git", status: "unknown" },
        { name: "SSH", status: "unknown", port: 22 },
        { name: "Node.js", status: "unknown" },
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setDomain(window.location.hostname);
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      if (data.ok) {
        const map: Record<string, any> = {};
        data.data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
        setEmail(map["email.smtp.from"] || "");
      }
    }).finally(() => {
      setLoading(false);
      loadStatus();
    });
  }, []);

  function get(key: string, fallback = ""): string { return settings[key] ?? fallback; }

  async function updateSetting(key: string, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    const keys = Object.keys(settings).filter(k => k.startsWith("email.") || k.startsWith("server.") || k.startsWith("telegram.bot_token"));
    let errors = 0;
    await Promise.all(keys.map(async (key) => {
      try {
        const group = key.startsWith("email.") ? "email" : key.startsWith("telegram.") ? "telegram" : "server";
        const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: settings[key], group }) });
        if (!(await res.json()).ok) errors++;
      } catch { errors++; }
    }));
    if (errors === 0) toast.success("✅ تنظیمات سرور ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا`);
    setSaving(false);
  }

  async function restartService(name: string) {
    if (!confirm(`آیا از راه‌اندازی مجدد ${name} مطمئن هستید؟`)) return;
    toast.info(`در حال راه‌اندازی مجدد ${name}...`);
    try {
      const res = await fetch("/api/admin/server/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: name }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ ${name} راه‌اندازی مجدد شد`);
        loadStatus();
      } else if (data.commands) {
        // سرویس از پنل وب غیرفعال است - دستورات SSH را نمایش بده
        const cmdList = Object.entries(data.commands as Record<string, string>)
          .map(([svc, cmd]) => `${svc}: ${cmd}`)
          .join("\n");
        toast.error(
          `⛔ راه‌اندازی مجدد از پنل وب به دلایل امنیتی غیرفعال است.\n\nجهت راه‌اندازی مجدد سرویس‌ها از طریق SSH:\n${cmdList}`,
          { duration: 10000 }
        );
      } else {
        toast.error(data.error || "خطا");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    }
  }

  async function viewLog(name: string) {
    try {
      const res = await fetch(`/api/admin/server/log?service=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.ok) {
        // نمایش لاگ در یک modal ساده با alert
        const logWindow = window.open("", "_blank", "width=800,height=600");
        if (logWindow) {
          logWindow.document.write(`<pre style="background:#1a1a2e;color:#e0e0e0;padding:16px;font-size:12px;direction:ltr;overflow:auto;height:100vh">${data.log || "لاگی یافت نشد"}</pre>`);
          logWindow.document.title = `لاگ ${name}`;
        }
      } else {
        toast.error(data.error || "خطا");
      }
    } catch {
      toast.error("خطا در دریافت لاگ");
    }
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  const ServiceIcon = (name: string) => {
    const map: Record<string, any> = {
      PostgreSQL: Globe, Nginx: Globe, "Sendmail/Postfix": Mail, "Sendmail": Mail,
      Git: Server, SSH: ShieldCheck, "Node.js": Server,
    };
    return map[name] || Server;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Server className="size-6 text-petrol-600" strokeWidth={1.6} />
            مدیریت سرور
          </h1>
          <p className="mt-1 text-sm text-slate-500">مشاهده و ویرایش تنظیمات سرور و سرویس‌ها</p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5 overflow-x-auto">
        {[
          { key: "status" as const, label: "وضعیت سرویس‌ها", icon: Server },
          { key: "domain" as const, label: "دامنه و CDN", icon: Globe },
          { key: "email" as const, label: "ایمیل", icon: Mail },
          { key: "ssl" as const, label: "SSL", icon: ShieldCheck },
          { key: "install" as const, label: "نصب سیستم", icon: Play },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all flex-1 justify-center min-w-[140px]",
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}>
              <Icon className="size-3.5" strokeWidth={1.7} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── نصب سیستم ─── */}
      {tab === "install" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {/*
            Wizard UI از مسیر فعلی setup کپی نشده است.
            اینجا برای جلوگیری از لینک‌دادن به route حذف‌شده، کامپوننت wizard داخل همین پروژه رندر می‌شود.
          */}
          <SetupWizard />
        </div>
      )}

      {/* ─── وضعیت سرویس‌ها ─── */}
      {tab === "status" && (
        <div className="space-y-4">
          {/* خطا */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* دکمه رفرش */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {system?.hostname && <span className="font-mono">{system.hostname}</span>}
              {system?.os && <span className="mr-2 text-[10px] text-slate-400">{system.os.replace(/^PRETTY_NAME="/, "").replace(/"$/, "")}</span>}
            </p>
            <button onClick={loadStatus} disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} strokeWidth={1.6} />
              {refreshing ? "..." : "بروزرسانی"}
            </button>
          </div>

          {/* گرید سرویس‌ها */}
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map(s => {
              const Icon = ServiceIcon(s.name);
              return (
                <div key={s.name} className={cn("rounded-xl border p-4",
                  s.status === "running" ? "border-emerald-200 bg-emerald-50/50" :
                  s.status === "stopped" ? "border-red-200 bg-red-50/50" :
                  s.status === "not_installed" ? "border-amber-200 bg-amber-50/50" :
                  "border-slate-200 bg-white"
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex size-10 items-center justify-center rounded-xl",
                        s.status === "running" ? "bg-emerald-100 text-emerald-600" :
                        s.status === "stopped" ? "bg-red-100 text-red-600" :
                        s.status === "not_installed" ? "bg-amber-100 text-amber-600" :
                        "bg-slate-100 text-slate-400"
                      )}>
                        <Icon className="size-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{s.name}</p>
                        {s.version && <p className="text-[10px] text-slate-500 font-mono">{s.version}</p>}
                        {s.port && <p className="text-[10px] text-slate-400">پورت {s.port}</p>}
                        {s.error && <p className="text-[10px] text-red-400 mt-0.5">{s.error.slice(0, 60)}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {s.status === "running" ? <><CheckCircle2 className="size-4 text-emerald-500" /><span className="text-[10px] font-medium text-emerald-600">فعال</span></>
                          : s.status === "stopped" ? <><XCircle className="size-4 text-red-500" /><span className="text-[10px] font-medium text-red-600">غیرفعال</span></>
                          : s.status === "not_installed" ? <><AlertCircle className="size-4 text-amber-500" /><span className="text-[10px] font-medium text-amber-600">نصب نشده</span></>
                          : <span className="text-[10px] text-slate-400">نامشخص</span>}
                      </div>
                      {/* دکمه‌های عملیات - فقط برای سرویس‌های نصب شده */}
                      {s.status !== "not_installed" && s.status !== "unknown" && (
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => viewLog(s.name)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[8px] font-medium text-slate-500 hover:bg-slate-50"
                            title="نمایش لاگ">
                            <Terminal className="size-2.5" /> لاگ
                          </button>
                          <button onClick={() => restartService(s.name)}
                            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-medium text-amber-600 hover:bg-amber-100"
                            title="راه‌اندازی مجدد">
                            <Play className="size-2.5" /> restart
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* اطلاعات سیستم */}
          {system && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SystemInfoCard icon={HardDrive} label="فضای دیسک" value={system.disk} />
              <SystemInfoCard icon={Cpu} label="پردازنده" value={system.cpu} />
              <SystemInfoCard icon={Activity} label="حافظه" value={system.memory} />
              <SystemInfoCard icon={Clock} label="آپتایم" value={system.uptime} />
            </div>
          )}

          {/* نکته */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[10px] text-slate-500">
            <strong>💡 نکته:</strong> وضعیت سرویس‌ها به صورت لحظه‌ای از سرور دریافت می‌شود. دکمه <strong>restart</strong> به دلایل امنیتی از پنل وب غیرفعال است — برای راه‌اندازی مجدد سرویس‌ها از طریق SSH اقدام کنید.
          </div>
        </div>
      )}

      {/* ─── دامنه و CDN ─── */}
      {tab === "domain" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">🌐 تنظیمات دامنه</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">دامنه سایت</label>
                <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900">
              <p className="font-semibold mb-2">🔵 کلودفلر (Cloudflare):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>وارد پنل کلودفلر شوید</li>
                <li>یک <strong>A Record</strong> ایجاد کنید</li>
                <li>Name: <code className="bg-blue-100 px-1 rounded">@</code> یا <code className="bg-blue-100 px-1 rounded">www</code></li>
                <li>IPv4: <code className="bg-blue-100 px-1 rounded">{domain}</code></li>
                <li>Proxy: <strong>Proxied</strong> (نارنجی)</li>
                <li>SSL/TLS: <strong>Full</strong> یا <strong>Flexible</strong></li>
              </ol>
            </div>

            <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-xs leading-6 text-green-900">
              <p className="font-semibold mb-2">🟢 اروان کلود (ArvanCloud):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>وارد پنل اروان کلود شوید</li>
                <li>DNS → <strong>افزودن رکورد</strong></li>
                <li>نوع: <strong>A</strong> — نام: <strong>@</strong></li>
                <li>مقدار: <code className="bg-green-100 px-1 rounded">{domain}</code></li>
                <li>CDN: <strong>فعال</strong> (سبز)</li>
                <li>SSL: <strong>رایگان</strong> از اروان</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ─── ایمیل ─── */}
      {tab === "email" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">📧 تنظیمات ایمیل</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">هاست SMTP</label>
                <input type="text" value={get("email.smtp.host")} onChange={e => updateSetting("email.smtp.host", e.target.value)} placeholder="localhost"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">پورت</label>
                <input type="text" value={get("email.smtp.port")} onChange={e => updateSetting("email.smtp.port", e.target.value)} placeholder="25"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">ایمیل فرستنده</label>
                <input type="text" value={get("email.smtp.from")} onChange={e => updateSetting("email.smtp.from", e.target.value)} placeholder="noreply@domain.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500 font-mono" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">روش ارسال</label>
                <select value={get("email.mailer", "sendmail")} onChange={e => updateSetting("email.mailer", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                  <option value="sendmail">Sendmail (محلی)</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
            </div>
          </div>

          {/* راهنمای راه‌اندازی ایمیل */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
              <p className="font-semibold mb-2">📨 روش Sendmail (پیش‌فرض):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>روش ارسال را روی <strong>Sendmail</strong> بگذارید</li>
                <li>هاست SMTP و پورت نیازی به تنظیم ندارند</li>
                <li>فقط <strong>ایمیل فرستنده</strong> را وارد کنید</li>
                <li>ایمیل‌ها از طریق <code className="bg-amber-100 px-1 rounded">mail()</code> PHP یا sendmail سرور ارسال می‌شوند</li>
                <li>روی هاست‌های اشتراکی و cPanel <strong>بدون تنظیمات اضافه</strong> کار می‌کند</li>
                <li>اگر روی سرور مجازی هستید، <strong>sendmail</strong> یا <strong>Postfix</strong> باید نصب باشد</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900">
              <p className="font-semibold mb-2">🔌 روش SMTP (پیشنهادی):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>روش ارسال را روی <strong>SMTP</strong> بگذارید</li>
                <li>مقادیر زیر را از ارائه‌دهنده ایمیل خود دریافت کنید:</li>
                <li className="list-none mr-4 mt-1">
                  <ul className="space-y-1">
                    <li><strong>هاست SMTP:</strong> <code className="bg-blue-100 px-1 rounded">smtp.gmail.com</code> یا <code className="bg-blue-100 px-1 rounded">mail.yourdomain.com</code></li>
                    <li><strong>پورت:</strong> <code className="bg-blue-100 px-1 rounded">587</code> (TLS) یا <code className="bg-blue-100 px-1 rounded">465</code> (SSL)</li>
                    <li><strong>نام کاربری:</strong> ایمیل کامل خود (مانند <code className="bg-blue-100 px-1 rounded">info@domain.com</code>)</li>
                    <li><strong>رمز عبور:</strong> رمز یا App Password</li>
                  </ul>
                </li>
                <li className="mt-2">برای <strong>Gmail</strong> از <strong>App Password</strong> استفاده کنید</li>
                <li>برای <strong>ایمیل سازمانی</strong> از پورت ۴۶۵ با SSL استفاده کنید</li>
              </ol>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-[10px] leading-5 text-purple-800">
            <p className="font-semibold">💡 نکته:</p>
            <p>بعد از ذخیره تنظیمات، سرویس sendmail یا postfix باید روی سرور فعال باشد. از تب "وضعیت سرویس‌ها" می‌توانید بررسی کنید.</p>
          </div>

          <div className="flex justify-end">
            <button onClick={saveSettings} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              <Save className="size-4" /> {saving ? "..." : "ذخیره تنظیمات"}
            </button>
          </div>
        </div>
      )}

      {/* ─── SSL ─── */}
      {tab === "ssl" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">🔒 گواهی SSL</h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800">
                <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> SSL فعال است</p>
                <p className="mt-1">گواهی توسط Let's Encrypt صادر شده است.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                <p className="font-semibold mb-1">📋 اطلاعات گواهی:</p>
                <p>صادرکننده: Let's Encrypt</p>
                <p>اعتبار: ۹۰ روز</p>
                <p>تمدید خودکار: فعال</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemInfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="size-3.5 text-slate-400" strokeWidth={1.5} />
        <span className="text-[10px] font-medium text-slate-500">{label}</span>
      </div>
      <p className="text-[11px] font-semibold text-slate-800 font-mono truncate" dir="ltr">{value}</p>
    </div>
  );
}
