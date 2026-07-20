"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { mockProducts } from "@/lib/mock-products";
import { useWishlist } from "@/lib/wishlist-context";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

export default function WishlistPage() {
  const { productIds, removeFromWishlist, clearWishlist } = useWishlist();
  const products = mockProducts.filter((product) =>
    productIds.includes(product.id),
  );

  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            Saved Items
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-neutral">
            Wishlist
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral/60">
            Keep track of the styles you love and move them into cart whenever
            you are ready to buy.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-neutral/10 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart size={28} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-neutral">
              Your wishlist is empty
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral/60">
              Save products you like so you can come back to them later without
              signing in.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="grid gap-4 rounded-3xl border border-neutral/10 bg-white p-4 shadow-sm sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-32 w-32 rounded-2xl object-cover"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">
                      {product.category.replace("-", " ")}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-bold text-neutral">
                      {product.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-neutral/60">
                      {product.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral/70">
                      <span className="font-semibold text-primary">
                        £{product.price_gbp}
                      </span>
                      <span>{product.stock_qty} in stock</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
                    <button
                      onClick={() => removeFromWishlist(product.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral/15 px-4 py-2 text-sm text-neutral hover:border-primary hover:text-primary transition"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                    <Link
                      href={`/product/${product.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-opacity-90"
                    >
                      <ShoppingBag size={16} />
                      View Product
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-3xl border border-neutral/10 bg-[#fafafa] p-6 sticky top-28">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral/50">
                Wishlist Summary
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-neutral">
                {products.length} items saved
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral/60">
                Guests can save items without account creation. Use this list to
                plan checkout later.
              </p>
              <button
                onClick={clearWishlist}
                className="mt-6 w-full rounded-md border border-neutral/15 px-4 py-3 text-sm font-semibold text-neutral hover:bg-white transition"
              >
                Clear Wishlist
              </button>
            </aside>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
