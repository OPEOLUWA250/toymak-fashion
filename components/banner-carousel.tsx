"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Banner {
  src: string;
  alt: string;
  href: string;
}

/**
 * Promo banners with their headline and button printed into the artwork, so
 * every slide keeps the artwork's own aspect ratio (nothing is ever cropped)
 * and the whole slide is the link. Swipes on touch, auto-advances otherwise.
 */
export function BannerCarousel({
  banners,
  width,
  height,
  intervalMs = 6000,
}: {
  banners: Banner[];
  width: number;
  height: number;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touch = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  // Set when a gesture was a swipe, so the click that follows it is ignored.
  const swiped = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = banners.length;

  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Always auto-advances (pausing while hovered, focused or touched); with
  // reduced motion the slides switch instantly instead of sliding.
  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [paused, count, intervalMs, index]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null };
    swiped.current = false;
    setPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touch.current;
    if (!start) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    // Decide once per gesture whether this is a swipe or a page scroll.
    if (start.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) {
      start.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (start.horizontal) setDragOffset(dx);
  };

  const handleTouchEnd = () => {
    const width = trackRef.current?.offsetWidth ?? 1;
    if (Math.abs(dragOffset) > Math.min(60, width * 0.15)) {
      goTo(index + (dragOffset < 0 ? 1 : -1));
    }
    swiped.current = Boolean(touch.current?.horizontal);
    touch.current = null;
    setDragOffset(0);
    setPaused(false);
  };

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="group relative w-full overflow-hidden bg-primary-light"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Only keyboard focus pauses; a tapped dot keeps focus and would
      // otherwise stop autoplay for good on phones.
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setPaused(true);
      }}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="relative w-full touch-pan-y select-none"
        style={{ aspectRatio: `${width} / ${height}` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className={cn(
            "flex h-full",
            dragOffset === 0 && !reduceMotion && "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
          style={{ transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))` }}
        >
          {banners.map((banner, i) => (
            <a
              key={banner.src}
              href={banner.href}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${banner.alt}`}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              draggable={false}
              onClick={(e) => {
                // A swipe that ends over the slide shouldn't count as a tap.
                if (swiped.current) e.preventDefault();
              }}
              className="relative block h-full w-full shrink-0"
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                priority={i === 0}
                quality={90}
                sizes="(max-width: 1280px) 100vw, 1280px"
                draggable={false}
                className="object-contain"
              />
            </a>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-primary shadow-md backdrop-blur transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-primary shadow-md backdrop-blur transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5 sm:bottom-4 sm:gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                className="flex h-6 items-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    i === index ? "w-6 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/50",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
