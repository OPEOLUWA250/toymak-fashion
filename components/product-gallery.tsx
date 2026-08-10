"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-4">
      <div className="relative bg-[#f7f3f6] rounded-2xl overflow-hidden min-h-[28rem] md:min-h-[40rem] flex items-center justify-center">
        <img
          src={images[activeIndex]}
          alt={alt}
          className="w-full h-full object-cover"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
          {badge}
        </div>
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
                "bg-[#f7f3f6] rounded-xl overflow-hidden h-36 md:h-44 ring-2 transition",
                activeIndex === index ? "ring-primary" : "ring-transparent hover:ring-primary/30",
              )}
            >
              <img
                src={image}
                alt={`${alt} view ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
