"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, Loader2, Wand2, Sparkles, Crop, ZoomIn, ZoomOut, RotateCw, FlipHorizontal, Sun, Contrast, PaintBucket, Undo2, Redo2, Palette, Droplets, Focus, ImagePlus, Send, History, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  value?: string | string[];
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  maxSize?: number;
  accept?: string;
  category?: string;
  sizeHint?: string;
};

interface EditState {
  zoom: number;
  rotation: number;
  flipH: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  blur: number;
  hueRotate: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; url: string; storageId: string; type: string }[];
}

const DEFAULT_STATE: EditState = {
  zoom: 1, rotation: 0, flipH: false,
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, blur: 0, hueRotate: 0,
};

// فرمت‌های پیش‌فرض تصویر
const DEFAULT_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,image/svg+xml";

export function ImageUpload({ value, onChange, multiple = false, maxSize = 0, accept = DEFAULT_IMAGE_ACCEPT, category = "product", sizeHint }: Props) {
  const [uploading, setUploading] = useState(false);
  const [editor, setEditor] = useState<{ url: string; index: number } | null>(null);
  const [editorPrompt, setEditorPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [imgScale, setImgScale] = useState({ x: 1, y: 1 }); // natural -> display scale

  function setZoom(fn: (z: number) => number) {
    updateEditor({ zoom: fn(st.zoom) });
  }

  const [history, setHistory] = useState<EditState[]>([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentState = history[historyIndex] || DEFAULT_STATE;

  // قفل اسکرول بدنه وقتی ویرایشگر باز است
  useEffect(() => {
    const isOpen = editor !== null;
    if (isOpen) {
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
  }, [editor]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  function updateEditor(partial: Partial<EditState>) {
    const newState = { ...currentState, ...partial };
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  }

  function undo() { if (historyIndex > 0) setHistoryIndex(prev => prev - 1); }
  function redo() { if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1); }

  const st = currentState;

  // Update scale when image loads or zoom changes
  useEffect(() => {
    if (imgRef.current && imgNatural.w > 0) {
      const rect = imgRef.current.getBoundingClientRect();
      setImgScale({
        x: imgNatural.w / rect.width,
        y: imgNatural.h / rect.height,
      });
    }
  }, [st.zoom, imgNatural, editor]);

  async function handleUpload(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      // maxSize=0 means no limit
      if (maxSize > 0 && file.size > maxSize * 1024 * 1024) {
        toast.error(`حجم ${file.name} بیش از ${maxSize} مگابایت است`);
        continue;
      }
      const fd = new FormData(); 
      fd.append("file", file); 
      fd.append("category", category);
      
      try {
        const res = await fetch("/api/admin/upload", { 
          method: "POST", 
          body: fd, 
          credentials: "include" 
        });
        
        // بررسی status code
        
        if (res.status === 401) {
          toast.error("لطفاً وارد شوید");
          continue;
        }
        if (res.status === 403) {
          toast.error("دسترسی غیرمجاز");
          continue;
        }
        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Upload failed:", res.status, errorText);
          toast.error(`خطای سرور: ${res.status}`);
          continue;
        }
        
        const data = await res.json();
        
        if (data.ok) {
          const url = data.file?.url || data.url || "";
          urls.push(url);
        } else {
          console.error("❌ API returned error:", data.error);
          toast.error(data.error || "خطا در آپلود");
        }
      } catch (err) {
        console.error("❌ Upload error:", err);
        toast.error(`خطا در آپلود ${file.name}`);
      }
    }
    
    if (urls.length > 0) {
      if (multiple) {
        const newUrls = [...(Array.isArray(value) ? value : []), ...urls];
        onChange(newUrls);
      } else if (urls[0]) {
        onChange(urls[0]);
      }
      toast.success(`${urls.length} فایل آپلود شد ✓`);
    }
    
    setUploading(false);
  }

  // ─── Selection with correct coordinates ───
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const imgRect = imgRef.current.getBoundingClientRect();
    
    // Calculate position relative to the image, accounting for zoom/transform
    const offsetX = (e.clientX - imgRect.left);
    const offsetY = (e.clientY - imgRect.top);
    
    // Convert to natural image coordinates
    const scaleX = imgRef.current.naturalWidth / imgRect.width;
    const scaleY = imgRef.current.naturalHeight / imgRect.height;
    
    const x = Math.max(0, Math.min(imgRef.current.naturalWidth, offsetX * scaleX));
    const y = Math.max(0, Math.min(imgRef.current.naturalHeight, offsetY * scaleY));
    
    setIsSelecting(true);
    setSelStart({ x, y });
    setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selStart || !imgRef.current) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / imgRect.width;
    const scaleY = imgRef.current.naturalHeight / imgRect.height;
    
    const offsetX = (e.clientX - imgRect.left) * scaleX;
    const offsetY = (e.clientY - imgRect.top) * scaleY;
    
    const x = Math.max(0, Math.min(imgRef.current.naturalWidth, offsetX));
    const y = Math.max(0, Math.min(imgRef.current.naturalHeight, offsetY));
    
    setSelection({
      x: Math.min(selStart.x, x),
      y: Math.min(selStart.y, y),
      w: Math.abs(x - selStart.x),
      h: Math.abs(y - selStart.y),
    });
  };

  const handleMouseUp = () => setIsSelecting(false);

  // ─── Convert selection to display coordinates for overlay ───
  const selectionDisplay = selection && selection.w > 2 && imgRef.current
    ? {
        left: selection.x / imgScale.x,
        top: selection.y / imgScale.y,
        width: selection.w / imgScale.x,
        height: selection.h / imgScale.y,
      }
    : null;

  async function sendChatMessage(userMsg?: string) {
    const msg = (userMsg || editorPrompt).trim();
    if (!msg || !editor) return;

    const userMessage: ChatMessage = { role: "user", content: msg };
    setChatMessages(prev => [...prev, userMessage]);
    setEditorPrompt("");
    setAiLoading(true);

    try {
      const cmd = msg.toLowerCase();

      // ─── Remove Background ───
      if (cmd.includes("حذف پس‌زمینه") || cmd.includes("background") || cmd.includes("remove")) {
        try {
          const res = await fetch("/api/admin/remove-bg", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: editor.url, method: "auto" }),
          });
          const data = await res.json();
          if (data.ok && data.file?.url) {
            const newUrl = data.file.url;
            // Update the image URL in parent
            if (multiple) {
              const arr = Array.isArray(value) ? value : [];
              onChange(arr.map((u, idx) => idx === editor.index ? newUrl : u));
            } else {
              onChange(newUrl);
            }
            // Update editor URL to new one and keep editor open
            setEditor(prev => prev ? { ...prev, url: newUrl } : null);
            setChatMessages(prev => [...prev, { role: "assistant", content: "✅ پس‌زمینه با موفقیت حذف شد!" }]);
          } else {
            setChatMessages(prev => [...prev, { role: "assistant", content: `❌ ${data.error || "خطا در حذف پس‌زمینه"}` }]);
          }
        } catch (e: any) {
          setChatMessages(prev => [...prev, { role: "assistant", content: `❌ خطا: ${e.message}` }]);
        }
        setAiLoading(false);
        return;
      }

      if (cmd.includes("روشن") || cmd.includes("bright")) {
        updateEditor({ brightness: 130 });
        setChatMessages(prev => [...prev, { role: "assistant", content: "☀️ روشنایی به ۱۳۰% تنظیم شد" }]);
      } else if (cmd.includes("کنتراست") || cmd.includes("contrast")) {
        updateEditor({ contrast: 130 });
        setChatMessages(prev => [...prev, { role: "assistant", content: "🎨 کنتراست به ۱۳۰% تنظیم شد" }]);
      } else if (cmd.includes("سیاه سفید") || cmd.includes("grayscale") || cmd.includes("خاکستری")) {
        updateEditor({ saturation: 0, grayscale: 100 });
        setChatMessages(prev => [...prev, { role: "assistant", content: "⚫ تصویر به سیاه و سفید تبدیل شد" }]);
      } else if (cmd.includes("محو") || cmd.includes("blur")) {
        updateEditor({ blur: 3 });
        setChatMessages(prev => [...prev, { role: "assistant", content: "🌫️ افکت محو (blur) اعمال شد" }]);
      } else if (cmd.includes("چرخش") || cmd.includes("rotate")) {
        updateEditor({ rotation: (st.rotation + 90) % 360 });
        setChatMessages(prev => [...prev, { role: "assistant", content: `🔄 تصویر ${(st.rotation + 90) % 360}° چرخید` }]);
      } else if (cmd.includes("برعکس") || cmd.includes("flip") || cmd.includes("آینه")) {
        updateEditor({ flipH: !st.flipH });
        setChatMessages(prev => [...prev, { role: "assistant", content: `🪞 ${!st.flipH ? "برعکس" : "به حالت اول"}` }]);
      } else if (cmd.includes("بازگشت") || cmd.includes("undo")) {
        undo();
        setChatMessages(prev => [...prev, { role: "assistant", content: "↩️ آخرین تغییر لغو شد" }]);
      } else if (cmd.includes("ریست") || cmd.includes("reset")) {
        setHistory([DEFAULT_STATE]); setHistoryIndex(0);
        setChatMessages(prev => [...prev, { role: "assistant", content: "🔄 همه تغییرات به حالت اولیه برگشت" }]);
      } else if (cmd.includes("اشباع") || cmd.includes("saturat")) {
        updateEditor({ saturation: 150 });
        setChatMessages(prev => [...prev, { role: "assistant", content: "🎨 اشباع رنگ افزایش یافت" }]);
      } else if (cmd.includes("واضح") || cmd.includes("sharp")) {
        updateEditor({ blur: 0, contrast: 120 });
        setChatMessages(prev => [...prev, { role: "assistant", content: "🔍 تصویر واضح‌تر شد" }]);
      } else {
        let attachments: any[] = [];
        try {
          const sourceResponse = await fetch(editor.url);
          const sourceBlob = await sourceResponse.blob();
          const form = new FormData();
          form.append("file", new File([sourceBlob], `editor-${Date.now()}.${sourceBlob.type.split("/")[1] || "png"}`, { type: sourceBlob.type || "image/png" }));
          form.append("purpose", "image-edit");
          const uploadResponse = await fetch("/api/assistant/file", { method: "POST", body: form });
          const uploaded = await uploadResponse.json();
          if (uploaded.ok) attachments = [{ name: uploaded.fileName, url: uploaded.url, storageId: uploaded.storageId, type: "image", mimeType: uploaded.mimeType, size: uploaded.size }];
        } catch { /* پاسخ متنی همچنان قابل دریافت است. */ }
        const response = await fetch("/api/admin/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `در نقش دستیار ویرایش تصویر آزادانه به این پیام پاسخ بده: ${msg}\nتنظیمات فعلی: روشنایی ${st.brightness}، کنتراست ${st.contrast}، اشباع ${st.saturation}، چرخش ${st.rotation}. اگر درخواست قابل اجرا با ابزارهای فعلی نیست، صادقانه راهنمایی کن.`,
            history: chatMessages.slice(-8),
            attachments,
          }),
        });
        const data = await response.json();
        if (data.ok && data.attachments?.[0]?.url) {
          const newUrl = data.attachments[0].url;
          if (multiple) {
            const arr = Array.isArray(value) ? value : [];
            onChange(arr.map((url, index) => index === editor.index ? newUrl : url));
          } else onChange(newUrl);
          setEditor(previous => previous ? { ...previous, url: newUrl } : null);
        }
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.ok ? data.response : `❌ ${data.error || "پاسخی دریافت نشد"}`,
          attachments: data.ok && Array.isArray(data.attachments) ? data.attachments : undefined,
        }]);
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: "assistant", content: `❌ خطا: ${e.message}` }]);
    }
    setAiLoading(false);
    setTimeout(() => chatInputRef.current?.focus(), 100);
  }

  const images = multiple ? (Array.isArray(value) ? value : []) : (typeof value === "string" && value ? [value] : []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={i} className="group relative size-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {url.match(/\.(mp4|webm|mov)$/i) || url.includes("video") ? (
              <video src={url} className="size-full object-cover" />
            ) : (
              <img 
                src={url} 
                alt="" 
                className="size-full object-cover" 
                loading="lazy"
                onError={(e) => {
                  console.error("Image load failed:", url);
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <button type="button" onClick={() => {
              setEditor({ url, index: i });
              setSelection(null);
              setHistory([DEFAULT_STATE]);
              setHistoryIndex(0);
              setChatMessages([]);
            }} className="absolute bottom-0 right-0 flex items-center gap-1.5 rounded-tl-xl bg-purple-600 px-2 py-1 text-[9px] font-bold text-white hover:bg-purple-500">
              <Wand2 className="size-3" /> AI
            </button>
            <button type="button" onClick={() => {
              if (multiple) onChange((value as string[]).filter((_, j) => j !== i));
              else onChange("");
            }} className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white">
              <X className="size-3" />
            </button>
          </div>
        ))}

        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-500 transition-colors hover:border-petrol-400 hover:text-petrol-600"
          style={{ width: images.length > 0 ? 80 : "100%", height: images.length > 0 ? 80 : 80 }}>
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <><Upload className="size-5" /><span className="text-[10px]">آپلود</span></>}
          <input type="file" accept={accept} multiple={multiple} className="hidden"
            onChange={e => {
              if (e.target.files) {
                handleUpload(e.target.files);
              }
            }} disabled={uploading} />
        </label>
      </div>
      {sizeHint && <p className="text-[10px] text-slate-500">{sizeHint}</p>}

      {/* ─── Image/Video Editor ─── */}
      {editor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
          <div className="w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Wand2 className="size-4 text-purple-600" /> {editor.url.match(/\.(mp4|webm|mov)$/i) ? "🎬 ویرایشگر ویدیو" : "🖼️ ویرایشگر تصویر"}
                <span className="text-[10px] font-normal text-slate-400">({historyIndex+1}/{history.length})</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button onClick={undo} disabled={historyIndex <= 0} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Undo">
                  <Undo2 className="size-4" />
                </button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Redo">
                  <Redo2 className="size-4" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="زوم +"><ZoomIn className="size-4" /></button>
                <span className="text-[10px] text-slate-400 w-10 text-center font-mono">{Math.round(st.zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="زوم -"><ZoomOut className="size-4" /></button>
                <button onClick={() => setEditor(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 ml-1"><X className="size-4" /></button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Image Display */}
              <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-100 flex items-center justify-center min-h-[300px]">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img ref={imgRef}
                    src={editor.url} alt=""
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    style={{
                      transform: `scale(${st.zoom}) rotate(${st.rotation}deg) scaleX(${st.flipH ? -1 : 1})`,
                      filter: `brightness(${st.brightness}%) contrast(${st.contrast}%) saturate(${st.saturation}%) grayscale(${st.grayscale}%) blur(${st.blur}px)`,
                    }}
                    className="max-w-full max-h-[55vh] object-contain cursor-crosshair select-none"
                    draggable={false}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                  {/* Selection overlay - uses display coordinates */}
                  {selection && selectionDisplay && selectionDisplay.width > 2 && (
                    <SelOverlay selection={selection} display={selectionDisplay} />
                  )}
                </div>
              </div>

              {/* Right Panel */}
              <div className="lg:w-80 border-t lg:border-t-0 lg:border-r border-slate-200 flex flex-col">
                {/* Tools */}
                <div className="p-3 border-b border-slate-100">
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { icon: Crop, label: "برش", action: () => selection && selection.w > 5 ? toast.success(`🎯 محدوده ${Math.round(selection.w)}×${Math.round(selection.h)} انتخاب شد`) : toast.error("ابتدا محدوده را انتخاب کنید"), color: "purple" },
                      { icon: RotateCw, label: "چرخش", action: () => updateEditor({ rotation: (st.rotation + 90) % 360 }), color: "blue" },
                      { icon: FlipHorizontal, label: "آینه", action: () => updateEditor({ flipH: !st.flipH }), color: "green" },
                      { icon: Sun, label: "روشن", action: () => updateEditor({ brightness: Math.min(200, st.brightness + 20) }), color: "amber" },
                      { icon: Contrast, label: "کنتراست", action: () => updateEditor({ contrast: Math.min(200, st.contrast + 20) }), color: "purple" },
                      { icon: Droplets, label: "اشباع", action: () => updateEditor({ saturation: Math.min(200, st.saturation + 30) }), color: "pink" },
                      { icon: PaintBucket, label: "سفید/سیاه", action: () => updateEditor({ saturation: st.saturation > 0 ? 0 : 100, grayscale: st.grayscale > 0 ? 0 : 100 }), color: "slate" },
                      { icon: Focus, label: "محو", action: () => updateEditor({ blur: st.blur > 0 ? 0 : 3 }), color: "indigo" },
                      { icon: ImagePlus, label: "واضح", action: () => updateEditor({ blur: 0, contrast: 120 }), color: "emerald" },
                      { icon: History, label: "ریست", action: () => { setHistory([DEFAULT_STATE]); setHistoryIndex(0); }, color: "red" },
                    ].map((tool, i) => {
                      const Icon = tool.icon;
                      return (
                        <button key={i} type="button" onClick={tool.action}
                          className="flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition-all text-center border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          title={tool.label}>
                          <Icon className="size-3.5" strokeWidth={1.5} />
                          <span className="text-[7px]">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 space-y-1">
                    {[
                      { label: "☀️ روشنایی", value: st.brightness, set: (v: number) => updateEditor({ brightness: v }), min: 0, max: 200 },
                      { label: "🎨 کنتراست", value: st.contrast, set: (v: number) => updateEditor({ contrast: v }), min: 0, max: 200 },
                      { label: "💧 اشباع", value: st.saturation, set: (v: number) => updateEditor({ saturation: v }), min: 0, max: 200 },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="text-[8px] text-slate-500 w-14">{s.label}</span>
                        <input type="range" min={s.min} max={s.max} value={s.value}
                          onChange={e => s.set(Number(e.target.value))} className="flex-1 h-1 accent-purple-600" />
                        <span className="text-[8px] text-slate-400 w-7 text-left font-mono">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="px-3 py-2 border-b border-slate-100 text-[9px] text-slate-500 flex items-center gap-3">
                  <span>📐 {imgNatural.w}×{imgNatural.h}</span>
                  {selection && selection.w > 5 && <SelectionLabel selection={selection} />}
                </div>

                {/* Chat */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-slate-400">
                        <MessageSquare className="size-6 mx-auto mb-2 opacity-40" strokeWidth={1.2} />
                        با دستیار صحبت کنید تا تصویر را ویرایش کند
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn("rounded-xl px-3 py-2 text-[10px] leading-5 max-w-[90%]", m.role === "user" ? "bg-purple-100 text-purple-900" : "bg-slate-100 text-slate-700")}>
                          {m.attachments?.map(file => <img key={file.storageId} src={file.url} alt={file.name} className="mb-2 h-28 w-full rounded-lg object-contain bg-white" />)}
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                          <Loader2 className="size-3 animate-spin" /> در حال پردازش...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <div className="flex gap-1.5">
                      <input ref={chatInputRef} type="text" value={editorPrompt}
                        onChange={e => setEditorPrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") sendChatMessage(); }}
                        placeholder="به دستیار بگویید چه کند..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-purple-500"
                      />
                      <button onClick={() => sendChatMessage()} disabled={aiLoading || !editorPrompt.trim()}
                        className="flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-purple-500 shrink-0">
                        {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["حذف پس‌زمینه", "روشن‌تر", "کنتراست بیشتر", "سیاه سفید", "محو کن", "بازگشت Undo"].map(cmd => (
                        <button key={cmd} type="button" onClick={() => sendChatMessage(cmd)}
                          className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[8px] font-medium text-purple-600 hover:bg-purple-100 transition-colors">
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionLabel({ selection }: { selection: { x: number; y: number; w: number; h: number } }) {
  return <span className="text-purple-600">📍 {Math.round(selection.w)}×{Math.round(selection.h)}</span>;
}

function SelOverlay({ selection, display }: { selection: { x: number; y: number; w: number; h: number }; display: { left: number; top: number; width: number; height: number } }) {
  return (
    <div className="absolute border-2 border-purple-500 bg-purple-500/10 pointer-events-none"
      style={{ left: display.left, top: display.top, width: display.width, height: display.height }}>
      <span className="absolute -top-4 left-0 text-[9px] text-purple-600 font-bold whitespace-nowrap">
        {Math.round(selection.w)}×{Math.round(selection.h)}
      </span>
    </div>
  );
}
