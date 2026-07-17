"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Mail, Phone, Trash2, Check, Reply, Send, Sparkles, ChevronDown, User, Clock, Tag, Filter, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/admin/RichEditor";

type Message = { id: number; name: string; email: string | null; phone: string | null; subject: string | null; message: string; type: string; status: string; repliedAt: string | null; createdAt: string; };

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // پاسخ
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // AI
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => { setLoading(true); fetch("/api/admin/contact-messages").then(r => r.json()).then(d => setMessages(d.data || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!filter) return messages;
    return messages.filter(m => m.status === filter);
  }, [messages, filter]);

  const unreadCount = messages.filter(m => m.status === "unread").length;

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/admin/contact-messages/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setMessages(messages.map(m => m.id === id ? { ...m, status } : m));
    if (selected?.id === id) setSelected({ ...selected, status });
    toast.success("وضعیت به‌روزرسانی شد");
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این پیام مطمئن هستید؟")) return;
    await fetch(`/api/admin/contact-messages/${id}`, { method: "DELETE" });
    toast.success("پیام حذف شد");
    if (selected?.id === id) setSelected(null);
    load();
  }

  async function handleReply() {
    if (!replyContent.trim() || !selected) return;
    setSendingReply(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "ادمین درنیکا ساحل",
          email: selected.email || undefined,
          subject: `پاسخ به ${selected.subject || "پیام شما"}`,
          message: replyContent,
          type: "reply",
          parentId: selected.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await updateStatus(selected.id, "replied");
        setShowReply(false);
        setReplyContent("");
        toast.success("✅ پاسخ ارسال شد");
      } else toast.error(data.error || "خطا");
    } catch { toast.error("خطا در ارسال پاسخ"); }
    setSendingReply(false);
  }

  async function analyzeWithAI() {
    if (!selected) return;
    setAiLoading(true);
    setAiSummary("");
    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `خلاصه‌ای از این پیام کاربر به من بده و پیشنهاد پاسخ مناسب بده:\n\nنام: ${selected.name}\nایمیل: ${selected.email || "—"}\nتلفن: ${selected.phone || "—"}\nموضوع: ${selected.subject || "—"}\nپیام: ${selected.message}`,
        }),
      });
      const data = await res.json();
      if (data.ok) setAiSummary(data.response || data.reply || "✅ تحلیل انجام شد");
      else setAiSummary("⚠️ خطا: " + (data.error || "نامشخص"));
    } catch { setAiSummary("⚠️ خطا در ارتباط با هوش مصنوعی"); }
    setAiLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Mail className="size-6 text-petrol-600" strokeWidth={1.6} />
            پیام‌های تماس با ما
          </h1>
          <p className="mt-1 text-sm text-slate-500">{messages.length} پیام · {unreadCount} نخوانده</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.7} /> تازه‌سازی
        </button>
      </div>

      {/* فیلتر */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><Filter className="size-3.5" strokeWidth={1.6} /> فیلتر:</span>
        {["", "unread", "read", "replied"].map(status => (
          <button key={status} onClick={() => setFilter(status)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              filter === status ? "bg-petrol-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}>
            {status === "" ? "همه" : status === "unread" ? "نخوانده" : status === "read" ? "خوانده" : "پاسخ داده"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* لیست پیام‌ها */}
        <div className="space-y-2 max-h-[650px] overflow-y-auto pl-1">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-slate-400">
              <Mail className="size-10 mb-3 opacity-40" strokeWidth={1.2} />
              <p className="text-sm">هیچ پیامی وجود ندارد</p>
            </div>
          ) : filtered.map(m => (
            <button key={m.id} onClick={() => { setSelected(m); setShowReply(false); if (m.status === "unread") updateStatus(m.id, "read"); }}
              className={cn("w-full text-right rounded-xl border p-4 transition-all", selected?.id === m.id ? "border-petrol-500 bg-petrol-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {m.status === "unread" && <span className="size-2 rounded-full bg-blue-500" />}
                  <p className={cn("text-sm", m.status === "unread" ? "font-bold text-slate-900" : "font-medium text-slate-700")}>{m.name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.type === "quote" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">استعلام</span>}
                  <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleDateString("fa-IR")}</span>
                </div>
              </div>
              <p className={cn("mt-1 text-xs line-clamp-2", m.status === "unread" ? "text-slate-700" : "text-slate-500")}>{m.subject || m.message}</p>
            </button>
          ))}
        </div>

        {/* نمایش پیام */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selected ? (
            <div className="flex flex-col h-full">
              {/* هدر پیام */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">{selected.subject || "بدون موضوع"}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500"><User className="size-3" strokeWidth={1.6} /> {selected.name}</span>
                      {selected.email && <span className="flex items-center gap-1 text-[11px] text-slate-500"><Mail className="size-3" strokeWidth={1.6} /> {selected.email}</span>}
                      {selected.phone && <span className="flex items-center gap-1 text-[11px] text-slate-500"><Phone className="size-3" strokeWidth={1.6} /> {selected.phone}</span>}
                      <span className="flex items-center gap-1 text-[11px] text-slate-500"><Clock className="size-3" strokeWidth={1.6} /> {new Date(selected.createdAt).toLocaleDateString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                    selected.status === "unread" ? "bg-blue-100 text-blue-700" :
                    selected.status === "replied" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                    {selected.status === "unread" ? "نخوانده" : selected.status === "replied" ? "پاسخ داده شده" : "خوانده شده"}
                  </span>
                </div>
              </div>

              {/* محتوای پیام */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="rounded-xl bg-slate-50 p-4 text-xs leading-7 whitespace-pre-wrap border border-slate-100">
                  {selected.message}
                </div>

                {/* خلاصه هوش مصنوعی */}
                {aiSummary && (
                  <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 mb-2">
                      <Sparkles className="size-3.5" strokeWidth={1.7} /> تحلیل هوش مصنوعی
                    </div>
                    <p className="text-xs leading-6 text-purple-900 whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}

                {/* فرم پاسخ */}
                {showReply && (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">متن پاسخ</label>
                    <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={4}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-petrol-500"
                      placeholder="پاسخ خود را بنویسید..." />
                    <div className="flex items-center gap-2">
                      <button onClick={handleReply} disabled={sendingReply || !replyContent.trim()}
                        className="flex items-center gap-1.5 rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-white hover:bg-petrol-500 disabled:opacity-50">
                        <Send className="size-3.5" strokeWidth={1.7} /> {sendingReply ? "در حال ارسال..." : "ارسال پاسخ"}
                      </button>
                      <button onClick={() => setShowReply(false)} className="text-xs text-slate-500 hover:text-slate-700">انصراف</button>
                    </div>
                  </div>
                )}
              </div>

              {/* اکشن‌ها */}
              <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2">
                {!showReply && (
                  <button onClick={() => setShowReply(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-petrol-50 px-3 py-2 text-[10px] font-medium text-petrol-700 hover:bg-petrol-100">
                    <Reply className="size-3.5" strokeWidth={1.7} /> پاسخ به {selected.name}
                  </button>
                )}
                {selected.status !== "read" && selected.status !== "replied" && (
                  <button onClick={() => updateStatus(selected.id, "read")}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-medium text-blue-700 hover:bg-blue-100">
                    <Check className="size-3.5" strokeWidth={1.7} /> خوانده شد
                  </button>
                )}
                <button onClick={() => updateStatus(selected.id, "replied")}
                  className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-[10px] font-medium text-green-700 hover:bg-green-100">
                  <Check className="size-3.5" strokeWidth={1.7} /> پاسخ داده شد
                </button>
                <button onClick={() => analyzeWithAI()} disabled={aiLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                  <Sparkles className="size-3.5" strokeWidth={1.7} /> {aiLoading ? "در حال تحلیل..." : "تحلیل با هوش مصنوعی"}
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-medium text-red-600 hover:bg-red-100">
                  <Trash2 className="size-3.5" strokeWidth={1.7} /> حذف
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Mail className="size-12 mb-3 opacity-30" strokeWidth={1.2} />
              <p className="text-sm font-medium">یک پیام را برای مشاهده انتخاب کنید</p>
              <p className="mt-1 text-xs">با کلیک روی هر پیام، جزئیات آن نمایش داده می‌شود</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
