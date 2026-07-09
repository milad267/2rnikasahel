"use client";

import { useState } from "react";
import { Sparkles, PencilLine, Wand2, SpellCheck, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  /** نام محصول یا عنوان پست برای زمینه‌سازی */
  productName?: string;
  /** متن فعلی ویرایشگر (HTML) */
  text?: string;
  /** خروجی جدید روی ویرایشگر اعمال می‌شود */
  onResult: (html: string) => void;
  /** آیا حالت متن کوتاه (بدون HTML) است */
  short?: boolean;
  className?: string;
};

const ACTIONS = [
  { key: "write", label: "نوشتن با AI", icon: PencilLine },
  { key: "improve", label: "بهبود متن", icon: Wand2 },
  { key: "spellcheck", label: "اصلاح املا", icon: SpellCheck },
  { key: "seo", label: "بهینه سئو", icon: TrendingUp },
] as const;

export function AiAssistBar({ productName, text, onResult, short, className }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string) {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: short && action === "write" ? "short" : action,
          productName,
          text,
        }),
      });
      const data = await res.json();
      if (data.ok && data.result) {
        onResult(data.result);
        toast.success("✨ متن با هوش مصنوعی به‌روزرسانی شد");
      } else {
        toast.error(data.error || "خطا در دستیار هوشمند");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className || ""}`}>
      <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-600">
        <Sparkles className="size-3" /> دستیار AI:
      </span>
      {ACTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          disabled={!!loading}
          onClick={() => run(key)}
          className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/60 px-2 py-1 text-[10px] font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
        >
          {loading === key ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3" />}
          {label}
        </button>
      ))}
    </div>
  );
}
