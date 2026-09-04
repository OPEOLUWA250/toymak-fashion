import Header from "@/components/header";
import Footer from "@/components/footer";
import { getAllProducts, getProductById } from "@/lib/server/products";
import { getApprovedReviewsForProduct } from "@/lib/server/reviews";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductClient from "./product-client";
import { ProductGallery } from "@/components/product-gallery";
import { ProductReviews } from "@/components/product-reviews";
import { RecentlyViewed } from "@/components/recently-viewed";
import type { Metadata } from "next";

// Same reasoning as app/page.tsx — without this, price/stock/description
// edits made in the admin dashboard wouldn't show up on the live product
// page until the next deploy.
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({
    id: product.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

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
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await getAllProducts();
  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const reviews = await getApprovedReviewsForProduct(product.id);
  const average =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
  const count = reviews.length;

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

          <ProductClient product={product} rating={{ average, count }} />
        </div>

        {/* Reviews */}
        <ProductReviews productId={product.id} initialReviews={reviews} />

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

        <RecentlyViewed excludeId={product.id} />
      </div>

      <Footer />
    </main>
  );
}
