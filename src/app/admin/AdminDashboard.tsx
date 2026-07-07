"use client";

import { useState } from "react";
import {
  Package, Layers, Ruler, ShoppingCart, Users, Tag, Image, Sparkles, FileImage, Inbox, MessageSquare, Activity, ArrowLeft, Trash2, Upload, Plus
} from "lucide-react";
import { formatRial } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Counts = {
  products: number; variants: number; units: number; orders: number; users: number;
  categories: number; slides: number; features: number; files: number;
  recentOrders: { id: number; orderNumber: string; status: string; totalAmount: string; createdAt: Date }[];
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
};

const SECTIONS = [
  { id: "products", title: "محصولات", icon: Package, desc: "مدیریت محصولات و تنوع‌ها" },
  { id: "categories", title: "دسته‌بندی‌ها", icon: Layers, desc: "دسته‌بندی درختی محصولات" },
  { id: "units", title: "واحدها", icon: Ruler, desc: "مدیریت ۱۹ واحد اندازه‌گیری" },
  { id: "orders", title: "سفارش‌ها", icon: ShoppingCart, desc: "مدیریت سفارشات مشتریان" },
  { id: "users", title: "کاربران", icon: Users, desc: "مشتریان و پیمانکاران" },
  { id: "slides", title: "اسلایدر لندینگ", icon: Image, desc: "مدیریت اسلایدهای صفحه اصلی" },
  { id: "features", title: "ویژگی‌ها", icon: Sparkles, desc: "بخش چرا درنیکا ساحل" },
  { id: "palettes", title: "پالت‌های رنگی", icon: Tag, desc: "۵۰ پالت لاکچری" },
  { id: "uploads", title: "آپلود تصاویر", icon: FileImage, desc: "تصاویر اسلایدر و محصولات" },
  { id: "ai-price", title: "AI: آپدیت قیمت از اکسل", icon: Sparkles, desc: "CODE + PRICE با Dry Run و گزارش خطا" },
  { id: "quotes", title: "استعلام قیمت", icon: Inbox, desc: "درخواست‌های استعلام" },
  { id: "sms", title: "ارائه‌دهندگان SMS", icon: MessageSquare, desc: "پنل پیامک ایرانی" },
  { id: "settings", title: "تنظیمات سایت", icon: Activity, desc: "متن‌ها و محتوای سایت" },
];

export function AdminDashboard({ counts }: { counts: Counts }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const stats = [
    { label: "محصولات", value: counts.products, icon: Package, color: "petrol" },
    { label: "تنوع‌ها", value: counts.variants, icon: Layers, color: "navy" },
    { label: "سفارش‌ها", value: counts.orders, icon: ShoppingCart, color: "amber" },
    { label: "کاربران", value: counts.users, icon: Users, color: "petrol" },
  ];

  return (
    <div className="space-y-8">
      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-10 items-center justify-center rounded-2xl ${
                    s.color === "petrol" ? "bg-petrol-600/15 text-petrol-700" : s.color === "navy" ? "bg-navy-900/8 text-navy-900" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <span className="text-2xl font-black text-navy-900">{s.value}</span>
              </div>
              <p className="mt-3 text-xs font-medium text-charcoal-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* شبکه بخش‌ها */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
            <Activity className="size-5 text-petrol-600" strokeWidth={1.8} />
            بخش‌های مدیریت
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className="card group flex items-center gap-3 rounded-2xl p-4 text-start transition-all hover:shadow-[var(--shadow-glow-petrol)]"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrol-600/12 text-petrol-700 transition-colors group-hover:bg-petrol-600/25">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy-900">{s.title}</p>
                    <p className="line-clamp-1 text-[11px] text-charcoal-500">{s.desc}</p>
                  </div>
                  <ArrowLeft className="size-4 shrink-0 text-charcoal-400 transition-transform group-hover:-translate-x-1" />
                </button>
              );
            })}
          </div>
        </div>

        {/* آخرین سفارش‌ها */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
            <ShoppingCart className="size-5 text-petrol-600" strokeWidth={1.8} />
            آخرین سفارش‌ها
          </h2>
          <div className="card space-y-2 rounded-[1.75rem] p-4">
            {counts.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-xs text-charcoal-500">هنوز سفارشی ثبت نشده است.</p>
            ) : (
              counts.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-navy-900/[0.03] px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-navy-900">#{o.orderNumber}</p>
                    <p className="text-[10px] text-charcoal-500">
                      {new Date(o.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-bold text-petrol-700">{formatRial(o.totalAmount)}</p>
                    <p className="text-[10px] text-charcoal-500">{STATUS_LABELS[o.status] || o.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* مدال مدیریت بخش‌ها */}
      {activeSection && (
        <SectionModal section={activeSection} onClose={() => setActiveSection(null)} />
      )}
    </div>
  );
}

function SectionModal({ section, onClose }: { section: string; onClose: () => void }) {
  const sectionInfo = SECTIONS.find((s) => s.id === section);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-md" onClick={onClose} />
      <div className="card relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">{sectionInfo?.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-navy-900/5 text-charcoal-500 hover:bg-navy-900/10"
          >
            ✕
          </button>
        </div>

        {section === "products" && <ProductsManager />}
        {section === "categories" && <CategoriesManager />}
        {section === "units" && <UnitsManager />}
        {section === "slides" && <SlidesManager />}
        {section === "features" && <FeaturesManager />}
        {section === "uploads" && <UploadsManager />}
        {section === "ai-price" && <AiPriceUpdateManager />}
        {section === "settings" && <SettingsManager />}

        {["orders", "users", "palettes", "quotes", "sms"].includes(section) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800">
            این بخش در فاز ۵ به‌صورت کامل با CRUD پیاده‌سازی خواهد شد.
            <br />
            فعلاً فقط ساختار رابط کاربری نمایش داده می‌شود.
          </div>
        )}
      </div>
    </div>
  );
}

// ============== Products ==============
function ProductsManager() {
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; title: string; slug: string; isActive: boolean; categoryId: number | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useState(() => {
    setLoading(true);
    fetch("/api/admin/products").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  });

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-petrol-500/40 bg-petrol-600/[0.05] py-3 text-xs font-semibold text-petrol-700"
      >
        <Plus className="size-4" /> افزودن محصول جدید
      </button>
      {loading ? (
        <p className="py-4 text-center text-xs text-charcoal-500">در حال بارگذاری...</p>
      ) : (
        items.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl bg-navy-900/[0.03] p-3">
            <div>
              <p className="text-sm font-bold text-navy-900">{p.title}</p>
              <p className="text-[10px] text-charcoal-500">/{p.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {p.isActive ? "فعال" : "غیرفعال"}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============== Categories ==============
function CategoriesManager() {
  const [items, setItems] = useState<{ id: number; title: string; slug: string; productCount: number }[]>([]);
  useState(() => {
    fetch("/api/categories").then(r => r.json()).then(setItems);
  });
  return (
    <div className="space-y-2">
      <p className="text-xs text-charcoal-500">دسته‌بندی‌های فعلی سیستم:</p>
      {items.map(c => (
        <div key={c.id} className="flex items-center justify-between rounded-2xl bg-navy-900/[0.03] p-3">
          <p className="text-sm font-bold text-navy-900">{c.title}</p>
          <span className="rounded-full bg-petrol-600/10 px-2 py-0.5 text-[10px] text-petrol-700">{c.productCount} محصول</span>
        </div>
      ))}
    </div>
  );
}

// ============== Units ==============
function UnitsManager() {
  const [items, setItems] = useState<{ id: number; name: string; symbol: string | null; slug: string; category: string }[]>([]);
  useState(() => {
    fetch("/api/admin/units").then(r => r.json()).then(setItems);
  });
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(u => (
        <div key={u.id} className="rounded-2xl bg-navy-900/[0.03] p-3 text-center">
          <p className="text-sm font-bold text-navy-900">{u.name}</p>
          <p className="text-[10px] text-charcoal-500">{u.symbol} · {u.category}</p>
        </div>
      ))}
    </div>
  );
}

// ============== Slides ==============
function SlidesManager() {
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; title: string; subtitle: string | null; image: string | null; sortOrder: number; isActive: boolean }[]>([]);
  useState(() => {
    fetch("/api/admin/slides").then(r => r.json()).then(setItems);
  });
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-petrol-500/40 bg-petrol-600/[0.05] py-3 text-xs font-semibold text-petrol-700"
      >
        <Plus className="size-4" /> افزودن اسلاید جدید
      </button>
      {items.map(s => (
        <div key={s.id} className="rounded-2xl bg-navy-900/[0.03] p-3">
          <div className="flex items-start gap-3">
            {s.image && (
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-navy-900/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={s.title} className="size-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold text-navy-900">{s.title}</p>
              <p className="line-clamp-2 text-[10px] text-charcoal-500">{s.subtitle}</p>
              <p className="mt-1 text-[10px] text-petrol-700">ترتیب: {s.sortOrder}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {s.isActive ? "فعال" : "غیرفعال"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============== Features ==============
function FeaturesManager() {
  const [items, setItems] = useState<{ id: number; icon: string; title: string; desc: string; sortOrder: number }[]>([]);
  useState(() => {
    fetch("/api/admin/features").then(r => r.json()).then(setItems);
  });
  return (
    <div className="space-y-2">
      {items.map(f => (
        <div key={f.id} className="rounded-2xl bg-navy-900/[0.03] p-3">
          <p className="text-sm font-bold text-navy-900">{f.title}</p>
          <p className="line-clamp-2 text-[10px] text-charcoal-500">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ============== Uploads ==============
function UploadsManager() {
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; filename: string; url: string; size: number; category: string; createdAt: Date }[]>([]);
  const [uploading, setUploading] = useState(false);

  useState(() => {
    fetch("/api/admin/upload").then(r => r.json()).then(setItems);
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("category", "slide");
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.ok) {
        setItems([data.file, ...items]);
        router.refresh();
      } else {
        alert(data.error);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-petrol-500/40 bg-petrol-600/[0.05] py-4 text-xs font-semibold text-petrol-700">
        <Upload className="size-4" />
        {uploading ? "در حال آپلود..." : "انتخاب تصویر برای آپلود"}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map(f => (
          <div key={f.id} className="overflow-hidden rounded-xl border border-navy-900/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.filename} className="aspect-[4/3] w-full object-cover" />
            <p className="line-clamp-1 px-2 py-1 text-[10px] text-charcoal-500">{f.filename}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== Settings ==============
function SettingsManager() {
  const [items, setItems] = useState<{ id: number; key: string; value: unknown; group: string; locale: string }[]>([]);
  useState(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(setItems);
  });
  return (
    <div className="space-y-2">
      <p className="text-xs text-charcoal-500">تنظیمات قابل ویرایش سایت:</p>
      {items.map(s => (
        <div key={s.id} className="rounded-2xl bg-navy-900/[0.03] p-3">
          <p className="text-[10px] font-semibold text-petrol-700">{s.group} / {s.key}</p>
          <p className="mt-1 text-xs text-navy-900">{JSON.stringify(s.value)}</p>
        </div>
      ))}
    </div>
  );
}

// ============== AI Price Update ==============
type PriceReportRow = {
  row: number;
  code: string;
  price: number | null;
  status: "matched" | "updated" | "not_found" | "invalid";
  oldPrice?: string;
  newPrice?: string;
  error?: string;
};

function AiPriceUpdateManager() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    dryRun: boolean;
    totalRows: number;
    matchedRows: number;
    updatedRows: number;
    errorRows: number;
    report: PriceReportRow[];
    error?: string;
  }>(null);

  async function submit() {
    if (!file) {
      alert("لطفاً فایل اکسل را انتخاب کنید.");
      return;
    }
    setLoading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    form.append("dryRun", dryRun ? "true" : "false");
    try {
      const res = await fetch("/api/admin/ai/price-update", { method: "POST", body: form });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-petrol-500/20 bg-petrol-600/[0.05] p-4 text-xs leading-6 text-charcoal-600">
        فایل اکسل باید ستون‌های <b>CODE</b> و <b>PRICE</b> داشته باشد. CODE همان کد تنوع/SKU است و PRICE قیمت جدید به ریال.
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-petrol-500/40 bg-petrol-600/[0.05] py-4 text-xs font-semibold text-petrol-700">
        <Upload className="size-4" />
        {file ? file.name : "انتخاب فایل اکسل (xlsx / xls / csv)"}
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
      </label>

      <label className="flex items-center gap-2 text-xs text-charcoal-500">
        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="size-4 accent-petrol-600" />
        Dry Run فعال باشد (فقط گزارش، بدون تغییر قیمت)
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-5 py-3 text-sm font-bold text-pearl-50 shadow-[var(--shadow-glow-petrol)] disabled:opacity-60"
      >
        <Sparkles className="size-4" />
        {loading ? "در حال پردازش اکسل..." : dryRun ? "اجرای Dry Run" : "اعمال تغییر قیمت‌ها"}
      </button>

      {result && (
        <div className="space-y-3 rounded-2xl bg-navy-900/[0.03] p-4">
          {!result.ok ? (
            <p className="text-xs font-bold text-red-600">{result.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <Stat label="کل" value={result.totalRows} />
                <Stat label="پیداشده" value={result.matchedRows} />
                <Stat label="اعمال‌شده" value={result.updatedRows} />
                <Stat label="خطا" value={result.errorRows} />
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {result.report.map((r) => (
                  <div key={`${r.row}-${r.code}`} className="rounded-xl bg-white p-3 text-[10px] shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-navy-900">ردیف {r.row} · {r.code || "بدون کد"}</span>
                      <span className={`rounded-full px-2 py-0.5 font-bold ${r.status === "updated" || r.status === "matched" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-charcoal-500">
                      قدیم: {r.oldPrice ?? "—"} / جدید: {r.newPrice ?? r.price ?? "—"}
                    </p>
                    {r.error && <p className="mt-1 text-red-600">{r.error}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3 shadow-sm">
      <p className="text-lg font-black text-navy-900">{value}</p>
      <p className="mt-1 text-charcoal-500">{label}</p>
    </div>
  );
}
