"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, ChevronLeft, Loader2, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

type Attachment = { name: string; text: string; type: string; mimeType: string; size: number; storageId: string; url: string };
type Message = { role: "assistant" | "user"; content: string; attachments?: Attachment[] };

function fileSize(size: number) {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

/** تولید UUID v4 بدون نیاز به secure context (کار روی HTTP معمولی) */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback با crypto.getRandomValues که در همه contextها کار می‌کنه
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  let uuid = "";
  for (let i = 0; i < 16; i++) {
    const hex = bytes[i].toString(16).padStart(2, "0");
    uuid += hex;
    if (i === 3 || i === 5 || i === 7 || i === 9) uuid += "-";
  }
  return uuid;
}

export function UserAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "سلام! 👋 من دستیار فروشگاه درنیکا ساحل هستم.\n\n✅ می‌توانم:\n• آزادانه درباره نیاز خریدتان گفتگو کنم\n• محصولات واقعی فروشگاه را جستجو و مقایسه کنم\n• عکس، فاکتور و فایل متنی را بررسی کنم\n• سفارش متعلق به حساب شما را پیگیری کنم\n\n📎 فایل متنی، PDF، Excel یا عکس تا ۵۰ مگابایت بفرستید." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef("");

  useEffect(() => {
    sessionId.current = generateUUID();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || loading) return;
    const visibleMessage = input.trim() || "این فایل را بررسی کن.";
    const sentAttachments = attachments;
    const fileContent = sentAttachments.map((file) => `محتوای فایل ${file.name}:\n${file.text}`).join("\n\n");
    setInput("");
    setAttachments([]);
    setMessages(prev => [...prev, { role: "user", content: visibleMessage, attachments: sentAttachments }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sessionId.current || generateUUID() },
        body: JSON.stringify({
          message: visibleMessage,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          fileContent: fileContent || undefined,
          attachments: sentAttachments,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.ok ? data.response : `❌ ${data.error || "خطا در پاسخگویی"}`,
        attachments: data.ok && Array.isArray(data.attachments) ? data.attachments : undefined,
      }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "❌ خطا در ارتباط با سرور" }]); }
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target?.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error(`${file.name}: حداکثر حجم مجاز ۵۰۰ مگابایت است.`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/assistant/file", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok && data.text) {
          setAttachments(prev => [...prev, {
            name: file.name, text: data.text, type: data.fileType || "file", mimeType: data.mimeType || file.type,
            size: data.size || file.size, storageId: data.storageId, url: data.url,
          }]);
          toast.success(`${file.name} آماده شد`);
        } else toast.error(data.error || `خطا در خواندن ${file.name}`);
      } catch { toast.error(`خطا در خواندن ${file.name}`); }
    }
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-label={open ? "بستن دستیار فروشگاه" : "باز کردن دستیار فروشگاه"}
        className="fixed bottom-20 left-6 z-50 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-petrol-600 to-petrol-500 text-white shadow-xl transition-all hover:scale-105 hover:shadow-petrol-600/30">
        <Sparkles className="size-5" strokeWidth={1.6} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onWheel={(event) => event.stopPropagation()}
            className="fixed bottom-36 left-4 z-[60] flex h-[min(460px,calc(100dvh-10rem))] w-[calc(100vw-2rem)] max-w-[340px] flex-col overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-6"
          >
          <div className="flex-shrink-0 rounded-t-2xl bg-gradient-to-r from-petrol-600 to-petrol-500 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4" strokeWidth={1.5} />
                <div>
                  <h3 className="text-sm font-bold">دستیار فروشگاه</h3>
                  <p className="text-[10px] text-white/70">پرسش‌های شما را پاسخ می‌دهد</p>
                </div>
              </div>
              <button type="button" aria-label="بستن دستیار" onClick={() => setOpen(false)} className="flex size-7 items-center justify-center rounded-full bg-white/15"><X className="size-4" /></button>
            </div>
          </div>

          <div className="flex-1 overscroll-contain overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-6 ${
                  msg.role === "assistant" ? "bg-petrol-50 text-petrol-900" : "bg-slate-100 text-slate-800"
                }`}>
                  {msg.attachments?.map(file => (
                    <a key={file.storageId} href={file.url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl border border-black/5 bg-white/80">
                      {file.type === "image" ? <img src={file.url} alt={file.name} className="h-28 w-full object-cover" /> : null}
                      <span className="flex items-center gap-2 px-2.5 py-2 text-[10px] font-medium">
                        {file.type === "image" ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
                        <span className="min-w-0 flex-1 truncate">{file.name}</span><span className="opacity-60">{fileSize(file.size)}</span>
                      </span>
                    </a>
                  ))}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="rounded-2xl bg-petrol-50 px-4 py-3 text-xs text-petrol-700 flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> در حال فکر کردن...</div></div>}
            <div ref={messagesEnd} />
          </div>

          <form onSubmit={handleSend} className="flex-shrink-0 border-t border-slate-100 p-3">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((file) => (
                  <button key={file.storageId} type="button" onClick={() => setAttachments(prev => prev.filter(item => item.storageId !== file.storageId))}
                    className="flex max-w-full items-center gap-1 rounded-full bg-petrol-50 px-2.5 py-1 text-[10px] text-petrol-700">
                    {file.type === "image" ? <ImageIcon className="size-3" /> : <Paperclip className="size-3" />} <span className="truncate">{file.name}</span> ×
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <button type="button" aria-label="افزودن فایل" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-40">
                <Paperclip className="size-4" strokeWidth={1.5} />
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="سوال خود را بپرسید..."
                className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400" />
              <button type="submit" aria-label="ارسال پیام" disabled={(!input.trim() && attachments.length === 0) || loading}
                className="flex size-7 items-center justify-center rounded-full bg-petrol-600 text-white disabled:opacity-40">
                <ChevronLeft className="size-4" strokeWidth={2} />
              </button>
            </div>
          </form>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
