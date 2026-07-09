"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { Table as TableExt } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle, FontFamily, FontSize, Color } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon,
  Minus, RemoveFormatting, Undo, Redo, AlignRight, AlignCenter, AlignLeft,
  Highlighter, Palette, Upload, Table as TableIcon, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { toast } from "sonner";

type Props = {
  content: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
};

// ۲۵ فونت فارسی و انگلیسی
const FONTS = [
  { name: "پیش‌فرض (Vazirmatn)", value: "Vazirmatn, sans-serif" },
  { name: "ایران سنس", value: "IRANSans, sans-serif" },
  { name: "یکان", value: "Yekan, sans-serif" },
  { name: "شبنم", value: "Shabnam, sans-serif" },
  { name: "ساحل", value: "Sahel, sans-serif" },
  { name: "وزیر", value: "Vazir, sans-serif" },
  { name: "گندم", value: "Gandom, sans-serif" },
  { name: "پرستو", value: "Parastoo, sans-serif" },
  { name: "تنها", value: "Tanha, sans-serif" },
  { name: "ثمین", value: "Samim, sans-serif" },
  { name: "کتایبه", value: "Katibeh, serif" },
  { name: "لاله زار", value: "Lalezar, sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Helvetica", value: "Helvetica, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { name: "Impact", value: "Impact, sans-serif" },
  { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { name: "Roboto", value: "Roboto, sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Lato", value: "Lato, sans-serif" },
];

const FONT_SIZES = [
  "۱۰", "۱۱", "۱۲", "۱۳", "۱۴", "۱۶", "۱۸", "۲۰", "۲۴", "۲۸", "۳۲", "۳۶", "۴۲", "۴۸", "۶۴",
];
// نگاشت اعداد فارسی به لاتین برای مقدار CSS
const faToEn = (s: string) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc",
  "#cf1322", "#d4380d", "#d46b08", "#d4a017", "#7cb305", "#389e0d",
  "#096dd9", "#1d39c4", "#531dab", "#eb2f96",
];

const HIGHLIGHT_COLORS = [
  "#ffd8bf", "#fffb8f", "#b7eb8f", "#91d5ff", "#d3adf7", "#ffadd2",
];

export function RichEditor({ content, onChange, minHeight = 150 }: Props) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [customFonts, setCustomFonts] = useState<{ name: string; value: string }[]>([]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { class: "text-petrol-600 underline" } },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      TableExt.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none outline-none text-xs leading-7",
        dir: "rtl",
      },
    },
  });

  // آپلود فونت سفارشی
  const handleFontUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFont(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["ttf", "woff", "woff2", "otf"].includes(ext || "")) {
        toast.error(`فرمت ${ext} پشتیبانی نمی‌شود (TTF, WOFF, WOFF2, OTF)`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "font");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        const fontName = file.name.replace(/\.[^.]+$/, "");
        const fontUrl = data.file.url;
        const styleId = `font-${fontName.replace(/\s+/g, "-")}`;

        // اضافه کردن فونت به DOM
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${fontName}';
            src: url('${fontUrl}') format('${ext === "ttf" ? "truetype" : ext === "otf" ? "opentype" : ext === "woff2" ? "woff2" : "woff"}');
            font-display: swap;
          }
        `;
        document.head.appendChild(style);

        setCustomFonts(prev => [...prev, { name: fontName, value: `'${fontName}', sans-serif` }]);
        toast.success(`✅ فونت ${fontName} آپلود شد`);
      } else {
        toast.error(data.error || "خطا در آپلود فونت");
      }
    }
    setUploadingFont(false);
  }, []);

  if (!editor) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;

  const allFonts = [...FONTS, ...customFonts];

  const ToolBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <button type="button" onClick={onClick} title={title}
      className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg text-xs transition-colors",
        active ? "bg-petrol-100 text-petrol-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      )}>
      {children}
    </button>
  );

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      setShowLinkInput(false);
      setLinkUrl("");
    } else {
      setShowLinkInput((s) => !s);
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "editor");
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          editor.chain().focus().setImage({ src: data.file.url }).run();
          toast.success("تصویر اضافه شد ✓");
        } else {
          toast.error(data.error || "خطا");
        }
      } catch {
        toast.error("خطا در آپلود");
      }
    };
    input.click();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar ردیف ۱: Formatting */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="بازگشت"><Undo className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="جلو"><Redo className="size-3.5" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="پررنگ (Ctrl+B)"><Bold className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="ایتالیک (Ctrl+I)"><Italic className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="زیرخط (Ctrl+U)"><UnderlineIcon className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="خط خورده"><Strikethrough className="size-3.5" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {/* خانواده فونت */}
        <div className="relative flex items-center">
          <Type className="pointer-events-none absolute right-2 size-3 text-slate-400" />
          <select
            onChange={e => {
              const val = e.target.value;
              if (val) editor.chain().focus().setFontFamily(val).run();
              else editor.chain().focus().unsetFontFamily().run();
            }}
            className="h-7 w-28 rounded-lg border border-slate-200 bg-white pr-6 pl-1 text-[10px] text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
            title="خانواده فونت"
          >
            <option value="">فونت</option>
            {allFonts.map(f => (<option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>))}
          </select>
        </div>
        {/* اندازه فونت */}
        <select
          onChange={e => {
            const val = e.target.value;
            if (val) editor.chain().focus().setFontSize(faToEn(val) + "px").run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          className="h-7 w-14 rounded-lg border border-slate-200 bg-white px-1 text-[10px] text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
          title="اندازه فونت"
        >
          <option value="">اندازه</option>
          {FONT_SIZES.map(s => (<option key={s} value={s}>{s}</option>))}
        </select>
        {/* آپلود فونت */}
        <label
          className={cn("flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700", uploadingFont && "animate-pulse")}
          title="آپلود فونت سفارشی (TTF/WOFF/OTF)"
        >
          <Upload className="size-3.5" />
          <input type="file" accept=".ttf,.woff,.woff2,.otf" multiple className="hidden" onChange={handleFontUpload} />
        </label>
      </div>

      {/* Toolbar ردیف ۲: Headings & Alignment */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="تیتر ۱"><Heading1 className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="تیتر ۲"><Heading2 className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="تیتر ۳"><Heading3 className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="تیتر ۴"><Heading4 className="size-3.5" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="راست‌چین"><AlignRight className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="وسط‌چین"><AlignCenter className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="چپ‌چین"><AlignLeft className="size-3.5" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="لیست"><List className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="لیست شماره‌دار"><ListOrdered className="size-3.5" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {/* رنگ متن */}
        <div className="relative">
          <ToolBtn onClick={() => { setShowColorPicker(s => !s); setShowHighlightPicker(false); }} active={showColorPicker} title="رنگ متن"><Palette className="size-3.5" /></ToolBtn>
          {showColorPicker && (
            <div className="absolute top-8 z-30 grid grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              {TEXT_COLORS.map(c => (
                <button key={c} type="button" title={c}
                  onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                  className="size-5 rounded-md border border-slate-200" style={{ backgroundColor: c }} />
              ))}
              <button type="button" title="حذف رنگ"
                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                className="col-span-8 mt-1 rounded-md bg-slate-100 py-1 text-[9px] text-slate-600 hover:bg-slate-200">حذف رنگ</button>
            </div>
          )}
        </div>
        {/* های‌لایت */}
        <div className="relative">
          <ToolBtn onClick={() => { setShowHighlightPicker(s => !s); setShowColorPicker(false); }} active={showHighlightPicker} title="های‌لایت"><Highlighter className="size-3.5" /></ToolBtn>
          {showHighlightPicker && (
            <div className="absolute top-8 z-30 grid grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c} type="button" title={c}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlightPicker(false); }}
                  className="size-5 rounded-md border border-slate-200" style={{ backgroundColor: c }} />
              ))}
              <button type="button" title="حذف های‌لایت"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
                className="col-span-6 mt-1 rounded-md bg-slate-100 py-1 text-[9px] text-slate-600 hover:bg-slate-200">حذف های‌لایت</button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar ردیف ۳: Insert & Actions */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="نقل قول"><Quote className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="کد"><Code className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={addLink} active={editor.isActive("link")} title="لینک"><LinkIcon className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={addImage} title="تصویر"><ImageIcon className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={addTable} title="جدول"><TableIcon className="size-3.5" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="خط جداکننده"><Minus className="size-3.5" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="حذف فرمت"><RemoveFormatting className="size-3.5" /></ToolBtn>
      </div>

      {/* لینک اینپوت */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." dir="ltr"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-petrol-400" autoFocus />
          <button type="button" onClick={addLink} className="rounded-lg bg-petrol-600 px-3 py-1.5 text-[10px] font-semibold text-white">اعمال</button>
          <button type="button" onClick={() => { if (editor.isActive("link")) editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }} className="text-[10px] text-slate-500 hover:text-red-500">حذف</button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor}
        className={cn("px-4 py-3 cursor-text")}
        style={{ minHeight }}
      />
    </div>
  );
}
