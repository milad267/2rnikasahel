"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Building2, Shield, Award, Users, Phone } from "lucide-react";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AboutPopup({ open, onClose }: Props) {
  // قفل اسکرول بدنه و html وقتی پاپ‌آپ باز است
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";
      // مقدار scrollPosition رو برای بازیابی ذخیره می‌کنیم
      (document.body as any).__popupScrollY = scrollY;
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
      // بازیابی موقعیت اسکرول
      const savedY = (document.body as any).__popupScrollY || 0;
      window.scrollTo(0, savedY);
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
      const savedY = (document.body as any).__popupScrollY || 0;
      window.scrollTo(0, savedY);
    };
  }, [open]);

  // بستن با Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* پس‌زمینه شیشه‌ای تار — هماهنگ با LuxePopup */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-950/55 backdrop-blur-md"
          />

          {/* باکس سفید اصلی با انیمیشن */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] rounded-[2rem] bg-white shadow-[0_40px_120px_-40px_rgba(3,12,22,0.55)] overflow-hidden border border-navy-900/10"
          >
            {/* دکمه بستن */}
            <button
              onClick={onClose}
              className="absolute left-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-navy-900/60 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-navy-900"
            >
              <X className="size-4" strokeWidth={2} />
            </button>

            {/* محتوای اسکرول‌شونده — اسکرولبار مخفی */}
            <div className="max-h-[85vh] overflow-y-auto overscroll-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [&::-webkit-scrollbar]:[display:none]">
              {/* هدر گرادیانتی */}
              <div className="bg-gradient-to-br from-navy-900 to-petrol-800 px-6 py-10 text-center text-white">
                <Building2 className="mx-auto size-12 mb-3 opacity-80" strokeWidth={1.3} />
                <h2 className="text-2xl font-black">درباره درنیکا ساحل</h2>
                <p className="mt-2 text-sm text-pearl-200/80 max-w-md mx-auto">
                  تأمین‌کننده تخصصی تجهیزات صنعتی، تأسیساتی و ابزارآلات با ضمانت اصالت و قیمت رقابتی
                </p>
              </div>

              {/* محتوا */}
              <div className="px-6 py-8 space-y-6 text-sm leading-7 text-slate-700">
                {/* بخش‌های اصلی */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <Shield className="mx-auto size-8 text-petrol-600 mb-2" strokeWidth={1.5} />
                    <h3 className="font-bold text-slate-900 mb-1">ضمانت اصالت</h3>
                    <p className="text-[11px] text-slate-500">تمام محصولات با ضمانت اصالت کالا و گارانتی بازگشت وجه ارائه می‌شوند.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <Award className="mx-auto size-8 text-petrol-600 mb-2" strokeWidth={1.5} />
                    <h3 className="font-bold text-slate-900 mb-1">تنوع محصولات</h3>
                    <p className="text-[11px] text-slate-500">بیش از ۱۰۰۰ محصول صنعتی و تأسیساتی در دسته‌بندی‌های مختلف.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <Users className="mx-auto size-8 text-petrol-600 mb-2" strokeWidth={1.5} />
                    <h3 className="font-bold text-slate-900 mb-1">پشتیبانی ۲۴ ساعته</h3>
                    <p className="text-[11px] text-slate-500">تیم پشتیبانی در تمام روزهای هفته پاسخگوی سوالات شما هستند.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <Phone className="mx-auto size-8 text-petrol-600 mb-2" strokeWidth={1.5} />
                    <h3 className="font-bold text-slate-900 mb-1">مشاوره تخصصی</h3>
                    <p className="text-[11px] text-slate-500">مشاوره رایگان قبل از خرید برای انتخاب بهترین محصول متناسب با نیاز شما.</p>
                  </div>
                </div>

                {/* متن توضیحی */}
                <div className="rounded-xl border border-slate-200 p-5 text-slate-600">
                  <p>
                    فروشگاه اینترنتی <strong className="text-navy-900">درنیکا ساحل</strong> با سال‌ها تجربه در زمینه 
                    تأمین تجهیزات صنعتی و تأسیساتی، مفتخر است با ارائه محصولات اصل و با کیفیت، خدمات خود را به 
                    مشتریان عزیز در سراسر کشور ارائه نماید. ما در درنیکا ساحل به اصالت کالا، قیمت منصفانه و 
                    رضایت شما متعهد هستیم.
                  </p>
                </div>

                {/* خط پایانی */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/about"
                    onClick={onClose}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    صفحه درباره ما
                  </Link>
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    بستن
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}