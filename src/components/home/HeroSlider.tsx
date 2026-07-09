"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

type Slide = {
  id: number;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  desktopImage: string | null;
  mobileImage: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  buttonColor: string | null;
  openInNewTab: boolean;
};

export function HeroSlider({ slides }: { slides: Slide[] }) {
  if (!slides.length) return null;

  return (
    <Swiper
      modules={[Navigation, Pagination, Autoplay, EffectFade]}
      spaceBetween={0}
      slidesPerView={1}
      navigation
      pagination={{ clickable: true }}
      autoplay={{ delay: 5000, disableOnInteraction: false }}
      effect="fade"
      loop
      dir="rtl"
      className="hero-swiper h-[400px] sm:h-[500px] rounded-2xl overflow-hidden"
    >
      {slides.map(slide => (
        <SwiperSlide key={slide.id}>
          <div className="relative w-full h-full">
            {/* تصویر */}
            {slide.desktopImage && (
              <img src={slide.desktopImage} alt={slide.title || ""} className="hidden sm:block size-full object-cover" />
            )}
            {slide.mobileImage && (
              <img src={slide.mobileImage} alt={slide.title || ""} className="sm:hidden size-full object-cover" />
            )}
            {!slide.desktopImage && !slide.mobileImage && (
              <div className="size-full bg-gradient-to-br from-navy-900 to-petrol-800" />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 to-transparent" />
            {/* محتوا */}
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto max-w-[96rem] px-6 w-full">
                <div className="max-w-xl text-white">
                  {slide.title && <h2 className="text-3xl sm:text-5xl font-bold mb-3">{slide.title}</h2>}
                  {slide.subtitle && <p className="text-lg sm:text-xl mb-2 opacity-90">{slide.subtitle}</p>}
                  {slide.description && <p className="text-sm sm:text-base mb-6 opacity-80 leading-6">{slide.description}</p>}
                  {slide.buttonText && (
                    <a href={slide.buttonLink || "#"} target={slide.openInNewTab ? "_blank" : "_self"}
                      className="inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-navy-900 shadow-lg transition-all hover:bg-petrol-600 hover:text-white"
                      style={slide.buttonColor ? { backgroundColor: slide.buttonColor } : {}}
                    >
                      {slide.buttonText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
