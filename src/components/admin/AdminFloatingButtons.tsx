"use client";

import { useState } from "react";
import { Zap, FileQuestion } from "lucide-react";

export function AdminFloatingButtons() {
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <>
      {/* دکمه میانبرهای سریع */}
      <button
        type="button"
        onClick={() => setQuickOpen(!quickOpen)}
        className="fixed bottom-20 left-6 z-50 flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition-all hover:bg-emerald-500 hover:scale-105"
        title="میانبرهای سریع"
      >
        <Zap className="size-5" strokeWidth={1.6} />
      </button>

      {/* دکمه راهنما */}
      <button
        type="button"
        className="fixed bottom-34 left-6 z-50 flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all hover:bg-blue-500 hover:scale-105"
        title="راهنما"
      >
        <FileQuestion className="size-5" strokeWidth={1.6} />
      </button>

      {/* منوی میانبرهای سریع */}
      {quickOpen && (
        <div className="fixed bottom-[7.5rem] left-6 z-50" onClick={() => setQuickOpen(false)}>
          <div className="card w-48 overflow-hidden rounded-2xl p-1.5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <QuickItem label="محصول جدید" href="/admin/products" />
            <QuickItem label="سفارش جدید" href="/admin/orders" />
            <QuickItem label="گزارش فروش" href="/admin?report=sales" />
            <QuickItem label="تنظیمات پیامک" href="/admin/sms" />
          </div>
        </div>
      )}
    </>
  );
}

function QuickItem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center rounded-xl px-3 py-2.5 text-xs font-medium text-navy-900 transition-colors hover:bg-navy-900/5"
    >
      {label}
    </a>
  );
}
