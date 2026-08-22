import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { HeroCarousel } from "@/components/hero-carousel";
import { ScrollCarousel } from "@/components/scroll-carousel";
import { TestimonialStack } from "@/components/testimonial-stack";
import { TestimonialCard } from "@/components/testimonial-card";
import { ContactFaqSection } from "@/components/contact-faq-section";
import { FirstOrderPopup } from "@/components/first-order-popup";
import { ArrowRight, Play, Ruler } from "lucide-react";
import { mockProducts } from "@/lib/mock-products";
import { mockReviews } from "@/lib/mock-reviews";
import { faqSections } from "@/lib/faq-data";

const newestProducts = [...mockProducts].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
);
const newestFeature = newestProducts[0];
const newestGrid = newestProducts.slice(1, 3);

const heroSlides = [
  {
    src: "/shop-img/imgi_81_img_7941-1536x1536.jpg",
    alt: "Toymak shapewear, on model",
  },
  {
    src: "/shop-img/imgi_9_2-5.jpg",
    alt: "Toymak shapewear, on model",
  },
  {
    src: "/shop-img/imgi_24_img_8677-1.jpg",
    alt: "Toymak shapewear, on model",
  },
  {
    src: "/shop-img/imgi_85_img_7941.jpg",
    alt: "Toymak shapewear, on model",
  },
];

// Reuses existing on-model photography as stand-ins for Tops and Accessories
// until dedicated product photography for those categories is available.
const shopByCategory = [
  { label: "Shapewear", href: "/shop?category=shapewear", image: "/shop-img/imgi_10_fb_shp.png" },
  {
    label: "Waist Trainers",
    href: "/shop?category=waist-trainer",
    image: "/shop-img/imgi_13_waist_wrp.png",
  },
  { label: "Bras", href: "/shop?category=bra", image: "/shop-img/imgi_8_shaper.png" },
  { label: "Tops", href: "/shop?category=tops", image: "/shop-img/imgi_96_img_2830.jpg" },
  {
    label: "Accessories",
    href: "/shop?category=accessories",
    image: "/shop-img/imgi_14_nu_bella.png",
  },
];

const homepageFaqs = [
  faqSections[0].questions[0],
  faqSections[1].questions[0],
  faqSections[2].questions[0],
  faqSections[4].questions[0],
];

// Real guide videos aren't ready yet — shown as "Coming Soon" rather than
// faked, so nothing here claims to be playable that isn't.
const videoGuides = [
  {
    title: "How to Put On a Waist Trainer",
    blurb: "Getting the fit and compression right from the first wear.",
    image: "/shop-img/imgi_13_waist_wrp.png",
  },
  {
    title: "Finding Your Perfect Size",
    blurb: "A quick walkthrough of measuring bust, waist, and hips.",
    image: "/shop-img/imgi_9_2-5.jpg",
  },
  {
    title: "Care & Washing Guide",
    blurb: "Keep your shapewear firm and lasting longer.",
    image: "/shop-img/imgi_96_img_2830.jpg",
  },
  {
    title: "Styling Shapewear Under Outfits",
    blurb: "Seamless looks for dresses, trousers, and more.",
    image: "/shop-img/imgi_81_img_7941-1536x1536.jpg",
  },
];

// Highest-rated real review per product, so testimonials reflect actual
// stored review data rather than newly invented quotes.
const testimonialProductIds = ["prod-001", "prod-002", "prod-003", "prod-004", "prod-005", "prod-006"];
const testimonials = testimonialProductIds
  .map((productId) => {
    const product = mockProducts.find((p) => p.id === productId);
    const bestReview = [...mockReviews]
      .filter((review) => review.product_id === productId && review.approved)
      .sort((a, b) => b.rating - a.rating || b.created_at.getTime() - a.created_at.getTime())[0];
    if (!product || !bestReview) return null;
    return { ...bestReview, productName: product.name };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item));

export default function HomePage() {
  return (
    <main className="bg-white">
      <Header variant="transparent" />

      {/* Hero */}
      <HeroCarousel images={heroSlides} scrollTargetId="new-arrivals" />

      {/* New Arrivals */}
      <section id="new-arrivals" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Just Landed
              </p>
              <h2 className="text-3xl font-bold text-neutral md:text-4xl">New Arrivals</h2>
              <p className="mt-3 max-w-lg text-neutral/60">
                The latest additions to the collection, fresh off the production line.
              </p>
            </div>
            <Link
              href="/shop?sort=newest"
              className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-neutral transition hover:text-primary"
            >
              Shop New Arrivals
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid gap-px bg-neutral/10 lg:grid-cols-[1.3fr_1fr]">
            {/* Newest product, editorial feature tile */}
            <Link
              href={`/product/${newestFeature.id}`}
              className="group relative min-h-[460px] overflow-hidden bg-tertiary/40 lg:min-h-[600px]"
            >
              <img
                src={newestFeature.images[0]}
                alt={newestFeature.name}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute left-6 top-6 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                New
              </span>
              <div className="absolute inset-x-6 bottom-6">
                <h3 className="mb-1 text-2xl font-bold text-white">{newestFeature.name}</h3>
                <p className="mb-4 max-w-sm text-sm text-white/75">{newestFeature.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  £{newestFeature.price_gbp.toFixed(2)}
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            {/* Next newest, stacked in the same editorial treatment as the feature tile */}
            <div className="grid grid-rows-2 gap-px">
              {newestGrid.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group relative min-h-[220px] overflow-hidden bg-tertiary/40 lg:min-h-0"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                  <div className="absolute inset-x-5 bottom-5">
                    <h3 className="mb-1 text-lg font-bold text-white">{product.name}</h3>
                    <span className="text-sm font-semibold text-white">
                      £{product.price_gbp.toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-6 sm:gap-x-10">
            {shopByCategory.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group flex w-20 flex-col items-center gap-3 sm:w-24"
              >
                <div className="h-20 w-20 overflow-hidden rounded-full bg-tertiary/40 ring-1 ring-neutral/10 transition group-hover:ring-primary/40 sm:h-24 sm:w-24">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  />
                </div>
                <span className="text-center text-xs font-medium text-neutral sm:text-sm">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 md:py-28 bg-tertiary/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="relative order-2 h-80 overflow-hidden rounded-2xl md:order-1 md:h-[28rem]">
              <img
                src="/shop-img/imgi_16_nu_amanda.png"
                alt="The Toymak woman"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Our Mission
              </p>
              <h2 className="mb-6 text-3xl font-bold leading-tight text-neutral md:text-4xl">
                We&apos;re Toymak
              </h2>
              <p className="mb-8 max-w-lg leading-relaxed text-neutral/70">
                Premium shapewear and fashion designed for the modern woman who refuses to
                compromise on comfort or style. Every piece is engineered to shape, support,
                and move with you — because feeling confident in your own skin shouldn&apos;t
                be complicated. One mission: help you feel like yourself again.
              </p>
              <Link
                href="/our-story"
                className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-neutral transition hover:text-primary"
              >
                Our Story
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video Guides */}
      <section className="py-20 md:py-28 bg-tertiary/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-3">
              Learn
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral mb-4">Video Guides</h2>
            <p className="text-neutral/60 max-w-2xl mx-auto">
              Sizing, styling, and care guides to help you get the most out of every piece —
              filming now, launching soon
            </p>
          </div>

          <ScrollCarousel>
            {videoGuides.map((guide) => (
              <div
                key={guide.title}
                className="group relative w-64 shrink-0 snap-start sm:w-80"
              >
                <div className="relative h-44 overflow-hidden rounded-2xl bg-neutral sm:h-52">
                  <img
                    src={guide.image}
                    alt={guide.title}
                    className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  <span className="absolute left-4 top-4 bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral">
                    Coming Soon
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition group-hover:scale-110">
                      <Play size={22} className="ml-0.5" fill="currentColor" />
                    </span>
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-neutral">{guide.title}</h3>
                <p className="mt-1 text-sm text-neutral/60">{guide.blurb}</p>
              </div>
            ))}
          </ScrollCarousel>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-3">
              Reviews
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral mb-4">
              What Customers Are Saying
            </h2>
            <p className="text-neutral/60 max-w-2xl mx-auto">
              Real feedback from women wearing Toymak every day
            </p>
          </div>

          {/* Mobile: single active card, stacked and auto-advancing */}
          <div className="sm:hidden">
            <TestimonialStack testimonials={testimonials} />
          </div>

          {/* Tablet/desktop: auto-scrolling carousel, every card the same size and aligned */}
          <div className="hidden sm:block">
            <ScrollCarousel pingPong>
              {testimonials.map((review, idx) => (
                <div
                  key={review.id}
                  className="h-[270px] w-80 shrink-0 snap-start sm:h-[290px] sm:w-96"
                >
                  <TestimonialCard review={review} index={idx} />
                </div>
              ))}
            </ScrollCarousel>
          </div>
        </div>
      </section>

      {/* Find Your Fit */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-neutral">
            <img
              src="/shop-img/imgi_96_img_2830.jpg"
              alt="Find your fit"
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
            <div className="relative flex flex-col items-center gap-5 px-6 py-20 text-center md:py-28">
              <Ruler className="text-white" size={28} />
              <h2 className="text-3xl md:text-4xl font-bold text-white max-w-xl">
                Not sure which size to choose?
              </h2>
              <p className="text-white/80 max-w-lg">
                Our size guide walks you through measuring bust, waist, and hips so you can
                shop with confidence the first time.
              </p>
              <Link
                href="/size-guide"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-neutral font-medium rounded-sm hover:bg-white/90 transition"
              >
                Find Your Fit
                <ArrowRight className="ml-2" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact + FAQ */}
      <ContactFaqSection faqs={homepageFaqs} />

      <Footer />
      <FirstOrderPopup />
    </main>
  );
}
