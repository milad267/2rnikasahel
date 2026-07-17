"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Package, Star } from "lucide-react";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { CardCartButton } from "@/components/commerce/CardCartButton";
import { formatRial } from "@/lib/utils";

type Product = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  minPrice: string;
  variantCount: number;
  variantId: number | null;
  hasDiscount?: boolean | null;
  discountType?: string | null;
  discountValue?: string | null;
  discountPrice?: string | null;
};

type Props = {
  products: Product[];
  wishlistedIds: number[];
};

export function HorizontalScrollFeatured({ products, wishlistedIds }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, products]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseLeave = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const scrollBy = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative group/scroll">
      {/* دکمه اسکرول چپ */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center size-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-navy-900/10 text-navy-900 hover:bg-white transition-all opacity-0 group-hover/scroll:opacity-100"
          aria-label="اسکرول به چپ"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* کانتینر اسکرول افقی */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
      >
        {products.map((p) => (
          <article
            key={p.id}
            className="flex-shrink-0 w-[220px] sm:w-[260px] card group relative overflow-hidden rounded-[1.75rem] transition-all duration-400 hover:shadow-[0_30px_70px_-40px_rgba(19,78,92,0.6)] ring-1 ring-amber-200/50"
          >
            <WishlistToggleButton
              productId={p.id}
              initialWishlisted={wishlistedIds.includes(p.id)}
              compact
              className="absolute start-3 top-3 z-20 bg-pearl-100/90 backdrop-blur-md"
            />
            <Link href={`/shop/${p.slug}`} className="block" draggable={false}>
              <div className="relative flex aspect-[10/9] items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100">
                {p.coverImage ? (
                  <img src={p.coverImage} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" draggable={false} />
                ) : (
                  <Package className="size-16 text-navy-700/30" strokeWidth={1.2} />
                )}
                {/* نشان ویژه و تخفیف */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    <Star className="size-3 fill-white" strokeWidth={1.5} />
                    ویژه
                  </span>
                  {p.hasDiscount && Number(p.discountValue) > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/90 backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                      {p.discountType === 'percent' ? `${p.discountValue}٪` : `${formatRial(p.discountValue || '0')} تخفیف`}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-sm font-bold leading-6 text-navy-900 transition-colors group-hover:text-petrol-700 line-clamp-2">
                  {p.title}
                </h3>
                {p.subtitle && (
                  <p className="mt-1 line-clamp-1 text-xs text-charcoal-500">{p.subtitle}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-navy-900">
                    از {formatRial(p.minPrice)}
                  </span>
                  <CardCartButton
                    slug={p.slug}
                    variantCount={p.variantCount}
                    variantId={p.variantId}
                  />
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {/* دکمه اسکرول راست */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center size-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-navy-900/10 text-navy-900 hover:bg-white transition-all opacity-0 group-hover/scroll:opacity-100"
          aria-label="اسکرول به راست"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}