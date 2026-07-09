"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone, Trash2, Check, Reply, Archive, X, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/admin/RichEditor";

type Message = { id: number; name: string; email: string | null; phone: string | null; subject: string | null; message: string; type: string; status: string; repliedAt: string | null; createdAt: string; };

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => { setLoading(true); fetch("/api/admin/contact-messages").then(r => r.json()).then(d => setMessages(d.data || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = statusFilter ? messages.filter(m => m.status === statusFilter) : messages;

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/admin/contact-messages/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setMessages(messages.map(m => m.id === id ? { ...m, status } : m));
    if (selected?.id === id) setSelected({ ...selected, status });
    toast.success("وضعیت به‌روزرسانی شد");
  }

  const unreadCount = messages.filter(m => m.status === "unread").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-slate-900">پیام‌های تماس با ما</h1><p className="mt-1 text-sm text-slate-500">{messages.length} پیام دریافتی · {unreadCount} نخوانده</p></div>
      </div>

      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none">
          <option value="">همه پیام‌ها</option>
          <option value="unread">نخوانده ({unreadCount})</option>
          <option value="read">خوانده شده</option>
          <option value="replied">پاسخ داده شده</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* لیست پیام‌ها */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-slate-400">
              <p className="text-sm">هیچ پیامی وجود ندارد</p>
            </div>
          ) : filtered.map(m => (
            <button key={m.id} onClick={() => { setSelected(m); if (m.status === "unread") updateStatus(m.id, "read"); }}
              className={cn("w-full text-right rounded-xl border p-4 transition-all", selected?.id === m.id ? "border-petrol-500 bg-petrol-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {m.status === "unread" && <span className="size-2 rounded-full bg-blue-500" />}
                  <p className={cn("text-sm", m.status === "unread" ? "font-bold text-slate-900" : "font-medium text-slate-700")}>{m.name}</p>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleDateString("fa-IR")}</span>
              </div>
              <p className={cn("mt-1 text-xs line-clamp-2", m.status === "unread" ? "text-slate-700" : "text-slate-500")}>{m.subject || m.message}</p>
            </button>
          ))}
        </div>

        {/* نمایش پیام */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{selected.subject || "بدون موضوع"}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${selected.status === "unread" ? "bg-blue-100 text-blue-700" : selected.status === "replied" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                  {selected.status === "unread" ? "نخوانده" : selected.status === "replied" ? "پاسخ داده شده" : "خوانده شده"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2"><Mail className="size-3.5 text-slate-400" />{selected.email || "—"}</div>
                <div className="flex items-center gap-2"><Phone className="size-3.5 text-slate-400" />{selected.phone || "—"}</div>
                <div className="text-slate-500">{new Date(selected.createdAt).toLocaleDateString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4 text-xs leading-7 whitespace-pre-wrap">{selected.message}</div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button onClick={() => updateStatus(selected.id, "read")} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-medium text-blue-700 hover:bg-blue-100"><Check className="size-3.5" /> خوانده شد</button>
                <button onClick={() => updateStatus(selected.id, "replied")} className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-[10px] font-medium text-green-700 hover:bg-green-100"><Reply className="size-3.5" /> پاسخ داده شد</button>
                <button onClick={async () => { if (!confirm("حذف شود؟")) return; await fetch(`/api/admin/contact-messages/${selected.id}`, { method: "DELETE" }); toast.success("حذف شد"); setSelected(null); load(); }} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-medium text-red-600 hover:bg-red-100"><Trash2 className="size-3.5" /> حذف</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Mail className="size-10 mb-3" />
              <p className="text-sm">یک پیام را برای مشاهده انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
