"use client";

import { StoreImage } from "@/components/store-image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Shared by the mobile carousel's first slide and the desktop main image, so
// the browser picks the same file for both and only downloads it once.
const MAIN_IMAGE_SIZES = "(max-width: 1024px) 100vw, 50vw";

export function ProductGallery({
  images,
  alt,
  badge,
}: {
  images: string[];
  alt: string;
  badge: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      {/* Phones and tablets: swipeable carousel */}
      <MobileCarousel images={images} alt={alt} badge={badge} />

      {/* Desktop: main image with clickable thumbnails */}
      <div className="hidden space-y-4 lg:block">
        <div className="product-photo relative bg-tertiary/40 rounded-2xl overflow-hidden min-h-[40rem] flex items-center justify-center">
          <StoreImage sizes={MAIN_IMAGE_SIZES}
            fill
            loading="eager"
            fetchPriority="high"
            src={images[activeIndex]}
            alt={alt}
            className="w-full h-full object-cover"
          />
          <Badge label={badge} />
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image, index) => (
              <button
                key={image + index}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} of ${alt}`}
                aria-current={activeIndex === index}
                className={cn(
                  "product-photo bg-tertiary/40 rounded-xl overflow-hidden h-44 ring-2 transition",
                  activeIndex === index ? "ring-primary" : "ring-transparent hover:ring-primary/30",
                )}
              >
                <StoreImage sizes="25vw"
                  src={image}
                  alt={`${alt} view ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
      {label}
    </div>
  );
}

/** Native scroll-snap, so swiping has the phone's own momentum and feel. */
function MobileCarousel({ images, alt, badge }: { images: string[]; alt: string; badge: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handleScroll = () => {
      const next = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      setIndex(Math.min(Math.max(next, 0), images.length - 1));
    };
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [images.length]);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="-mx-4 sm:mx-0 lg:hidden" aria-roledescription="carousel" aria-label={`${alt} photos`}>
      <div className="relative">
        <div
          ref={trackRef}
          className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:rounded-2xl"
        >
          {(images.length ? images : [""]).map((image, i) => (
            <div
              key={image + i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${images.length}`}
              className="product-photo relative aspect-[4/5] w-full shrink-0 snap-center snap-always bg-tertiary/40"
            >
              <StoreImage
                fill
                sizes={MAIN_IMAGE_SIZES}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                src={image || undefined}
                alt={i === 0 ? alt : `${alt} view ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        <Badge label={badge} />

        {images.length > 1 && (
          <span className="absolute right-4 top-4 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {images.map((image, i) => (
            <button
              key={image + i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className="flex h-6 items-center px-0.5"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-primary/20",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
