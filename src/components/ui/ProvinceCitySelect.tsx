"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Search, ChevronDown, X } from "lucide-react";
import { getProvinceOptions, getCitiesByProvince } from "@/lib/iran-provinces";

// ─── کامپوننت جستجوی داخلی ───
function SearchDropdown({
  options,
  value,
  onChange,
  placeholder,
  fieldName,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  fieldName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // بستن با کلیک بیرون
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // فیلتر بر اساس جستجو
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, search]);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  function select(val: string) {
    onChange(val);
    setSearch("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {/* کادر ورودی */}
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-xs transition-all ${
          open
            ? "border-petrol-600 bg-white shadow-sm ring-1 ring-petrol-200"
            : "border-navy-900/10 bg-navy-900/[0.02] hover:border-petrol-400"
        }`}
        onClick={() => {
          setOpen(!open);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <MapPin className={`size-4 shrink-0 transition-colors ${value ? "text-petrol-700" : "text-charcoal-400"}`} strokeWidth={1.6} />
        {value && !open ? (
          <span className="flex-1 font-semibold text-navy-900">{selectedLabel}</span>
        ) : (
          <span className="flex-1 text-charcoal-400">{placeholder}</span>
        )}
        <ChevronDown className={`size-4 transition-all ${open ? "rotate-180 text-petrol-600" : "text-charcoal-400"}`} strokeWidth={1.6} />
      </div>

      {/* دراپ‌داون */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-petrol-200 bg-white shadow-xl">
          {/* باکس جستجو */}
          <div className="flex items-center gap-2 border-b border-petrol-100 bg-petrol-50/50 px-3 py-2.5">
            <Search className="size-4 shrink-0 text-petrol-600" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو کنید..."
              className="w-full bg-transparent text-xs text-navy-900 outline-none placeholder:text-charcoal-400"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-charcoal-400 transition-colors hover:text-petrol-700"
              >
                <X className="size-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* تعداد نتایج */}
          <div className="border-b border-petrol-100 px-3 py-1.5 text-[10px] font-medium text-petrol-700">
            {filtered.length} مورد
          </div>

          {/* لیست گزینه‌ها */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-charcoal-400">
                <Search className="mx-auto mb-2 size-6 opacity-30" strokeWidth={1.2} />
                موردی یافت نشد
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => select(opt.value)}
                  className={`flex w-full items-center gap-2 border-b border-navy-900/[0.03] px-4 py-2.5 text-xs text-right transition-all last:border-0 hover:bg-petrol-50 ${
                    opt.value === value
                      ? "bg-gradient-to-r from-petrol-50 to-transparent font-semibold text-petrol-700"
                      : "text-navy-900 hover:text-petrol-700"
                  }`}
                >
                  <MapPin className={`size-3.5 shrink-0 ${opt.value === value ? "text-petrol-600" : "text-charcoal-300"}`} strokeWidth={1.5} />
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* hidden field برای ارسال به فرم */}
      {fieldName && <input type="hidden" name={fieldName} value={value} />}
    </div>
  );
}

// ─── کامپوننت اصلی ───
type Props = {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
};

export function ProvinceCitySelect({
  province,
  city,
  onProvinceChange,
  onCityChange,
}: Props) {
  const provinceOptions = useMemo(() => {
    return getProvinceOptions().map((p) => ({ value: p.value, label: p.label }));
  }, []);

  const cityOptions = useMemo(() => {
    if (!province) return [];
    return getCitiesByProvince(province).map((c) => ({ value: c.name, label: c.name }));
  }, [province]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <SearchDropdown
        options={provinceOptions}
        value={province}
        onChange={(v) => {
          onProvinceChange(v);
          onCityChange(""); // ریست شهر
        }}
        placeholder="انتخاب استان"
        fieldName="province"
      />
      <SearchDropdown
        options={cityOptions}
        value={city}
        onChange={onCityChange}
        placeholder={province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"}
        fieldName="city"
      />
    </div>
  );
}
