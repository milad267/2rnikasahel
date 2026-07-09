"use client";

import { useState } from "react";
import { Upload, X, Search, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function IconsPage() {
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  useState(() => {
    fetch("/api/admin/upload?category=icon").then(r => r.json()).then(data => {
      setIcons(data.map((f: any) => f.url));
    }).catch(() => {}).finally(() => setLoading(false));
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "icon");
      fd.append("skipWatermark", "true");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setIcons(prev => [data.file.url, ...prev]);
        toast.success(`✅ ${file.name} آپلود شد`);
      }
    }
    setUploading(false);
  }

  const filtered = icons.filter(url => search ? url.includes(search) : true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><ImageIcon className="size-6 text-petrol-600" strokeWidth={1.6} /> مدیریت آیکون‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">آپلود و مدیریت آیکون‌های سفارشی</p>
      </div>

      {/* آپلود */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
        <input type="file" id="iconUpload" multiple accept="image/png,image/svg+xml,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
        <label htmlFor="iconUpload" className="flex cursor-pointer flex-col items-center gap-2">
          <Upload className="size-8 text-slate-400" strokeWidth={1.3} />
          <p className="text-sm font-semibold text-slate-700">{uploading ? "در حال آپلود..." : "آیکون جدید را انتخاب کنید"}</p>
          <p className="text-[11px] text-slate-500">PNG, SVG, WEBP - حداکثر ۵ مگابایت</p>
        </label>
      </div>

      {/* جستجو */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <Search className="size-4 text-slate-400" strokeWidth={1.5} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی آیکون..." className="w-full bg-transparent text-xs text-slate-800 outline-none" />
      </div>

      {/* گرید آیکون‌ها */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-slate-400">
          <ImageIcon className="size-10 mb-2" strokeWidth={1.2} />
          <p className="text-sm">{search ? "آیکونی یافت نشد" : "هنوز آیکونی آپلود نشده"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {filtered.map((url, i) => (
            <div key={i} className="group relative flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-white p-2 transition-all hover:border-petrol-300 hover:shadow-sm">
              <img src={url} alt="" className="max-h-full max-w-full object-contain" />
              <button
                onClick={() => { navigator.clipboard.writeText(url); toast.success("✅ لینک کپی شد"); }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-slate-800">کپی لینک</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
