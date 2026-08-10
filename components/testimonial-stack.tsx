"use client";

import { useEffect, useRef, useState } from "react";
import { TestimonialCard, type TestimonialEntry } from "@/components/testimonial-card";

export function TestimonialStack({ testimonials }: { testimonials: TestimonialEntry[] }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActive((current) => (current + 1) % testimonials.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [testimonials.length]);

  const goTo = (index: number) => {
    setActive(index);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActive((current) => (current + 1) % testimonials.length);
    }, 4000);
  };

  return (
    <div>
      <div className="relative mx-auto h-[300px] max-w-sm">
        {testimonials.map((review, idx) => {
          const offset = (idx - active + testimonials.length) % testimonials.length;
          if (offset > 2) return null;

          return (
            <div
              key={review.id}
              className="absolute inset-x-0 top-4 bottom-0 transition-all duration-700 ease-out"
              style={{
                zIndex: testimonials.length - offset,
                transform: `translateY(${offset * 12}px) scale(${1 - offset * 0.05})`,
                opacity: offset === 0 ? 1 : offset === 1 ? 0.5 : 0.25,
              }}
            >
              <TestimonialCard review={review} index={idx} />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {testimonials.map((review, idx) => (
          <button
            key={review.id}
            type="button"
            aria-label={`Show testimonial ${idx + 1}`}
            onClick={() => goTo(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === active ? "w-6 bg-primary" : "w-1.5 bg-neutral/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
