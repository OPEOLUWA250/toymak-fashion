"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useProducts } from "@/lib/use-products";
import type { OrderItem, Product } from "@/lib/types";

const PICK_COUNT = 4;

/**
 * In-stock products the customer didn't just buy: bestsellers first, then one
 * per category so the four aren't all the same kind of thing, topped up from
 * whatever is left.
 */
export function pickRecommendations(products: Product[], bought: Pick<OrderItem, "product_id">[]): Product[] {
  const boughtIds = new Set(bought.map((item) => item.product_id));
  const candidates = products
    .filter((product) => product.stock_qty > 0 && !boughtIds.has(product.id))
    .sort((a, b) => Number(b.featured) - Number(a.featured));

  const picks: Product[] = [];
  const categories = new Set<string>();
  for (const product of candidates) {
    if (picks.length === PICK_COUNT) break;
    if (categories.has(product.category)) continue;
    categories.add(product.category);
    picks.push(product);
  }
  for (const product of candidates) {
    if (picks.length === PICK_COUNT) break;
    if (!picks.includes(product)) picks.push(product);
  }
  return picks;
}

export function useOrderRecommendations(bought: Pick<OrderItem, "product_id">[]) {
  const { products, isLoading } = useProducts();
  return { picks: pickRecommendations(products, bought), isLoading };
}

export function OrderRecommendations({ picks, isLoading }: { picks: Product[]; isLoading: boolean }) {
  return (
    <aside className="rounded-3xl bg-[#fafafa] p-5 sm:p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral/50">Before you go</p>
          <h2 className="mt-1.5 text-2xl font-bold text-neutral">You might also like</h2>
        </div>
        <Link
          href="/shop"
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-neutral underline-offset-4 hover:text-primary hover:underline sm:inline-flex"
        >
          Shop all <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5">
        {isLoading && picks.length === 0
          ? Array.from({ length: PICK_COUNT }, (_, index) => (
              <div key={index} aria-hidden>
                <div className="aspect-[4/5] animate-pulse rounded-2xl bg-neutral/5" />
                <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-neutral/5" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-neutral/5" />
              </div>
            ))
          : picks.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>

      <Link
        href="/shop"
        className="mt-8 flex items-center justify-center gap-1.5 rounded-md bg-neutral px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
      >
        Shop all products <ArrowRight size={15} />
      </Link>
    </aside>
  );
}
