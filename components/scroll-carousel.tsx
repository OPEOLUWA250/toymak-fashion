"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollCarousel({
  children,
  autoScrollMs = 2600,
  pingPong = false,
}: {
  children: React.ReactNode;
  autoScrollMs?: number;
  /** Auto-scroll smoothly back and forth instead of jumping to the start at the end. */
  pingPong?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionRef = useRef<1 | -1>(1);
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

  // Continuous, frame-by-frame glide back and forth — no stepping or pausing between hops.
  useEffect(() => {
    if (!pingPong || paused) return;
    const el = scrollRef.current;
    if (!el) return;

    const pxPerSecond = 50;
    let frameId: number;
    let lastTime: number | null = null;

    const step = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const max = el.scrollWidth - el.clientWidth;
      if (max > 0) {
        let next = el.scrollLeft + directionRef.current * pxPerSecond * dt;
        if (next >= max) {
          next = max;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        el.scrollLeft = next;
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [pingPong, paused]);

  // Discrete step-and-pause auto-scroll for the non-pingPong carousels.
  useEffect(() => {
    if (pingPong || paused) return;
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
  }, [pingPong, paused, autoScrollMs]);

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
        className={cn(
          "flex gap-6 overflow-x-auto pb-6 pt-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !pingPong && "scroll-smooth snap-x snap-mandatory",
        )}
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
