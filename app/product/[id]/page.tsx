import { siteUrl } from "@/lib/site-url";
import { siteName } from "@/lib/site-info";
import { ProductCard } from "@/components/product-card";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { ShopLink } from "@/components/shop-link";
import { getAllProducts } from "@/lib/server/products";
import { getApprovedReviewsForProduct } from "@/lib/server/reviews";
import { findProductBySlug, productPath, productSlug } from "@/lib/product-url";
import { absoluteUrl, jsonLd, metaDescription, pageMetadata, plainText } from "@/lib/seo";
import { CATEGORY_LABELS } from "@/lib/shop-navigation";
import type { Product, Review } from "@/lib/types";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import ProductClient from "./product-client";
import { ProductGallery } from "@/components/product-gallery";
import { ProductReviews } from "@/components/product-reviews";
import { RecentlyViewed } from "@/components/recently-viewed";
import type { Metadata } from "next";

// Same reasoning as app/page.tsx — without this, price/stock/description
// edits made in the admin dashboard wouldn't show up on the live product
// page until the next deploy.
export const revalidate = 60;

// One catalog read per request, shared by generateMetadata and the page.
const loadCatalog = cache(() => getAllProducts());

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({
    id: productSlug(product),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = findProductBySlug(await loadCatalog(), id);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return pageMetadata({
    title: product.name,
    description: metaDescription(product.longDescription?.trim() || product.description?.trim() ||
      `Shop ${product.name} at Toymak Fashion. Explore product details, available options, and delivery information.`),
    path: productPath(product),
    images: product.images.slice(0, 4).map((src) => ({ url: absoluteUrl(src), alt: product.name })),
  });
}

function productJsonLd(product: Product, reviews: Review[], average: number) {
  const url = siteUrl + productPath(product);
  const category = CATEGORY_LABELS[product.category] ?? "Shop";
  const onSale = product.compare_at_price_gbp !== undefined && product.compare_at_price_gbp > product.price_gbp;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description: plainText(product.description || product.longDescription || product.name).slice(0, 5000),
        image: product.images.map(absoluteUrl),
        url,
        sku: product.sku || undefined,
        category,
        color: product.colors.length ? product.colors.map((c) => c.name).join(", ") : undefined,
        brand: { "@type": "Brand", name: siteName },
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "GBP",
          price: product.price_gbp.toFixed(2),
          availability: product.stock_qty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: siteName, url: siteUrl },
          // The returns page covers full-price items only.
          ...(onSale ? {} : {
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "GB",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 30,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: "https://schema.org/FreeReturn",
            },
          }),
        },
        ...(reviews.length ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: average, reviewCount: reviews.length, bestRating: 5 },
          review: reviews.slice(0, 5).map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.customer_name },
            datePublished: new Date(review.created_at).toISOString().slice(0, 10),
            reviewBody: review.comment,
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
          })),
        } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Shop", item: siteUrl },
          { "@type": "ListItem", position: 2, name: category, item: `${siteUrl}/?category=${product.category}` },
          { "@type": "ListItem", position: 3, name: product.name, item: url },
        ],
      },
    ],
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const allProducts = await loadCatalog();
  const product = findProductBySlug(allProducts, id);

  if (!product) {
    notFound();
  }

  // Bare ids (older links and emails) and pre-rename slugs move to the
  // current URL so search engines index one address per product.
  if (id !== productSlug(product)) {
    permanentRedirect(productPath(product));
  }

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(product, reviews, average)) }} />
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-neutral/50 mb-6 md:mb-8">
          <Link href="/" className="hover:text-primary transition">
            Shop
          </Link>
          {CATEGORY_LABELS[product.category] && (
            <>
              <span className="mx-2">/</span>
              <ShopLink params={{ category: product.category }} className="hover:text-primary transition">
                {CATEGORY_LABELS[product.category]}
              </ShopLink>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-neutral" aria-current="page">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[2fr_3fr] gap-10 xl:gap-16 items-start">
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
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
