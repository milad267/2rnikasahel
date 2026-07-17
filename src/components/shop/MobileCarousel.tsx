"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { formatRial } from "@/lib/utils";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { CardCartButton } from "@/components/commerce/CardCartButton";

type Product = {
  id: number; slug: string; title: string; subtitle: string | null;
  coverImage: string | null; minPrice: string; variantId: number | null;
  variantCount: number;
};

const ITEMS_PER_PAGE = 6; // 2 ستون × ۳ ردیف

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export function MobileCarousel({ products, wishlistedIds }: { products: Product[]; wishlistedIds: number[] }) {
  const [[page, dir], setPageState] = useState([0, 0]);
  const dragX = useRef(0);
  const dragStarted = useRef(false);
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  const paginate = useCallback((newDir: number) => {
    setPageState(([prev]) => {
      const next = prev + newDir;
      if (next < 0 || next >= totalPages) return [prev, newDir];
      return [next, newDir];
    });
  }, [totalPages]);

  const goToPage = useCallback((index: number) => {
    setPageState(([prev]) => [index, index > prev ? 1 : -1]);
  }, []);

  const handleDragEnd = useCallback((_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 60;
    const swipe = info.offset.x;
    const velocity = info.velocity.x;
    if (Math.abs(swipe) > threshold || Math.abs(velocity) > 0.5) {
      if (swipe > 0) paginate(-1); // درگ به راست ← صفحه قبل
      else paginate(1); // درگ به چپ ← صفحه بعد
    }
  }, [paginate]);

  if (products.length === 0) return null;

  const pageProducts = products.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const placeholdersNeeded = ITEMS_PER_PAGE - pageProducts.length;

  return (
    <div className="sm:hidden overflow-hidden">
      {/* ناحیه کاروسل با قابلیت درگ */}
      <div className="relative -mx-4 px-4">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={page}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            onDragStart={() => { dragStarted.current = true; }}
            className="grid grid-cols-2 gap-3 select-none"
            style={{ gridAutoRows: "1fr" }}
          >
            {pageProducts.map((p) => (
              <article key={p.id} className="card group relative flex flex-col overflow-hidden rounded-[1.25rem] transition-all duration-400 h-full">
                <WishlistToggleButton productId={p.id} initialWishlisted={wishlistedIds.includes(p.id)} compact
                  className="absolute end-2 top-2 z-20 bg-pearl-100/90 backdrop-blur-md" />
                <Link href={`/shop/${p.slug}`} className="flex flex-1 flex-col" draggable={false}>
                  <div className="relative flex aspect-[10/9] items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
                    {p.coverImage ? (
                      <img src={p.coverImage} alt={p.title} className="size-full object-cover" draggable={false} />
                    ) : (
                      <Package className="size-10 text-navy-700/30" strokeWidth={1.2} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3 min-h-[110px]">
                    <div>
                      <h3 className="text-[11px] font-bold leading-5 text-navy-900 line-clamp-2">{p.title}</h3>
                      {p.subtitle && <p className="mt-0.5 line-clamp-1 text-[10px] text-charcoal-500">{p.subtitle.replace(/<[^>]+>/g, '')}</p>}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-navy-900">{formatRial(p.minPrice)}</span>
                      <CardCartButton slug={p.slug} variantCount={p.variantCount} variantId={p.variantId} />
                    </div>
                  </div>
                </Link>
              </article>
            ))}
            {placeholdersNeeded > 0 && Array.from({ length: placeholdersNeeded }).map((_, i) => (
              <div key={`ph-${page}-${i}`} className="invisible" />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* دکمه‌های کناری برای ناوبری */}
        {page > 0 && (
          <button onClick={() => paginate(-1)}
            className="absolute right-1 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md text-navy-900"
          >
            <ChevronRight className="size-4" strokeWidth={2.5} />
          </button>
        )}
        {page < totalPages - 1 && (
          <button onClick={() => paginate(1)}
            className="absolute left-1 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md text-navy-900"
          >
            <ChevronLeft className="size-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* نقاط صفحه */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => goToPage(i)} aria-label={`صفحه ${i + 1} محصولات`}
              className={`size-2 rounded-full transition-all duration-300 ${
                i === page
                  ? "w-5 bg-petrol-600"
                  : "bg-navy-900/20 hover:bg-navy-900/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
