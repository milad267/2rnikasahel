"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Compass, Search, SlidersHorizontal, ArrowLeft, Check, ChevronDown, ChevronUp, Package, Wrench, Gauge, Zap, Droplets, Flame, ChevronLeft, Star, Sparkles, Thermometer, Fan, Cable, ShowerHead, Wind, Drill, Plug, Droplet, Factory, Building2, Home, Tractor, Pipette, Container, Cpu, HardHat, Atom, TestTube, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = { id: number; slug: string; title: string; productCount: number; desc?: string };
type CategoryTree = { id: number; slug: string; title: string; description: string | null; productCount: number; children?: CategoryTree[] };

/* نگاشت اسلاگ به آیکون — بر اساس کلمه کلیدی */
function iconForSlug(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes("pump") || s.includes("پمپ")) return Droplets;
  if (s.includes("pipe") || s.includes("لوله") || s.includes("اتصال")) return Package;
  if (s.includes("valve") || s.includes("شیر") || s.includes("فلکه")) return Wrench;
  if (s.includes("gauge") || s.includes("مانومتر") || s.includes("گیج") || s.includes("فشار")) return Gauge;
  if (s.includes("hvac") || s.includes("گرمایش") || s.includes("تهویه") || s.includes("heat") || s.includes("fan")) return Flame;
  if (s.includes("elect") || s.includes("برق") || s.includes("کابل") || s.includes("cable")) return Zap;
  if (s.includes("therm") || s.includes("دما")) return Thermometer;
  if (s.includes("tool") || s.includes("ابزار")) return Wrench;
  if (s.includes("drill") || s.includes("دریل")) return Drill;
  if (s.includes("صنعتی") || s.includes("industrial")) return Factory;
  if (s.includes("ساختمان") || s.includes("construction")) return HardHat;
  if (s.includes("کشاورزی") || s.includes("agriculture") || s.includes("farm")) return Tractor;
  /* نگاشت بر اساس جنس / متریال */
  if (s.includes("استیل") || s.includes("فولاد") || s.includes("steel") || s.includes("stainless")) return Cpu;
  if (s.includes("چدن") || s.includes("cast")) return Container;
  if (s.includes("برنج") || s.includes("brass")) return Atom;
  if (s.includes("پلاستیک") || s.includes("plastic") || s.includes("پلیمر") || s.includes("polymer")) return TestTube;
  if (s.includes("آلومینیوم") || s.includes("aluminum") || s.includes("aluminium")) return Wind;
  if (s.includes("مس") || s.includes("copper")) return Zap;
  if (s.includes("چوب") || s.includes("wood")) return HardHat;
  if (s.includes("شیشه") || s.includes("glass")) return Droplets;
  if (s.includes("سرامیک") || s.includes("ceramic")) return Container;
  if (s.includes("لاستیک") || s.includes("rubber")) return TestTube;
  if (s.includes("آهن") || s.includes("iron")) return Factory;
  return Package; // آیکون پیش‌فرض
}

const QUESTIONS_TEMPLATE = [
  { id: "type", question: "نوع محصول مورد نظر شما چیست؟", options: [] as { label: string; value: string; icon: any }[] },
  { id: "usage", question: "کاربرد اصلی چیست؟", options: [
    { label: "صنعتی", value: "industrial", icon: Factory },
    { label: "ساختمانی و تأسیساتی", value: "construction", icon: HardHat },
    { label: "کشاورزی", value: "agricultural", icon: Tractor },
    { label: "خانگی", value: "residential", icon: Home },
  ]},
  { id: "material", question: "جنس مورد نظر؟", options: [] as { label: string; value: string; icon: any }[] },
];

const progressVariants = {
  hidden: { scaleX: 0 },
  visible: (pct: number) => ({
    scaleX: pct,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

export default function FinderPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [direction, setDirection] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
        ]);
        if (!catRes.ok) return;
        const data = (await catRes.json()) as CategoryTree[];
        if (!mounted) return;
        const flat: Category[] = data.flatMap((parent) => [
          { id: parent.id, slug: parent.slug, title: parent.title, productCount: parent.productCount, desc: parent.description || `${parent.productCount} محصول` },
          ...(parent.children ?? []).map((child) => ({
            id: child.id,
            slug: child.slug,
            title: child.title,
            productCount: child.productCount,
            desc: child.description || `${child.productCount} محصول`,
          })),
        ]);
        setCategories(flat);
        // ساختن پویای سؤالات از دسته‌بندی‌های واقعی
        const typeQuestion = QUESTIONS_TEMPLATE[0];
        typeQuestion.options = data.flatMap((parent) => [
          { label: parent.title, value: parent.slug, icon: iconForSlug(parent.slug) },
          ...(parent.children ?? []).map((child) => ({
            label: child.title, value: child.slug, icon: iconForSlug(child.slug),
          })),
        ]);
        // بارگذاری پویای برندها به عنوان گزینه‌های جنس
        const materialOptions: { label: string; value: string; icon: any }[] = [];
        if (brandRes.ok) {
          const brandData = (await brandRes.json()) as { ok: boolean; data: { id: number; name: string; slug: string }[] };
          if (mounted && brandData.data?.length) {
            brandData.data.forEach((b) => {
              materialOptions.push({
                label: b.name,
                value: String(b.id),
                icon: iconForSlug(b.slug || b.name),
              });
            });
          }
        }
        // همیشه گزینه "فرقی نمی‌کند" در انتها قرار دارد
        materialOptions.push({ label: "فرقی نمی‌کند", value: "any", icon: Ruler });
        QUESTIONS_TEMPLATE[2].options = materialOptions;
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => { mounted = false; };
  }, []);

  function answer(qId: string, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setDirection(1);
    if (step < QUESTIONS_TEMPLATE.length - 1) {
      setStep(prev => prev + 1);
    } else {
      setResult("all");
    }
  }

  function goBack() {
    if (step > 0) {
      setDirection(-1);
      setStep(prev => prev - 1);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setResult(null);
    setShowAll(false);
  }

  const QUESTIONS = QUESTIONS_TEMPLATE;
  const currentQuestion = QUESTIONS[step];
  const pct = step / QUESTIONS.length;
  const categoryList = categories;

  return (
    <div className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:pt-44 overflow-hidden">
      {/* لایه نورانی زمینه */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-[10%] size-[40rem] rounded-full bg-petrol-300/15 blur-[130px]" />
        <div className="absolute -right-40 top-[30%] size-[36rem] rounded-full bg-navy-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 size-[48rem] -translate-x-1/2 rounded-full bg-pearl-200/60 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#ffffff_0%,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-4xl">
        {/* ─── هدر ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-10">
          <div className="flex justify-center">
            <div className="relative flex size-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-petrol-500 to-petrol-700 shadow-lg shadow-petrol-500/25">
              <Compass className="size-9 text-pearl-50" strokeWidth={1.4} />
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-pearl-50 text-[9px] font-black text-petrol-700 shadow-sm">
                <Sparkles className="size-3" strokeWidth={2.5} />
              </span>
            </div>
          </div>
          <h1 className="mt-5 text-gradient-navy text-3xl font-black sm:text-5xl">
            راهنمای انتخاب محصول
          </h1>
          <p className="mt-3 text-sm text-charcoal-500 max-w-lg mx-auto leading-6">
            با پاسخ به چند سؤال ساده، محصول مناسب خود را پیدا کنید
          </p>
        </motion.div>

        {/* ─── مرحله سؤال ─── */}
        {!result && (
          <div className="max-w-2xl mx-auto">
            {/* نوار پیشرفت با مرحله‌شمار */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
              <div className="flex items-center justify-between mb-3">
                {QUESTIONS.map((q, i) => (
                  <div key={q.id} className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500",
                      i < step ? "bg-petrol-600 text-white shadow-md shadow-petrol-500/30" :
                      i === step ? "ring-2 ring-petrol-500 bg-petrol-50 text-petrol-700 shadow-sm" :
                      "bg-navy-900/5 text-charcoal-400"
                    )}>
                      {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={cn(
                      "text-[9px] font-medium whitespace-nowrap transition-colors",
                      i <= step ? "text-petrol-700" : "text-charcoal-400"
                    )}>
                      {q.id === "type" ? "نوع" : q.id === "usage" ? "کاربرد" : "جنس"}
                    </span>
                  </div>
                ))}
              </div>
              {/* نوار پیشرفت */}
              <div className="h-1.5 rounded-full bg-navy-900/8 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-petrol-500 to-petrol-600 origin-right"
                  custom={pct}
                  variants={progressVariants}
                  initial="hidden"
                  animate="visible"
                />
              </div>
            </motion.div>

            {/* پرسش فعلی */}
            {currentQuestion && (
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
                    center: { opacity: 1, x: 0 },
                    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
                >
                  <div className="card rounded-[2rem] p-6 sm:p-8 shadow-sm">
                    <h2 className="text-lg sm:text-xl font-bold text-navy-900 text-center mb-6">
                      {currentQuestion.question}
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((opt) => {
                        const Icon = (opt as any).icon || Check;
                        const isSelected = answers[currentQuestion.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => answer(currentQuestion.id, opt.value)}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all duration-300",
                              isSelected
                                ? "border-petrol-500 bg-gradient-to-br from-petrol-50 to-white shadow-md shadow-petrol-500/10"
                                : "border-navy-900/8 hover:border-petrol-300 hover:bg-petrol-50/40 hover:shadow-sm"
                            )}
                          >
                            <div className={cn(
                              "flex size-11 items-center justify-center rounded-xl transition-all duration-300",
                              isSelected
                                ? "bg-petrol-600 text-white shadow-sm shadow-petrol-500/30"
                                : "bg-navy-900/5 text-navy-700 group-hover:bg-petrol-600/10 group-hover:text-petrol-700"
                            )}>
                              <Icon className="size-5" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <p className={cn("text-sm font-bold transition-colors", isSelected ? "text-petrol-800" : "text-navy-900")}>
                                {opt.label}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="flex size-6 items-center justify-center rounded-full bg-petrol-600 text-pearl-50">
                                <Check className="size-3.5" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* دکمه‌های ناوبری */}
                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={goBack}
                      disabled={step === 0}
                      className="flex items-center gap-1.5 rounded-full border border-navy-900/10 px-5 py-2.5 text-xs font-semibold text-navy-900 hover:bg-navy-900/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight className="size-3.5" strokeWidth={2.5} />
                      مرحله قبل
                    </button>
                    <Link href="/shop" className="text-xs font-medium text-petrol-600 hover:text-petrol-500 transition-colors">
                      رفتن به فروشگاه
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* ─── نتیجه ─── */}
        {result && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
              className="max-w-2xl mx-auto"
            >
              <div className="card rounded-[2rem] p-6 sm:p-10 shadow-sm">
                {/* آیکون موفقیت */}
                <div className="flex justify-center mb-5">
                  <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30">
                    <Check className="size-9 text-white" strokeWidth={2.5} />
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                      className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-pearl-50 shadow-sm"
                    >
                      <Star className="size-3.5 fill-petrol-600 text-petrol-600" strokeWidth={2} />
                    </motion.span>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-center text-gradient-navy">
                  محصولات پیشنهادی
                </h2>
                <p className="mt-2 text-sm text-charcoal-500 text-center max-w-md mx-auto leading-6">
                  بر اساس پاسخ‌های شما، این دسته‌بندی‌ها پیشنهاد می‌شود:
                </p>

                {/* لیست دسته‌ها */}
                <div className="mt-8 space-y-3 text-right">
                  {(categoryList)
                    .slice(0, showAll ? categoryList.length : 3)
                    .map((cat, idx) => {
                    const Icon = iconForSlug(cat.slug);
                    return (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
                      >
                        <Link
                          href={`/shop?cat=${cat.slug}`}
                          className="flex items-center gap-4 rounded-2xl border border-navy-900/8 p-4 hover:border-petrol-300 hover:bg-gradient-to-l hover:from-petrol-50/60 hover:to-white transition-all duration-300 group"
                        >
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-petrol-500/10 to-petrol-600/10 text-petrol-700 group-hover:from-petrol-500/20 group-hover:to-petrol-600/20 transition-all duration-300">
                            <Icon className="size-6" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-navy-900 group-hover:text-petrol-700 transition-colors truncate">
                              {cat.title}
                            </p>
                            <p className="text-xs text-charcoal-500 mt-0.5 line-clamp-1">{cat.desc}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-navy-900/5 px-2.5 py-1 text-[10px] font-semibold text-charcoal-500 group-hover:bg-petrol-600/10 group-hover:text-petrol-700 transition-colors">
                            {cat.productCount} محصول
                          </span>
                          <ChevronLeft className="size-4 text-charcoal-300 group-hover:text-petrol-600 transition-colors shrink-0" strokeWidth={2} />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* دکمه مشاهده همه */}
                {categoryList.length > 3 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-petrol-600 hover:text-petrol-500 bg-petrol-50/60 hover:bg-petrol-100/60 rounded-2xl transition-all"
                  >
                    {showAll ? (
                      <><ChevronUp className="size-3.5" strokeWidth={2} /> نمایش کمتر</>
                    ) : (
                      <><ChevronDown className="size-3.5" strokeWidth={2} /> {categoryList.length - 3} دسته دیگر</>
                    )}
                  </button>
                )}

                {/* دکمه‌های پایانی */}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={reset}
                    className="rounded-full border border-navy-900/10 px-6 py-3 text-xs font-semibold text-navy-900 hover:bg-navy-900/5 transition-colors"
                  >
                    شروع دوباره
                  </button>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-petrol-600 to-petrol-700 px-6 py-3 text-xs font-semibold text-pearl-50 shadow-lg shadow-petrol-500/25 hover:shadow-xl hover:shadow-petrol-500/30 hover:-translate-y-0.5 transition-all"
                  >
                    <ArrowLeft className="size-3.5" strokeWidth={2} />
                    مشاهده همه محصولات
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ─── لینک‌های سریع ─── */}
        {!result && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-16"
          >
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-navy-900/5 px-4 py-1.5 text-[10px] font-semibold text-charcoal-500">
                <SlidersHorizontal className="size-3" strokeWidth={1.8} />
                یا مستقیماً وارد شوید
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
              <Link href="/shop" className="group relative overflow-hidden rounded-[2rem] border border-navy-900/8 bg-white p-5 transition-all duration-300 hover:shadow-[0_20px_60px_-30px_rgba(19,78,92,0.5)] hover:-translate-y-0.5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-petrol-500/10 to-petrol-600/10 text-petrol-600 group-hover:from-petrol-500/20 group-hover:to-petrol-600/20 transition-all">
                  <Search className="size-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-navy-900 group-hover:text-petrol-700 transition-colors">جستجوی مستقیم</h3>
                <p className="mt-1 text-xs text-charcoal-500 leading-5">همه محصولات را با فیلترهای دقیق و جستجوی سریع مرور کنید.</p>
              </Link>
              <Link href="/shop" className="group relative overflow-hidden rounded-[2rem] border border-navy-900/8 bg-white p-5 transition-all duration-300 hover:shadow-[0_20px_60px_-30px_rgba(19,78,92,0.5)] hover:-translate-y-0.5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-petrol-500/10 to-petrol-600/10 text-petrol-600 group-hover:from-petrol-500/20 group-hover:to-petrol-600/20 transition-all">
                  <Package className="size-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-navy-900 group-hover:text-petrol-700 transition-colors">همه محصولات</h3>
                <p className="mt-1 text-xs text-charcoal-500 leading-5">لیست کامل محصولات فروشگاه با دسته‌بندی دقیق.</p>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
