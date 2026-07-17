"use client";

import { useState } from "react";
import { Info, ClipboardList, Store, ShieldCheck } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

type Props = {
  description: string | null;
  specSheet: Record<string, string> | null;
  brandName?: string | null;
  categoryTitle?: string | null;
};

const TABS = [
  { id: "description", label: "معرفی محصول", icon: Info },
  { id: "specs", label: "مشخصات فنی", icon: ClipboardList },
  { id: "brand", label: "فروشنده و برند", icon: Store },
];

export function ProductTabs({ description, specSheet, brandName, categoryTitle }: Props) {
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="rounded-[2rem] border border-navy-900/10 bg-white">
      {/* سربرگ تب‌ها */}
      <div className="flex border-b border-navy-900/10" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-all border-b-2 -mb-[1px] ${
                isActive
                  ? "border-petrol-600 text-petrol-700 bg-petrol-50/30"
                  : "border-transparent text-charcoal-500 hover:text-navy-900 hover:bg-navy-900/[0.02]"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.7} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* محتوای تب‌ها */}
      <div className="p-6">
        {activeTab === "description" && (
          <div className="prose prose-sm max-w-none text-sm leading-7 text-charcoal-700">
            {description ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(description || "") }} />
            ) : (
              <p className="text-charcoal-400">هنوز توضیحی برای این محصول ثبت نشده است.</p>
            )}
          </div>
        )}

        {activeTab === "specs" && specSheet && Object.keys(specSheet).length > 0 && (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-navy-900/10 bg-navy-900/5">
            {Object.entries(specSheet).map(([key, val]) => (
              <div key={key} className="flex justify-between bg-white px-4 py-3 text-xs">
                <span className="font-medium text-navy-900">{key}</span>
                <span className="text-charcoal-500">{val}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "specs" && (!specSheet || Object.keys(specSheet).length === 0) && (
          <p className="text-sm text-charcoal-400">مشخصات فنی برای این محصول ثبت نشده است.</p>
        )}

        {activeTab === "brand" && (
          <div className="space-y-4 text-sm">
            {brandName ? (
              <div className="flex items-center gap-3 rounded-xl bg-navy-900/[0.03] px-4 py-3">
                <ShieldCheck className="size-5 text-petrol-600" strokeWidth={1.6} />
                <div>
                  <p className="text-xs text-charcoal-500">برند</p>
                  <p className="font-semibold text-navy-900">{brandName}</p>
                </div>
              </div>
            ) : (
              <p className="text-charcoal-400">اطلاعات فروشنده و برند ثبت نشده است.</p>
            )}
            <div className="rounded-xl bg-petrol-50 px-4 py-3 text-xs text-petrol-800">
              <p className="font-semibold">📦 فروشنده: فروشگاه درنیکا ساحل</p>
              <p className="mt-1 text-petrol-600">تمام محصولات دارای گارانتی اصالت و سلامت فیزیکی هستند.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
