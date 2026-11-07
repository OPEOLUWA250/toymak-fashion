import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/pricing";
import type { Currency } from "@/lib/types";
import { priceParts, salePercent } from "@/lib/sale-price";

const SIZES = {
  // Product page.
  lg: { percent: "text-4xl md:text-5xl", symbol: "text-xl md:text-2xl", whole: "text-4xl md:text-5xl", fraction: "text-xl md:text-2xl", was: "text-lg md:text-xl", gap: "gap-x-3" },
  // Shop cards.
  sm: { percent: "text-base sm:text-lg", symbol: "text-xs sm:text-sm", whole: "text-base sm:text-lg", fraction: "text-xs sm:text-sm", was: "text-xs sm:text-sm", gap: "gap-x-1.5" },
};

/**
 * "-12% £15.00 £17.00": the saving first, the price with smaller pence, then the
 * old price crossed out. Without a sale it's just the price.
 */
export function SalePrice({ price, compareAt, currency, size = "sm", className }: { price: number; compareAt?: number; currency: Currency; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  const percent = compareAt === undefined ? 0 : salePercent(compareAt, price);
  const { symbol, whole, fraction } = priceParts(price, currency);
  const label = percent ? `${formatCurrency(price, currency)}, was ${formatCurrency(compareAt!, currency)}, ${percent}% off` : formatCurrency(price, currency);

  return (
    <p className={cn("flex flex-wrap items-baseline gap-y-1 leading-none", s.gap, className)} aria-label={label}>
      {percent > 0 && <span aria-hidden className={cn("font-light tracking-tight text-[#E11D48]", s.percent)}>-{percent}%</span>}
      <span aria-hidden className="font-bold text-neutral">
        <span className={s.symbol}>{symbol}</span>
        <span className={cn("tracking-tight", s.whole)}>{whole}</span>
        <span className={s.fraction}>.{fraction}</span>
      </span>
      {percent > 0 && <span aria-hidden className={cn("text-neutral/45 line-through", s.was)}>{formatCurrency(compareAt!, currency)}</span>}
    </p>
  );
}
