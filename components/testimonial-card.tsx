import { Quote, Star } from "lucide-react";

export interface TestimonialEntry {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  productName: string;
}

const avatarStyles = [
  "from-primary/25 to-primary/5 text-primary",
  "from-neutral/20 to-neutral/5 text-neutral",
  "from-secondary to-secondary/30 text-primary",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TestimonialCard({
  review,
  index = 0,
  className = "",
}: {
  review: TestimonialEntry;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={`group relative flex h-full flex-col rounded-3xl border border-neutral/8 bg-white p-7 pt-8 shadow-[0_20px_45px_-30px_rgba(43,43,43,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-25px_rgba(230,0,229,0.3)] ${className}`}
    >
      <span className="absolute -top-5 left-7 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-400 text-white shadow-lg shadow-primary/30">
        <Quote size={18} fill="currentColor" strokeWidth={0} />
      </span>

      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            className={i < review.rating ? "fill-primary text-primary" : "fill-neutral/10 text-neutral/10"}
          />
        ))}
      </div>

      <p className="mt-4 line-clamp-4 flex-1 text-[15px] italic leading-7 text-neutral/80">
        &ldquo;{review.comment}&rdquo;
      </p>

      <div className="mt-5 flex items-center gap-3 border-t border-neutral/8 pt-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold ring-2 ring-white shadow-sm ${avatarStyles[index % avatarStyles.length]}`}
        >
          {getInitials(review.customer_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-neutral">{review.customer_name}</p>
          <span className="mt-1 inline-block max-w-full truncate rounded-full bg-tertiary/70 px-2.5 py-0.5 text-[11px] font-medium text-neutral/60">
            {review.productName}
          </span>
        </div>
      </div>
    </div>
  );
}
