"use client";

import { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { ScrollCarousel } from "@/components/scroll-carousel";

export function TrendingCarousel({ products }: { products: Product[] }) {
  return (
    <ScrollCarousel>
      {products.map((product) => (
        <div key={product.id} className="w-64 shrink-0 snap-start sm:w-72">
          <ProductCard product={product} />
        </div>
      ))}
    </ScrollCarousel>
  );
}
