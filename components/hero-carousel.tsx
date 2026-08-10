"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  images: { src: string; alt: string }[];
  intervalMs?: number;
  scrollTargetId?: string;
}

export function HeroCarousel({
  images,
  intervalMs = 5500,
  scrollTargetId,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (paused || images.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [paused, images.length, intervalMs]);

  const goTo = (i: number) => setIndex((i + images.length) % images.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      delta > 0 ? prev() : next();
    }
    touchStartX.current = null;
  };

  const scrollToContent = () => {
    if (!scrollTargetId) return;
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="group relative h-[100dvh] w-full overflow-hidden bg-neutral"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {images.map((image, i) => (
        <img
          key={image.src}
          src={image.src}
          alt={image.alt}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "auto"}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      <div className="absolute inset-0 bg-black/10" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white opacity-0 backdrop-blur transition duration-300 hover:bg-white/25 group-hover:opacity-100 md:flex"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white opacity-0 backdrop-blur transition duration-300 hover:bg-white/25 group-hover:opacity-100 md:flex"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute inset-x-0 bottom-9 flex items-center justify-center gap-2">
            {images.map((image, i) => (
              <button
                key={image.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75",
                )}
              />
            ))}
          </div>
        </>
      )}

      {scrollTargetId && (
        <button
          type="button"
          onClick={scrollToContent}
          aria-label="Scroll to content"
          className="absolute inset-x-0 bottom-2 mx-auto flex w-fit animate-bounce text-white/80 transition hover:text-white motion-reduce:animate-none"
        >
          <ChevronDown size={22} />
        </button>
      )}
    </div>
  );
}
