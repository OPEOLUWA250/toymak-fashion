"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/types";
import { useWishlist } from "@/lib/wishlist-context";
import { getProductRating } from "@/lib/mock-reviews";

export function ProductCard({ product }: { product: Product }) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const { average, count } = getProductRating(product.id);

  const outOfStock = product.stock_qty <= 0;
  const lowStock = !outOfStock && product.stock_qty <= product.low_stock_threshold;
  const secondaryImage = product.images[1];

  const onSale =
    product.compare_at_price_gbp !== undefined &&
    product.compare_at_price_gbp > product.price_gbp;
  const discountPercent = onSale
    ? Math.round(
        ((product.compare_at_price_gbp! - product.price_gbp) /
          product.compare_at_price_gbp!) *
          100,
      )
    : 0;

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-2xl bg-tertiary/40">
        <img
          src={product.images[0]}
          alt={product.name}
          className={cn(
            "h-full w-full object-cover transition duration-500 group-hover:scale-105",
            secondaryImage && "group-hover:opacity-0",
          )}
        />
        {secondaryImage && (
          <img
            src={secondaryImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {onSale && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              -{discountPercent}%
            </span>
          )}
          {product.featured && (
            <span className="rounded-full bg-neutral px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              Bestseller
            </span>
          )}
          {lowStock && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              Only {product.stock_qty} left
            </span>
          )}
          {outOfStock && (
            <span className="rounded-full bg-neutral-400 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              Sold Out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral shadow-sm backdrop-blur transition hover:text-primary"
        >
          <Heart size={16} className={isWishlisted ? "fill-primary text-primary" : ""} />
        </button>

        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="block rounded-xl bg-white/95 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-neutral shadow-sm backdrop-blur">
            View Product
          </span>
        </div>
      </div>

      <h3 className="text-base font-bold text-neutral transition group-hover:text-primary">
        {product.name}
      </h3>
      <p className="mt-1 line-clamp-1 text-sm text-neutral/55">{product.description}</p>

      {count > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral/55">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <span className="font-medium text-neutral">{average}</span>
          <span>({count})</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-primary">
            £{product.price_gbp.toFixed(2)}
          </span>
          {onSale && (
            <span className="text-sm text-neutral/40 line-through">
              £{product.compare_at_price_gbp!.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {product.colors.slice(0, 4).map((color) => (
            <span
              key={color.name}
              className="h-3.5 w-3.5 rounded-full border border-neutral/20"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
          {product.colors.length > 4 && (
            <span className="text-[11px] text-neutral/40">+{product.colors.length - 4}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
