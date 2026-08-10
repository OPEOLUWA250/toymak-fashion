"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ScrollCarousel({
  children,
  autoScrollMs = 2600,
}: {
  children: React.ReactNode;
  autoScrollMs?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);

  const scroll = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  const pause = () => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    setPaused(true);
  };

  const resumeSoon = () => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => setPaused(false), 1200);
  };

  useEffect(() => () => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
  }, []);

  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (!el) return;

    const id = setInterval(() => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 260, behavior: "smooth" });
      }
    }, autoScrollMs);

    return () => clearInterval(id);
  }, [paused, autoScrollMs]);

  return (
    <div
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={resumeSoon}
      onTouchStart={pause}
      onTouchEnd={resumeSoon}
    >
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-6 pt-7 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="absolute -left-4 top-[38%] hidden -translate-y-1/2 rounded-full border border-neutral/10 bg-white p-2.5 text-neutral shadow-lg transition hover:text-primary lg:flex"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="absolute -right-4 top-[38%] hidden -translate-y-1/2 rounded-full border border-neutral/10 bg-white p-2.5 text-neutral shadow-lg transition hover:text-primary lg:flex"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
