import Header from "@/components/header";
import Footer from "@/components/footer";
import { mockProducts } from "@/lib/mock-products";
import { mockReviews } from "@/lib/mock-reviews";
import { getProductRating } from "@/lib/mock-reviews";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductClient from "./product-client";
import { ProductGallery } from "@/components/product-gallery";
import { Star } from "lucide-react";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return mockProducts.map((product) => ({
    id: product.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: `${product.name} | Toymak Fashion`,
    description: product.longDescription ?? product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = mockProducts.find((p) => p.id === id);
  const relatedProducts = product
    ? mockProducts
        .filter((p) => p.category === product.category && p.id !== product.id)
        .slice(0, 4)
    : [];

  if (!product) {
    notFound();
  }

  const reviews = mockReviews
    .filter((review) => review.product_id === product.id && review.approved)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  const { average, count } = getProductRating(product.id);

  return (
    <main className="bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <nav className="text-sm text-neutral/50 mb-6 md:mb-8">
          <Link href="/" className="hover:text-primary transition">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-primary transition">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neutral">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 xl:gap-16 items-start">
          <ProductGallery
            images={product.images}
            alt={product.name}
            badge={product.featured ? "Best Seller" : "New Arrival"}
          />

          <ProductClient product={product} />
        </div>

        {/* Reviews */}
        <section id="reviews" className="mt-20 pt-20 border-t">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-neutral">Customer Reviews</h2>
              {count > 0 ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-neutral/60">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={
                          i < Math.round(average)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-neutral/10 text-neutral/10"
                        }
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-neutral">{average}</span>
                  <span>
                    out of 5 · {count} review{count === 1 ? "" : "s"}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral/60">No reviews yet for this product.</p>
              )}
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-neutral/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-neutral/10 text-neutral/10"
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral/75">{review.comment}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-neutral/10 pt-3">
                    <span className="text-sm font-semibold text-neutral">
                      {review.customer_name}
                    </span>
                    <span className="text-xs text-neutral/45">
                      {review.created_at.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-20 border-t">
            <h2 className="text-3xl font-bold text-neutral mb-8">
              You May Also Like
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/product/${related.id}`}
                  className="group"
                >
                  <div className="bg-tertiary/50 rounded-lg overflow-hidden mb-4 h-64">
                    <img
                      src={related.images[0]}
                      alt={related.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition"
                    />
                  </div>
                  <h3 className="font-bold text-neutral group-hover:text-primary transition">
                    {related.name}
                  </h3>
                  <p className="text-sm text-neutral/60 mb-2">
                    {related.description}
                  </p>
                  <span className="text-primary font-bold">
                    £{related.price_gbp}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
