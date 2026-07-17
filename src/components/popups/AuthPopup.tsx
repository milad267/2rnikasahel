"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Lock, User, Smartphone, KeyRound, ArrowRight, CheckCircle2, Timer, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LuxePopup } from "@/components/ui/LuxePopup";

function detectType(input: string): "phone" | "email" | null {
  const clean = input.replace(/\s/g, "");
  if (/^0?9\d{9}$/.test(clean) || /^\+98\d{9,13}$/.test(clean)) return "phone";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return "email";
  return null;
}

export function AuthPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<"form" | "otp" | "name">("form");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devCode, setDevCode] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeInputs = Array(6).fill(0);

  useEffect(() => {
    if (retryAfter > 0) {
      timerRef.current = setInterval(() => {
        setRetryAfter((prev) => { if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return prev - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [retryAfter]);

  function reset() {
    setStep("form"); setTarget(""); setName(""); setPassword("");
    setCode(["", "", "", "", "", ""]); setError(""); setSuccess(""); setDevCode(""); setRetryAfter(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const detectedType = target ? detectType(target) : null;

  async function sendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!target.trim() || loading || !detectedType) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), type: detectedType }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.devCode) setDevCode(data.devCode);
      setRetryAfter(60); setStep("otp"); setSuccess("کد تایید ارسال شد.");
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  const verifyOtpCode = useCallback(async (userName?: string) => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), code: fullCode, name: (userName || name).trim() || undefined }),
      });
      const data = await res.json();
      if (!data.ok) { if (data.requiresName) { setStep("name"); return; } throw new Error(data.error); }
      router.refresh(); onClose(); reset();
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [code, target, name, router, onClose]);

  async function submitName(e: React.FormEvent) { e.preventDefault(); if (!name.trim()) return; await verifyOtpCode(name.trim()); }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim() || !password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: target.trim(), password }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      router.refresh(); onClose(); reset();
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  function handleCodeChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code]; newCode[index] = value; setCode(newCode);
    if (value && index < 5) { const next = document.getElementById(`otp-${index + 1}`); next?.focus(); }
    if (value && index === 5) { const full = [...newCode]; full[5] = value; if (full.every((c) => c !== "")) setTimeout(() => verifyOtpCode(), 200); }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) { if (e.key === "Backspace" && !code[index] && index > 0) { const prev = document.getElementById(`otp-${index - 1}`); prev?.focus(); } }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < Math.min(pasted.length, 6); i++) newCode[i] = pasted[i];
    setCode(newCode);
    if (pasted.length === 6) setTimeout(() => verifyOtpCode(), 200);
  }

  return (
    <LuxePopup open={open} onClose={onClose} title="ورود به درنیکا ساحل">
      {/* تب‌ها: کد تایید (یکپارچه) | رمز عبور */}
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-navy-900/5 p-1">
        <button type="button" onClick={() => { setMode("otp"); reset(); }}
          className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-semibold transition-all",
            mode === "otp" ? "bg-petrol-600 text-pearl-50 shadow-md" : "text-charcoal-500 hover:text-navy-900"
          )}>
          <Smartphone className={cn("size-4", mode === "otp" ? "text-pearl-50" : "")} strokeWidth={1.7} />
          کد تایید
        </button>
        <button type="button" onClick={() => { setMode("password"); reset(); }}
          className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-semibold transition-all",
            mode === "password" ? "bg-petrol-600 text-pearl-50 shadow-md" : "text-charcoal-500 hover:text-navy-900"
          )}>
          <KeyRound className={cn("size-4", mode === "password" ? "text-pearl-50" : "")} strokeWidth={1.7} />
          رمز عبور
        </button>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">{error}</div>}
      {success && <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-700">{success}</div>}
      {devCode && <div className="mb-4 rounded-2xl border border-petrol-200 bg-petrol-50 p-3 text-[11px] font-medium text-petrol-800">🔑 کد تایید (توسعه): {devCode}</div>}

      {/* ─── حالت کد تایید (تشخیص خودکار شماره/ایمیل) ─── */}
      {mode === "otp" && step === "form" && (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-900">شماره موبایل یا ایمیل</label>
            <div className="relative">
              {detectedType === "phone" ? <Phone className="absolute start-3.5 top-3.5 size-4 text-petrol-500" strokeWidth={1.6} />
                : detectedType === "email" ? <Mail className="absolute start-3.5 top-3.5 size-4 text-petrol-500" strokeWidth={1.6} />
                : <User className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />}
              <input type="text" required value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="شماره موبایل یا ایمیل خود را وارد کنید"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white" />
            </div>
            {detectedType && (
              <p className="mt-1.5 text-[10px] font-medium text-petrol-600">
                {detectedType === "phone" ? "📱 کد تایید از طریق پیامک ارسال می‌شود" : "✉️ کد تایید از طریق ایمیل ارسال می‌شود"}
              </p>
            )}
          </div>
          <button type="submit" disabled={loading || !detectedType}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50">
            {loading ? "در حال ارسال..." : "ارسال کد تایید"}
            <ArrowRight className="size-4" strokeWidth={2} />
          </button>
        </form>
      )}

      {/* ─── مرحله وارد کردن کد OTP ─── */}
      {mode === "otp" && step === "otp" && (
        <div className="space-y-5">
          <p className="text-center text-xs text-charcoal-500">
            کد ۶ رقمی ارسال شده به <span className="font-semibold text-navy-900" dir="ltr">{target}</span> را وارد کنید
          </p>
          <div className="flex items-center justify-center gap-2" dir="ltr" onPaste={handlePaste}>
            {codeInputs.map((_, i) => (
              <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={code[i]}
                onChange={(e) => handleCodeChange(i, e.target.value)} onKeyDown={(e) => handleCodeKeyDown(i, e)}
                className="size-11 rounded-xl border border-navy-900/15 bg-navy-900/[0.02] text-center text-lg font-bold text-navy-900 outline-none transition-all focus:border-petrol-500 focus:ring-2 focus:ring-petrol-200" />
            ))}
          </div>
          <button type="button" onClick={() => verifyOtpCode()} disabled={loading || code.join("").length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50">
            {loading ? "در حال بررسی..." : "تایید کد"}
            <CheckCircle2 className="size-4" strokeWidth={2} />
          </button>
          <div className="flex items-center justify-center gap-3">
            {retryAfter > 0 ? (
              <span className="flex items-center gap-1.5 text-[11px] text-charcoal-400"><Timer className="size-3.5" /> ارسال مجدد تا {retryAfter} ثانیه دیگر</span>
            ) : (
              <button type="button" onClick={() => sendOtp()} disabled={loading} className="flex items-center gap-1.5 text-[11px] font-medium text-petrol-600 underline hover:text-petrol-500">
                <RefreshCw className="size-3.5" strokeWidth={1.7} /> ارسال مجدد کد
              </button>
            )}
          </div>
          <button type="button" onClick={() => { setStep("form"); setRetryAfter(0); }} className="block w-full text-center text-[11px] text-charcoal-500 underline hover:text-navy-900">
            تغییر شماره / ایمیل
          </button>
        </div>
      )}

      {/* ─── مرحله وارد کردن نام (کاربر جدید) ─── */}
      {mode === "otp" && step === "name" && (
        <form onSubmit={submitName} className="space-y-4">
          <p className="text-center text-xs text-charcoal-500">برای ثبت‌نام، لطفاً نام خود را وارد کنید:</p>
          <div className="relative">
            <User className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: علی رضایی"
              className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white" />
          </div>
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50">
            {loading ? "در حال ثبت..." : "تکمیل ثبت‌نام و ورود"}
            <ArrowRight className="size-4" strokeWidth={2} />
          </button>
        </form>
      )}

      {/* ─── ورود با رمز عبور ─── */}
      {mode === "password" && (
        <form onSubmit={loginWithPassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-900">شماره موبایل / ایمیل / نام کاربری</label>
            <div className="relative">
              <User className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
              <input type="text" required value={target} onChange={(e) => setTarget(e.target.value)} placeholder="موبایل، ایمیل یا نام کاربری"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-900">کلمه عبور</label>
            <div className="relative">
              <Lock className="absolute start-3.5 top-3.5 size-4 text-charcoal-400" strokeWidth={1.6} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none transition-all focus:border-petrol-500 focus:bg-white" dir="ltr" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 disabled:opacity-50">
            {loading ? "در حال ورود..." : "ورود به حساب"}
            <ArrowRight className="size-4" strokeWidth={2} />
          </button>
        </form>
      )}
    </LuxePopup>
  );
}
