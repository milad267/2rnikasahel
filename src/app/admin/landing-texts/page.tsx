"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Type, RotateCcw, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * ویرایشگر متن‌های صفحه اصلی.
 * هر فیلد یک path در دیکشنری i18n است که به‌صورت `landing.<path>` در گروه
 * "landing" ذخیره می‌شود و روی متن‌های پیش‌فرض اعمال می‌گردد.
 */

type Field = { path: string; label: string; area?: boolean; placeholder?: string };
type Section = { title: string; fields: Field[] };

const SECTIONS: Section[] = [
  {
    title: "برند",
    fields: [
      { path: "brand.name", label: "نام برند" },
      { path: "brand.tagline", label: "شعار برند" },
    ],
  },
  {
    title: "منوی ناوبری",
    fields: [
      { path: "nav.home", label: "خانه" },
      { path: "nav.shop", label: "فروشگاه" },
      { path: "nav.categories", label: "دسته‌بندی‌ها" },
      { path: "nav.finder", label: "راهنمای انتخاب" },
      { path: "nav.quote", label: "استعلام قیمت" },
      { path: "nav.contractors", label: "پنل پیمانکاران" },
      { path: "nav.blog", label: "بلاگ" },
      { path: "nav.about", label: "درباره ما" },
      { path: "nav.contact", label: "تماس با ما" },
      { path: "nav.search", label: "متن جستجو" },
    ],
  },
  {
    title: "بخش قهرمان (Hero)",
    fields: [
      { path: "hero.badge", label: "برچسب بالای عنوان" },
      { path: "hero.title", label: "عنوان اصلی" },
      { path: "hero.subtitle", label: "زیرعنوان", area: true },
      { path: "hero.ctaPrimary", label: "دکمه اصلی" },
      { path: "hero.ctaSecondary", label: "دکمه دوم" },
    ],
  },
  {
    title: "باکس اعتماد (Trust Box)",
    fields: [
      { path: "trust.icon1", label: "باکس ۱ — آیکون" },
      { path: "trust.title1", label: "باکس ۱ — عنوان" },
      { path: "trust.desc1", label: "باکس ۱ — توضیح" },
      { path: "trust.icon2", label: "باکس ۲ — آیکون" },
      { path: "trust.title2", label: "باکس ۲ — عنوان" },
      { path: "trust.desc2", label: "باکس ۲ — توضیح" },
      { path: "trust.icon3", label: "باکس ۳ — آیکون" },
      { path: "trust.title3", label: "باکس ۳ — عنوان" },
      { path: "trust.desc3", label: "باکس ۳ — توضیح" },
      { path: "trust.icon4", label: "باکس ۴ — آیکون" },
      { path: "trust.title4", label: "باکس ۴ — عنوان" },
      { path: "trust.desc4", label: "باکس ۴ — توضیح" },
    ],
  },
  {
    title: "آمار",
    fields: [
      { path: "stats.products", label: "برچسب محصولات" },
      { path: "stats.brands", label: "برچسب برندها" },
      { path: "stats.contractors", label: "برچسب پیمانکاران" },
      { path: "stats.support", label: "برچسب پشتیبانی" },
    ],
  },
  {
    title: "بخش درباره ما (آیکون‌ها)",
    fields: [
      { path: "about.icon1", label: "ویژگی ۱ — آیکون" },
      { path: "about.title1", label: "ویژگی ۱ — عنوان" },
      { path: "about.desc1", label: "ویژگی ۱ — توضیح" },
      { path: "about.icon2", label: "ویژگی ۲ — آیکون" },
      { path: "about.title2", label: "ویژگی ۲ — عنوان" },
      { path: "about.desc2", label: "ویژگی ۲ — توضیح" },
      { path: "about.icon3", label: "ویژگی ۳ — آیکون" },
      { path: "about.title3", label: "ویژگی ۳ — عنوان" },
      { path: "about.desc3", label: "ویژگی ۳ — توضیح" },
      { path: "about.icon4", label: "ویژگی ۴ — آیکون" },
      { path: "about.title4", label: "ویژگی ۴ — عنوان" },
      { path: "about.desc4", label: "ویژگی ۴ — توضیح" },
    ],
  },
  {
    title: "بخش ویژگی‌ها",
    fields: [
      { path: "features.title", label: "عنوان بخش" },
      { path: "features.subtitle", label: "زیرعنوان بخش" },
      { path: "features.items.variants.icon", label: "ویژگی ۱ — آیکون" },
      { path: "features.items.variants.title", label: "ویژگی ۱ — عنوان" },
      { path: "features.items.variants.desc", label: "ویژگی ۱ — توضیح", area: true },
      { path: "features.items.ai.icon", label: "ویژگی ۲ — آیکون" },
      { path: "features.items.ai.title", label: "ویژگی ۲ — عنوان" },
      { path: "features.items.ai.desc", label: "ویژگی ۲ — توضیح", area: true },
      { path: "features.items.b2b.icon", label: "ویژگی ۳ — آیکون" },
      { path: "features.items.b2b.title", label: "ویژگی ۳ — عنوان" },
      { path: "features.items.b2b.desc", label: "ویژگی ۳ — توضیح", area: true },
      { path: "features.items.secure.icon", label: "ویژگی ۴ — آیکون" },
      { path: "features.items.secure.title", label: "ویژگی ۴ — عنوان" },
      { path: "features.items.secure.desc", label: "ویژگی ۴ — توضیح", area: true },
    ],
  },
  {
    title: "فوتر",
    fields: [
      { path: "footer.rights", label: "متن حقوق" },
      { path: "footer.explore", label: "عنوان ستون کاوش" },
      { path: "footer.support", label: "عنوان ستون پشتیبانی" },
      { path: "footer.legal", label: "عنوان ستون قوانین" },
      { path: "footer.social", label: "عنوان شبکه‌های اجتماعی" },
      { path: "footer.enamad", label: "متن نماد اعتماد" },
      { path: "footer.enamadNote", label: "توضیح نماد اعتماد" },
    ],
  },
  {
    title: "کارت‌های شناور (Floating Cards)",
    fields: [
      { path: "hero.card1.icon", label: "کارت ۱ — آیکون (مثال: Boxes)" },
      { path: "hero.card1.title", label: "کارت ۱ — عنوان" },
      { path: "hero.card1.value", label: "کارت ۱ — مقدار" },
      { path: "hero.card2.icon", label: "کارت ۲ — آیکون (مثال: Cpu)" },
      { path: "hero.card2.title", label: "کارت ۲ — عنوان" },
      { path: "hero.card2.value", label: "کارت ۲ — مقدار" },
      { path: "hero.card3.icon", label: "کارت ۳ — آیکون (مثال: Layers)" },
      { path: "hero.card3.title", label: "کارت ۳ — عنوان" },
      { path: "hero.card3.value", label: "کارت ۳ — مقدار" },
    ],
  },
];

const ALL_PATHS = SECTIONS.flatMap(s => s.fields.map(f => f.path));

export default function LandingTextsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then(r => r.json()),
      fetch("/api/admin/landing-texts").then(r => r.json()),
    ]).then(([settings, def]) => {
      const map: Record<string, string> = {};
      if (settings.ok) {
        settings.data
          .filter((s: { group: string; key: string }) => s.group === "landing" && s.key.startsWith("landing."))
          .forEach((s: { key: string; value: string }) => {
            map[s.key.replace(/^landing\./, "")] = typeof s.value === "string" ? s.value : String(s.value ?? "");
          });
      }
      if (def.ok) setDefaults(def.data);
      setValues(map);
    }).finally(() => setLoading(false));
  }, []);

  function get(path: string): string {
    const saved = values[path];
    return typeof saved === "string" && saved.trim() ? saved : defaults[path] ?? "";
  }

  function set(path: string, v: string) {
    setValues(prev => ({ ...prev, [path]: v }));
  }

  function resetField(path: string) {
    setValues(prev => ({ ...prev, [path]: defaults[path] ?? "" }));
  }

  async function saveAll() {
    setSaving(true);
    let errors = 0;
    for (const path of ALL_PATHS) {
      const value = get(path);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `landing.${path}`, value, group: "landing" }),
      });
      const data = await res.json();
      if (!data.ok) errors++;
    }
    if (errors === 0) toast.success("✅ متن‌های صفحه اصلی ذخیره شد");
    else toast.error(`⚠️ ${errors} خطا در ذخیره`);
    setSaving(false);
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Type className="size-6 text-purple-600" strokeWidth={1.6} />
            متن‌های صفحه اصلی
          </h1>
          <p className="mt-1 text-sm text-slate-500">هر متن صفحه فرست را جداگانه ویرایش کنید</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
        >
          <Save className="size-4" /> {saving ? "در حال ذخیره..." : "ذخیره همه متن‌ها"}
        </button>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">{section.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map(field => {
              const overridden = values[field.path] !== undefined && values[field.path] !== (defaults[field.path] ?? "");
              const isIcon = field.path.includes(".icon");
              const currentValue = get(field.path);
              const isImageUrl = currentValue.startsWith("/uploads/") || currentValue.startsWith("http");

              return (
                <div key={field.path} className={field.area ? "sm:col-span-2" : ""}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {field.label}
                      {overridden && <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">ویرایش شده</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => resetField(field.path)}
                      title="بازگردانی به پیش‌فرض"
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      <RotateCcw className="size-3" /> پیش‌فرض
                    </button>
                  </div>

                  {isIcon ? (
                    <div className="flex items-center gap-2">
                      {/* پیش‌نمایش آیکون */}
                      {currentValue && (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                          {isImageUrl ? (
                            <img src={currentValue} alt="" className="size-6 object-contain" />
                          ) : (
                            <span className="text-[18px] font-bold text-purple-600">
                              {currentValue.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                      <input
                        value={currentValue}
                        onChange={e => set(field.path, e.target.value)}
                        placeholder="Lucide icon name یا آدرس تصویر"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400 font-mono"
                      />
                      <IconUploadButton
                        currentValue={currentValue}
                        onUpload={(url) => set(field.path, url)}
                      />
                    </div>
                  ) : field.area ? (
                    <textarea
                      value={currentValue}
                      onChange={e => set(field.path, e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs leading-6 outline-none focus:border-purple-400"
                    />
                  ) : (
                    <input
                      value={currentValue}
                      onChange={e => set(field.path, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── کامپوننت دکمه آپلود آیکون ───
function IconUploadButton({ currentValue, onUpload }: { currentValue: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "icon");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.file?.url) {
        onUpload(data.file.url);
        toast.success("✅ آیکون آپلود شد");
      } else {
        toast.error(data.error || "خطا در آپلود");
      }
    } catch {
      toast.error("خطا در آپلود تصویر");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleUpload} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title={uploading ? "در حال آپلود..." : "آپلود تصویر آیکون"}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-xl border px-3 py-2.5 text-[10px] font-medium transition-colors",
          uploading
            ? "border-purple-200 bg-purple-50 text-purple-500"
            : currentValue.startsWith("/uploads/") || currentValue.startsWith("http")
              ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              : "border-slate-200 bg-white text-slate-500 hover:border-purple-300 hover:text-purple-600"
        )}
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ImageIcon className="size-3.5" strokeWidth={1.6} />
        )}
        {uploading ? "..." : "آپلود"}
      </button>
      {(currentValue.startsWith("/uploads/") || currentValue.startsWith("http")) && (
        <button
          type="button"
          onClick={() => onUpload("")}
          title="حذف تصویر"
          className="flex shrink-0 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2.5 text-[10px] text-red-600 hover:bg-red-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </>
  );
}
