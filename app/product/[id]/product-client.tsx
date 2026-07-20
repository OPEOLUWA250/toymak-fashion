"use client";

import { useCart } from "@/lib/cart-context";
import { useState } from "react";
import { Heart, Share2, ChevronDown } from "lucide-react";
import { Product } from "@/lib/types";
import { useWishlist } from "@/lib/wishlist-context";

export default function ProductClient({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(
    product.colors[0]?.name || "",
  );
  const [quantity, setQuantity] = useState(1);
  const [showFitFinder, setShowFitFinder] = useState(false);
  const [fitFinderStep, setFitFinderStep] = useState(0);
  const [suggestedSize, setSuggestedSize] = useState<string | null>(null);
  const wishlistActive = isInWishlist(product.id);

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }
    addItem({
      product_id: product.id,
      product_name: product.name,
      quantity,
      size: selectedSize,
      color: selectedColor,
      price_at_addition: product.price_gbp,
      image_url: product.images[0],
    });
    alert("Added to cart!");
  };

  const handleFitFinderComplete = (size: string) => {
    setSuggestedSize(size);
    setShowFitFinder(false);
    setFitFinderStep(0);
    setSelectedSize(size);
  };

  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-primary font-semibold mb-3">
          {product.category.replace("-", " ")}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-neutral leading-tight mb-3">
          {product.name}
        </h1>
        <div className="flex items-center gap-4 mb-5">
          <span className="font-serif text-3xl md:text-4xl text-primary font-bold">
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
        <div className="flex gap-1 text-yellow-400" aria-label="5 star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star}>★</span>
          ))}
        </div>
        <span>Premium fit and all-day comfort</span>
      </div>

      {!showFitFinder && (
        <button
          onClick={() => setShowFitFinder(true)}
          className="text-sm text-primary underline underline-offset-4 hover:opacity-80"
        >
          {suggestedSize
            ? `Size ${suggestedSize} recommended`
            : "Need help finding your fit?"}
        </button>
      )}

      {showFitFinder && (
        <div className="bg-[#fbf6f9] border border-primary/10 p-5 rounded-2xl space-y-4">
          {fitFinderStep === 0 && (
            <>
              <h3 className="font-medium text-neutral">
                What&apos;s your body type?
              </h3>
              <div className="grid gap-2">
                {["Pear Shaped", "Apple Shaped", "Hourglass"].map(
                  (bodyType) => (
                    <button
                      key={bodyType}
                      onClick={() => setFitFinderStep(1)}
                      className="w-full py-2.5 px-4 border border-neutral/15 text-neutral rounded-lg hover:bg-white transition text-sm"
                    >
                      {bodyType}
                    </button>
                  ),
                )}
              </div>
            </>
          )}
          {fitFinderStep === 1 && (
            <>
              <h3 className="font-medium text-neutral">
                Select your usual size
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFitFinderComplete(size)}
                    className="py-2.5 px-3 border border-neutral/15 text-neutral rounded-lg hover:bg-primary hover:text-white hover:border-primary transition text-sm"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold tracking-[0.16em] uppercase text-neutral">
            Select size
          </label>
          <a
            href="#size-guide"
            className="text-xs text-primary underline underline-offset-4"
          >
            Size Guide
          </a>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {product.sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
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
      </div>

      <button
        onClick={handleAddToCart}
        className="w-full rounded-md bg-[#a80ea5] py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-[#a80ea5]/20 transition hover:opacity-90"
      >
        Add to Bag
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() =>
            wishlistActive
              ? removeFromWishlist(product.id)
              : addToWishlist(product.id)
          }
          className={`flex items-center justify-center gap-2 rounded-md border py-3 text-sm transition ${
            wishlistActive
              ? "border-primary bg-primary/5 text-primary"
              : "border-neutral/15 text-neutral hover:bg-neutral/5"
          }`}
        >
          <Heart size={18} />
          {wishlistActive ? "Saved" : "Wishlist"}
        </button>
        <button className="flex items-center justify-center gap-2 rounded-md border border-neutral/15 py-3 text-sm text-neutral hover:bg-neutral/5 transition">
          <Share2 size={18} />
          Share
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

        <details
          id="size-guide"
          className="group rounded-xl border border-neutral/10 bg-white px-4 py-3"
        >
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

      <div className="rounded-2xl bg-[#fbf6f9] p-4 text-sm text-neutral/70">
        <p className="font-semibold text-neutral mb-1">Need help choosing?</p>
        <p>
          Use the fit finder above or message us for sizing advice before you
          place your order.
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm text-neutral/60">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        {product.stock_qty > 0
          ? `${product.stock_qty} in stock`
          : "Out of stock"}
      </div>
    </div>
  );
}
