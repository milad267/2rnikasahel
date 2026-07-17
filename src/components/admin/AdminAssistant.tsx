"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Paperclip, ChevronLeft, FileText, Image as ImageIcon, Loader2, ThumbsUp, ThumbsDown, Package } from "lucide-react";
import { toast } from "sonner";

type Message = {
  role: "assistant" | "user";
  content: string;
  attachments?: Attachment[];
  products?: any[];
  messageId?: string;
};

type Attachment = { name: string; text: string; type: string; mimeType: string; size: number; storageId: string; url: string };

function fileSize(size: number) {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

const SUGGESTIONS = [
  "یک پست بلاگ درباره گرمایش از کف بنویس",
  "یک محصول لوله با برند وگا بساز",
  "یک اسلاید جدید برای اسلایدر بساز",
  "گزارش فروش بده",
];

export function AdminAssistant({ isAdmin = true }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "سلام مدیر عزیز! 👋 من دستیار عملیاتی پنل هستم. می‌توانم محصول بسازم، پست بلاگ بنویسم، اسلاید بسازم و گزارش فروش بدهم.\n\n📎 می‌توانید فایل (Excel, PDF, عکس) آپلود کنید تا خودکار تحلیل کنم." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // پاکسازی: کنسل کردن درخواست‌های در حال اجرا هنگام بسته شدن کامپوننت
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/chat")
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.messages) && data.messages.length > 0) setMessages(data.messages);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    if (loaded && messages.length > 1) {
      fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) }).catch(() => {});
    }
  }, [messages, loaded]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─── ارسال پیام متنی ─── */
  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const hasText = input.trim().length > 0;
    const hasPendingFiles = pendingFiles.length > 0;
    if ((!hasText && !hasPendingFiles) || loading) return;

    const userMsg = input.trim() || "این فایل را بررسی کن.";
    const sentFiles = pendingFiles;

    // نمایش پیام کاربر با فایل‌های attached
    const userMessage: Message = { role: "user", content: input.trim() || "📎 فایل آپلود شده", messageId: `usr-${Date.now()}` };
    if (hasPendingFiles) userMessage.attachments = sentFiles;
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setPendingFiles([]);
    setLoading(true);

    // جمع‌آوری محصولات استخراج‌شده از پیام‌های قبلی
    const lastProducts = [...messages].reverse().find(m => m.products?.length)?.products;

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          fileContent: hasPendingFiles ? sentFiles.map(f => f.text).join("\n\n") : undefined,
          fileProducts: lastProducts || undefined,
          attachments: sentFiles,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.ok ? data.response : `❌ ${data.error || "خطا در پاسخگویی"}`,
        messageId: `asst-${Date.now()}`,
        attachments: data.ok && Array.isArray(data.attachments) ? data.attachments : undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ خطا در ارتباط با سرور", messageId: `asst-${Date.now()}` }]);
    } finally {
      setLoading(false);
    }
  }

  /* ─── آپلود فایل — نمایش به عنوان پیام کاربر ─── */
  async function handleFileUpload(files: FileList) {
    setUploading(true);
    const newPending: typeof pendingFiles = [];

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/assistant/file", { method: "POST", body: fd });
        const data = await res.json();

        if (data.ok && data.text) {
          newPending.push({
            name: file.name, text: data.text, type: data.fileType || "file", mimeType: data.mimeType || file.type,
            size: data.size || file.size, storageId: data.storageId, url: data.url,
          });

          // نمایش نتیجه تحلیل به عنوان پیام دستیار
          if (data.products && data.products.length > 0) {
            const productList = data.products.slice(0, 10).map((p: any, i: number) => {
              const price = p.price ? ` — ${Number(p.price).toLocaleString("fa-IR")} ریال` : "";
              const brand = p.brand ? ` | 🏷 ${p.brand}` : "";
              const sku = p.sku ? ` | 🔢 ${p.sku}` : "";
              let line = `**${i + 1}. ${p.title}**${price}${brand}${sku}`;
              if (p.variants?.length > 0) {
                line += `\n   ↳ ${p.variants.length} تنوع`;
                for (const variant of p.variants.slice(0, 8)) {
                  line += `\n      • ${variant.name} | کد: ${variant.sku || "نامشخص"} | ${variant.price ? Number(variant.price).toLocaleString("fa-IR") + " ریال" : "قیمت نامشخص"}`;
                }
              }
              if (p.warnings?.length) line += `\n   ⚠️ ${p.warnings.join("؛ ")}`;
              return line;
            }).join("\n\n");

            setMessages(prev => [...prev, {
              role: "assistant",
              content: `📎 **${file.name}** تحلیل شد.\n📄 ${data.fileType === "excel" ? "Excel" : data.fileType === "pdf" ? "PDF" : data.fileType === "image" ? "تصویر" : "متن"} | ${data.text.length.toLocaleString("fa-IR")} کاراکتر\n\n✅ **${data.products.length} محصول تشخیص داده شد:**\n\n${productList}${data.extractionWarning ? `\n\n⚠️ ${data.extractionWarning}` : ""}\n\nابتدا نام، کد و قیمت‌ها را بررسی کنید. برای ساخت پیش‌نویس‌ها عبارت دقیق «تأیید نهایی» را ارسال کنید. موارد دارای قیمت یا کد نامشخص ساخته نمی‌شوند.`,
              products: data.products,
              messageId: `file-${Date.now()}`,
            }]);
            toast.success(`${data.products.length} محصول از ${file.name} تشخیص داده شد ✅`);
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `📎 **${file.name}** دریافت شد.\n📄 ${data.fileType === "excel" ? "Excel" : data.fileType === "pdf" ? "PDF" : data.fileType === "image" ? "تصویر (OCR شده)" : "متن"} | ${data.text.length.toLocaleString("fa-IR")} کاراکتر\n\nمتن فایل آماده بررسی است. سوالتان را بپرسید.`,
              messageId: `file-${Date.now()}`,
            }]);
            toast.success(`${file.name} آپلود و تحلیل شد`);
          }
        } else if (data.warning) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `⚠️ ${data.warning}`,
            messageId: `file-${Date.now()}`,
          }]);
          toast.warning(data.warning);
        } else {
          toast.error(data.error || `خطا در خواندن ${file.name}`);
        }
      } catch {
        toast.error(`خطا در خواندن ${file.name}`);
      }
    }

    setPendingFiles(newPending);
    setUploading(false);
    // اگه فایل آپلود شد و input خالیه، پیغام پیش‌فرض بذار
    if (newPending.length > 0 && !input.trim()) {
      setInput("این فایل را بررسی کن و محصولات را استخراج کن.");
    }
  }

  /* ─── بازخورد یادگیری ─── */
  async function rateMessage(msg: Message, rating: "good" | "bad") {
    try {
      const index = messages.indexOf(msg);
      const previousInput = [...messages.slice(0, index)].reverse().find(item => item.role === "user")?.content || "";
      if (!previousInput) return;
      await fetch("/api/admin/assistant/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `/rate ${rating} ${msg.messageId || ""}`, rateInput: previousInput, rateOutput: msg.content, rating }),
      });
      toast.success(rating === "good" ? "👍 بازخورد ثبت شد" : "👎 بازخورد ثبت شد");
    } catch { /* ignore */ }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-label={open ? "بستن دستیار عملیاتی" : "باز کردن دستیار عملیاتی"}
        className="fixed bottom-6 left-6 z-50 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl transition-all hover:scale-105 hover:shadow-purple-600/30"
        title="دستیار عملیاتی">
        <Sparkles className="size-5" strokeWidth={1.6} />
      </button>

      {open && (
        <div onWheel={(event) => event.stopPropagation()} className="fixed bottom-20 left-4 z-[60] flex h-[min(520px,calc(100dvh-6rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-6">
          {/* Header */}
          <div className="flex-shrink-0 rounded-t-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4" strokeWidth={1.5} />
                <div>
                  <h3 className="text-sm font-bold">دستیار عملیاتی</h3>
                  <p className="flex items-center gap-1 text-[10px] text-white/70">
                    <span className="size-1.5 rounded-full bg-green-400" /> {isAdmin ? "ادمین" : "عمومی"}
                  </p>
                </div>
              </div>
              <button type="button" aria-label="بستن دستیار" onClick={() => setOpen(false)} className="flex size-7 items-center justify-center rounded-full bg-white/15"><X className="size-4" strokeWidth={1.6} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overscroll-contain overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-6 ${
                  msg.role === "assistant" ? "bg-purple-50 text-purple-900" : "bg-slate-100 text-slate-800"
                }`}>
                  {msg.attachments?.map(file => (
                    <a key={file.storageId} href={file.url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl border border-black/5 bg-white/80">
                      {file.type === "image" ? <img src={file.url} alt={file.name} className="h-32 w-full object-cover" /> : null}
                      <span className="flex items-center gap-2 px-2.5 py-2 text-[10px] font-medium text-slate-600">
                        {file.type === "image" ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
                        <span className="min-w-0 flex-1 truncate">{file.name}</span><span className="opacity-60">{fileSize(file.size)}</span>
                      </span>
                    </a>
                  ))}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {/* دکمه‌های بازخورد */}
                  {msg.role === "assistant" && i > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <button type="button" onClick={() => rateMessage(msg, "good")}
                        className="flex size-6 items-center justify-center rounded-md bg-green-50 text-green-600 hover:bg-green-100" title="پاسخ مفید بود">
                        <ThumbsUp className="size-3" strokeWidth={1.8} />
                      </button>
                      <button type="button" onClick={() => rateMessage(msg, "bad")}
                        className="flex size-6 items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100" title="پاسخ مفید نبود">
                        <ThumbsDown className="size-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                  {/* محصولات استخراج‌شده */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 border-t border-purple-200 pt-2">
                      <div className="space-y-1.5">
                        {msg.products.slice(0, 8).map((p: any, pi: number) => (
                          <div key={pi} className="rounded-lg bg-purple-100 px-2 py-1.5 text-[9px] font-medium text-purple-900">
                            <span className="flex items-center gap-1"><Package className="size-2.5" strokeWidth={1.5} /> {p.title}</span>
                            <span className="mt-0.5 block text-purple-700/80">{p.variants?.length ? `${p.variants.length} تنوع` : `کد: ${p.sku || "نامشخص"} · قیمت: ${p.price ? Number(p.price).toLocaleString("fa-IR") : "نامشخص"}`}</span>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setInput("تأیید نهایی"); inputRef.current?.focus(); }}
                        className="mt-2 w-full rounded-lg bg-purple-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-purple-700">
                        آماده‌سازی تأیید نهایی
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-purple-50 px-4 py-3 text-xs text-purple-700 flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> در حال فکر کردن...
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="flex-shrink-0 px-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-[10px] font-medium text-purple-700 hover:bg-purple-100">{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSend} className="flex-shrink-0 border-t border-slate-100 p-3">
            {/* نمایش فایل‌های pending */}
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => (
                  <span key={f.storageId || i} className="inline-flex max-w-full items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-[10px] text-purple-700">
                    {f.type === "image" ? <ImageIcon className="size-3" /> : <Paperclip className="size-3" />} <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 text-purple-400 hover:text-purple-600">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <button type="button" aria-label="افزودن فایل" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="text-slate-500 hover:text-slate-600 disabled:opacity-40" title="آپلود فایل (PDF, Excel, عکس)">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" strokeWidth={1.5} />}
              </button>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={isAdmin ? "دستور خود را بنویسید یا فایل آپلود کنید..." : "سوال خود را بپرسید..."}
                className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-500"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
              <button type="submit" aria-label="ارسال پیام" disabled={(!input.trim() && pendingFiles.length === 0) || loading}
                className="flex size-7 items-center justify-center rounded-full bg-purple-600 text-white disabled:opacity-40">
                <ChevronLeft className="size-4" strokeWidth={2} />
              </button>
            </div>
            {/* فایل اینپوت باید آخرین المنت داخل form باشه تا onClick درست کار کنه */}
            <input
              ref={fileRef}
              type="file"
              multiple
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFileUpload(files);
                  // ریست value تا بشه دوباره همون فایل رو انتخاب کرد
                  e.target.value = "";
                }
              }}
            />
          </form>
        </div>
      )}
    </>
  );
}
