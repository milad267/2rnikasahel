"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

type BlogPost = {
  id: number; title: string; slug: string; excerpt: string | null;
  featuredImage: string | null; publishedAt: Date | string | null;
  views: number; categoryName: string | null;
};

export function MobileBlogCarousel({ posts }: { posts: BlogPost[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const dragDistance = useRef(0);
  const isDragging = useRef(false);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(posts.length / itemsPerPage);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const pageWidth = el.querySelector("div")?.clientWidth || 1;
    setCurrentPage(Math.round(el.scrollLeft / (pageWidth + 16)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDragging.current = false;
    dragDistance.current = 0;
    dragStartX.current = e.pageX;
    dragStartScroll.current = carouselRef.current.scrollLeft;
    carouselRef.current.style.scrollBehavior = "auto";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    const dx = e.pageX - dragStartX.current;
    if (Math.abs(dx) > 5) isDragging.current = true;
    if (Math.abs(dx) > 2) {
      dragDistance.current = Math.abs(dx);
      carouselRef.current.scrollLeft = dragStartScroll.current - dx;
    }
  };

  const handleMouseUp = () => {
    if (!carouselRef.current) return;
    carouselRef.current.style.scrollBehavior = "smooth";
    handleScroll();
    setTimeout(() => { dragDistance.current = 0; isDragging.current = false; }, 0);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragDistance.current > 8) {
      e.stopPropagation();
      e.preventDefault();
    }
    dragDistance.current = 0;
  };

  const goToPage = (page: number) => {
    if (!carouselRef.current) return;
    const pageWidth = carouselRef.current.querySelector("div")?.clientWidth || 1;
    carouselRef.current.scrollTo({ left: page * (pageWidth + 16), behavior: "smooth" });
    setCurrentPage(page);
  };

  if (posts.length === 0) return null;

  return (
    <div className="sm:hidden">
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleClickCapture}
        className="overflow-x-auto scroll-smooth no-scrollbar -mx-4 px-4 select-none"
      >
        <div className="flex gap-4" style={{ width: `${totalPages * 85}vw` }}>
          {Array.from({ length: totalPages }).map((_, pageIndex) => (
            <div key={pageIndex} className="grid w-[82vw] shrink-0 grid-cols-2 gap-3">
              {posts.slice(pageIndex * itemsPerPage, pageIndex * itemsPerPage + itemsPerPage).map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}
                  className="card group overflow-hidden rounded-[1.25rem] transition-all hover:shadow-lg flex flex-col" draggable={false}>
                  <div className="aspect-video bg-gradient-to-br from-navy-900/5 to-petrol-100">
                    {post.featuredImage ? (
                      <img src={post.featuredImage} alt={post.title} className="size-full object-cover" draggable={false} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-navy-700/30 text-base">📄</div>
                    )}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      {post.categoryName && (
                        <span className="rounded-full bg-petrol-600/10 px-1.5 py-0.5 text-[8px] font-medium text-petrol-700">{post.categoryName}</span>
                      )}
                      <h2 className="mt-1 text-[11px] font-bold leading-4 text-navy-900 group-hover:text-petrol-700 line-clamp-2">{post.title}</h2>
                      {post.excerpt && <p className="mt-0.5 text-[9px] text-charcoal-500 line-clamp-2">{post.excerpt}</p>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[8px] text-charcoal-500">
                      <span className="flex items-center gap-1"><Eye className="size-2.5" />{post.views}</span>
                      <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("fa-IR") : ""}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => goToPage(i)} aria-label={`صفحه ${i + 1} مقاله‌ها`}
              className={`size-1.5 rounded-full transition-all ${i === currentPage ? "bg-petrol-600 scale-125" : "bg-navy-900/20 hover:bg-navy-900/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
