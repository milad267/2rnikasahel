"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Paperclip, ChevronLeft } from "lucide-react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const SUGGESTIONS = [
  "یک پست بلاگ درباره گرمایش از کف بنویس",
  "یک محصول لوله با برند وگا بساز",
  "یک اسلاید جدید برای اسلایدر بساز",
  "گزارش فروش بده",
];

export function AdminAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "سلام مدیر عزیز! 👋 من دستیار عملیاتی پنل با دسترسی کامل هستم. می‌توانم محصول ستون‌شده با تنوع بسازم، پست بلاگ اورجینال بنویسم، فایل‌های PDF/Word/تصویر را بخوانم و گزارش بدهم.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.ok ? data.response : `❌ ${data.error || "خطا در پاسخگویی"}`,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ خطا در ارتباط با سرور" }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(text: string) {
    setInput(text);
  }

  return (
    <>
      {/* دکمه بنفش فلوتینگ */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl transition-all hover:scale-105 hover:shadow-purple-600/30"
        title="دستیار عملیاتی"
      >
        <Sparkles className="size-5" strokeWidth={1.6} />
      </button>

      {/* چت باکس */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="mx-4 flex h-[600px] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl sm:h-[520px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header با گرادینت بنفش */}
            <div className="flex-shrink-0 rounded-t-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="size-5" strokeWidth={1.5} />
                  <div>
                    <h3 className="text-sm font-bold">دستیار عملیاتی ادمین</h3>
                    <p className="flex items-center gap-1 text-[10px] text-white/70">
                      <span className="size-1.5 rounded-full bg-green-400" />
                      هوش مصنوعی
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="flex size-7 items-center justify-center rounded-full bg-white/15">
                  <X className="size-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-6 ${
                      msg.role === "assistant"
                        ? "bg-purple-50 text-purple-900"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-purple-50 px-4 py-3 text-xs text-purple-700">
                    در حال فکر کردن...
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
              <div className="flex-shrink-0 px-4 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestion(s)}
                      className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-[10px] font-medium text-purple-700 transition-colors hover:bg-purple-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="flex-shrink-0 border-t border-slate-100 p-3">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5">
                <button type="button" className="text-slate-400 hover:text-slate-600">
                  <Paperclip className="size-4" strokeWidth={1.5} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="دستور خود را بنویسید..."
                  className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex size-7 items-center justify-center rounded-full bg-purple-600 text-white disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" strokeWidth={2} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
