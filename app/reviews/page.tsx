import Header from "@/components/header";
import Footer from "@/components/footer";
import { ShopReviews } from "@/components/shop-reviews";
import { getAllApprovedReviews } from "@/lib/server/reviews";
import { pageMetadata } from "@/lib/seo";

// Hourly, and at once when an admin approves or deletes a review (see adminRoute).
export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Customer Reviews",
  description:
    "Read what Toymak Fashion customers say about our shapewear, waist trainers and bodysuits, from our website and TikTok Shop, and leave your own review.",
  path: "/reviews",
});

export default async function ReviewsPage() {
  const reviews = await getAllApprovedReviews();

  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-neutral md:text-5xl">Customer Reviews</h1>
          <p className="mx-auto mt-4 max-w-lg text-neutral/60">
            What our customers say about shopping with Toymak, here and on our TikTok Shop.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ShopReviews reviews={reviews} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
