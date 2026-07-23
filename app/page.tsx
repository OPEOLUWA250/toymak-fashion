import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { ArrowRight, Shield, RotateCcw, Award } from "lucide-react";
import { mockProducts } from "@/lib/mock-products";

export default function HomePage() {
  const featuredProducts = mockProducts.filter((p) => p.featured).slice(0, 3);
  const bestSellers = mockProducts.slice(0, 4);

  return (
    <main className="bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 to-secondary/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-neutral leading-tight">
                Define Your Silhouette, Reclaim Your Confidence.
              </h1>
              <p className="text-base md:text-lg text-neutral/70 leading-relaxed max-w-lg">
                Discover our collection of premium shapewear and fashion
                designed for the modern woman who refuses to compromise on
                comfort or style.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-medium rounded-sm hover:bg-opacity-90 transition"
                >
                  Shop Collection
                  <ArrowRight className="ml-2" size={18} />
                </Link>
                <Link
                  href="/size-guide"
                  className="inline-flex items-center justify-center px-8 py-3 border-2 border-neutral text-neutral font-medium rounded-sm hover:bg-neutral/5 transition"
                >
                  View Size Guide
                </Link>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative h-96 md:h-full">
              <div className="absolute inset-0 bg-primary/5 rounded-lg"></div>
              <img
                src="/shop-img/imgi_81_img_7941-1536x1536.jpg"
                alt="Premium shapewear collection"
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-neutral mb-4">
              Featured Collections
            </h2>
            <p className="text-neutral/60 max-w-2xl mx-auto">
              Curated collections for every body and every occasion
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Shapewear */}
            <Link
              href="/shop/shapewear"
              className="group relative overflow-hidden rounded-lg h-80 md:h-96 bg-secondary/20"
            >
              <img
                src="/shop-img/imgi_10_fb_shp.png"
                alt="Shapewear collection"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition duration-300 flex items-end p-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-white mb-2">
                    Shapewear
                  </h3>
                  <p className="text-white/90 text-sm">
                    Seamless shaping for every occasion
                  </p>
                </div>
              </div>
            </Link>

            {/* Waist Trainers */}
            <Link
              href="/shop/waist-trainer"
              className="group relative overflow-hidden rounded-lg h-80 md:h-96 bg-secondary/20"
            >
              <img
                src="/shop-img/imgi_13_waist_wrp.png"
                alt="Waist trainer collection"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition duration-300 flex items-end p-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-white mb-2">
                    Waist Trainers
                  </h3>
                  <p className="text-white/90 text-sm">
                    Professional-grade compression support
                  </p>
                </div>
              </div>
            </Link>

            {/* New Arrivals */}
            <Link
              href="/shop?sort=newest"
              className="group relative overflow-hidden rounded-lg h-80 md:h-96 bg-secondary/20"
            >
              <img
                src="/shop-img/imgi_14_nu_bella.png"
                alt="New arrivals"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition duration-300 flex items-end p-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-white mb-2">
                    New Arrivals
                  </h3>
                  <p className="text-white/90 text-sm">
                    Just released premium styles
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-20 md:py-28 bg-tertiary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-neutral mb-4">
              Best Sellers
            </h2>
            <p className="text-neutral/60 max-w-2xl mx-auto">
              Customer favorites that deliver results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group"
              >
                <div className="relative bg-white rounded-lg overflow-hidden mb-4 h-64 md:h-72">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                    Featured
                  </div>
                </div>
                <h3 className="font-serif text-lg font-bold text-neutral group-hover:text-primary transition">
                  {product.name}
                </h3>
                <p className="text-neutral/60 text-sm mb-3">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">
                    £{product.price_gbp}
                  </span>
                  <div className="flex gap-2">
                    {product.colors.slice(0, 3).map((color) => (
                      <div
                        key={color.name}
                        className="w-4 h-4 rounded-full border border-neutral/30"
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/shop"
              className="inline-flex items-center px-8 py-3 border-2 border-primary text-primary font-medium rounded-sm hover:bg-primary hover:text-white transition"
            >
              View All Products
              <ArrowRight className="ml-2" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <Shield className="flex-shrink-0 text-primary" size={24} />
              <div>
                <h4 className="font-medium text-neutral mb-2">
                  Secure Checkout
                </h4>
                <p className="text-sm text-neutral/60">
                  SSL encrypted payments with Stripe and Paystack
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <RotateCcw className="flex-shrink-0 text-primary" size={24} />
              <div>
                <h4 className="font-medium text-neutral mb-2">
                  30-Day Returns
                </h4>
                <p className="text-sm text-neutral/60">
                  Not satisfied? Return or exchange within 30 days
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Award className="flex-shrink-0 text-primary" size={24} />
              <div>
                <h4 className="font-medium text-neutral mb-2">
                  Premium Quality
                </h4>
                <p className="text-sm text-neutral/60">
                  Crafted with premium materials and expert attention
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
