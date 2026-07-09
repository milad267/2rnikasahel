"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  value?: string | string[];
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  maxSize?: number; // MB
  accept?: string;
  category?: string;
};

export function ImageUpload({ value, onChange, multiple = false, maxSize = 5, accept = "image/*", category = "product" }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(files: FileList) {
    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`حجم ${file.name} بیش از ${maxSize} مگابایت است`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) urls.push(data.file?.url || data.url || "");
      } catch {
        toast.error(`خطا در آپلود ${file.name}`);
      }
    }

    if (urls.length > 0) {
      if (multiple) onChange([...(Array.isArray(value) ? value : []), ...urls]);
      else if (urls[0]) onChange(urls[0]);
      toast.success(`${urls.length} تصویر آپلود شد ✓`);
    }
    setUploading(false);
  }

  const images = multiple
    ? (Array.isArray(value) ? value : [])
    : (typeof value === "string" && value ? [value] : []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={i} className="group relative size-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => {
                if (multiple) onChange((value as string[]).filter((_, j) => j !== i));
                else onChange("");
              }}
              className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-400 transition-colors hover:border-petrol-400 hover:text-petrol-600"
          style={{ width: images.length > 0 ? 80 : "100%", height: images.length > 0 ? 80 : 80 }}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Upload className="size-5" />
              <span className="text-[10px]">آپلود</span>
            </>
          )}
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={e => e.target.files && handleUpload(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
