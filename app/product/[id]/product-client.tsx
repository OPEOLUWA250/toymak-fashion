"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useState } from "react";
import { Heart, Share2, ChevronDown, Star, Minus, Plus, Check } from "lucide-react";
import { Product } from "@/lib/types";
import { getProductRating } from "@/lib/mock-reviews";
import { FitFinder } from "@/components/fit-finder";
import { sizeChart, type SizeCategory } from "@/lib/size-guide-data";

function isSizeCategory(category: string): category is SizeCategory {
  return category in sizeChart;
}

export default function ProductClient({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { average, count } = getProductRating(product.id);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(
    product.colors[0]?.name || "",
  );
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const isWishlisted = isInWishlist(product.id);
  const sizeCategory = isSizeCategory(product.category) ? product.category : null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    addItem({
      product_id: product.id,
      product_name: product.name,
      quantity,
      size: selectedSize,
      color: selectedColor,
      price_at_addition: product.price_gbp,
      image_url: product.images[0],
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-primary font-semibold mb-3">
          {product.category.replace("-", " ")}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-neutral leading-tight mb-3">
          {product.name}
        </h1>
        <div className="flex items-center gap-4 mb-5">
          <span className="text-3xl md:text-4xl text-primary font-bold">
            £{product.price_gbp}
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {product.featured ? "Best Seller" : "New Arrival"}
          </span>
        </div>
        <p className="text-neutral/70 leading-relaxed max-w-xl">
          {product.description}
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm text-neutral/55">
        {count > 0 ? (
          <>
            <div className="flex gap-0.5" aria-label={`${average} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < Math.round(average) ? "fill-amber-400 text-amber-400" : "fill-neutral/10 text-neutral/10"}
                />
              ))}
            </div>
            <a href="#reviews" className="hover:text-primary transition">
              {average} ({count} review{count === 1 ? "" : "s"})
            </a>
          </>
        ) : (
          <span>No reviews yet — be the first to write one</span>
        )}
      </div>

      {sizeCategory && (
        <FitFinder category={sizeCategory} onRecommend={setSelectedSize} />
      )}

      {product.colors.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-semibold tracking-[0.16em] uppercase text-neutral">
            Color: <span className="font-normal normal-case text-neutral/60">{selectedColor}</span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => setSelectedColor(color.name)}
                aria-label={color.name}
                aria-pressed={selectedColor === color.name}
                title={color.name}
                className={`h-9 w-9 rounded-full ring-2 ring-offset-2 transition ${
                  selectedColor === color.name ? "ring-primary" : "ring-transparent hover:ring-neutral/20"
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold tracking-[0.16em] uppercase text-neutral">
            Select size
          </label>
          {sizeCategory && (
            <Link
              href={`/size-guide?category=${sizeCategory}#size-chart`}
              className="text-xs text-primary underline underline-offset-4"
            >
              Size Guide
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {product.sizes.map((size) => (
            <button
              key={size}
              onClick={() => {
                setSelectedSize(size);
                setSizeError(false);
              }}
              className={`py-3 px-3 border rounded-lg font-medium transition ${
                selectedSize === size
                  ? "border-primary bg-primary text-white"
                  : "border-neutral/15 text-neutral hover:border-primary"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        {sizeError && (
          <p className="mt-2 text-xs font-medium text-red-500">Please select a size</p>
        )}
      </div>

      <div>
        <label className="mb-3 block text-sm font-semibold tracking-[0.16em] uppercase text-neutral">
          Quantity
        </label>
        <div className="inline-flex items-center rounded-lg border border-neutral/15">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 items-center justify-center text-neutral transition hover:text-primary disabled:opacity-30"
            disabled={quantity <= 1}
          >
            <Minus size={16} />
          </button>
          <span className="w-10 text-center text-sm font-semibold text-neutral">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(product.stock_qty || 99, q + 1))}
            aria-label="Increase quantity"
            className="flex h-11 w-11 items-center justify-center text-neutral transition hover:text-primary"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={product.stock_qty <= 0}
        className="w-full rounded-md bg-primary py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {product.stock_qty <= 0 ? "Out of Stock" : justAdded ? "Added to Bag" : "Add to Bag"}
      </button>
      {justAdded && (
        <p className="-mt-3 flex items-center gap-1.5 text-sm font-medium text-primary" role="status">
          <Check size={15} />
          {quantity} × {product.name} added to your bag.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => (isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id))}
          className="flex items-center justify-center gap-2 rounded-md border border-neutral/15 py-3 text-sm text-neutral transition hover:bg-neutral/5"
        >
          <Heart size={18} className={isWishlisted ? "fill-primary text-primary" : ""} />
          {isWishlisted ? "Saved" : "Wishlist"}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 rounded-md border border-neutral/15 py-3 text-sm text-neutral transition hover:bg-neutral/5"
        >
          <Share2 size={18} />
          {shareCopied ? "Link copied!" : "Share"}
        </button>
      </div>

      <div className="border-t border-neutral/10 pt-4 space-y-3">
        <details
          open
          className="group rounded-xl border border-neutral/10 bg-white px-4 py-3"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-neutral">
            Product Details
            <ChevronDown
              size={16}
              className="transition group-open:rotate-180"
            />
          </summary>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-neutral/70">
            <li>
              Premium compression fabric for smooth shaping and a clean
              silhouette.
            </li>
            <li>Breathable, comfortable fit designed for everyday wear.</li>
            <li>
              Supportive structure that stays comfortable throughout the day.
            </li>
            <li>Available in multiple sizes and colors for a tailored fit.</li>
          </ul>
        </details>

        <details className="group rounded-xl border border-neutral/10 bg-white px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-neutral">
            Shipping & Returns
            <ChevronDown
              size={16}
              className="transition group-open:rotate-180"
            />
          </summary>
          <p className="mt-4 text-sm leading-6 text-neutral/70">
            Free shipping on orders over £50. Returns accepted within 30 days
            for unworn items in original condition.
          </p>
        </details>
      </div>

      <div className="flex items-center gap-3 text-sm text-neutral/60">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${product.stock_qty > 0 ? "bg-emerald-500" : "bg-neutral/30"}`}
        />
        {product.stock_qty > 0
          ? `${product.stock_qty} in stock`
          : "Out of stock"}
      </div>
    </div>
  );
}
