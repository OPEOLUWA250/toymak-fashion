import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Ruler, Sparkles } from "lucide-react";

const values = [
  {
    icon: Ruler,
    title: "Comfort First",
    description:
      "Every silhouette is tested for all-day wear before it earns a place in the collection. Support should never mean sacrifice.",
  },
  {
    icon: Sparkles,
    title: "Premium Materials",
    description:
      "Nylon, spandex, and elastane blends chosen for stretch, breathability, and shape retention wear after wear.",
  },
  {
    icon: HeartHandshake,
    title: "Inclusive by Design",
    description:
      "From XS to XXL, our size guide and fit finder exist so every body finds a piece that actually fits.",
  },
];

export default function OurStoryPage() {
  return (
    <main className="bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-4">
            Our Mission
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral">Our Story</h1>
          <p className="text-neutral/60 mt-4 max-w-lg mx-auto">
            Premium shapewear and fashion, built for the modern woman who refuses to
            compromise.
          </p>
        </div>
      </section>

      {/* Narrative */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-neutral/70 leading-relaxed">
          <p>
            Toymak started with a simple frustration: shapewear that promised confidence but
            delivered discomfort. Seams that dug in by lunchtime. Fabric that rolled down by
            the afternoon. Sizing that stopped short of real bodies. We wanted better — for
            ourselves, and for every woman who's ever changed in a fitting room and felt let
            down by what she was wearing underneath.
          </p>
          <p>
            So we built the brand we wished existed: compression that actually holds its
            shape, silhouettes designed around real curves rather than a single sample size,
            and pieces considered enough to wear under a wedding dress or a Tuesday work
            shirt. Every product goes through the same question before it ships —{" "}
            <span className="text-neutral font-medium">
              would we wear this for a full day and still feel like ourselves?
            </span>
          </p>
          <p>
            That's still the whole mission. Not a size chart afterthought, not a seasonal
            gimmick — just considered shapewear and fashion essentials that help you feel like
            yourself again, one seamless fit at a time.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-tertiary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="rounded-2xl border border-neutral/10 bg-white p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-neutral mb-2">{value.title}</h3>
                  <p className="text-sm leading-6 text-neutral/60">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-secondary/30 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral mb-4">
            Ready to feel like yourself again?
          </h2>
          <p className="text-neutral/60 mb-8 max-w-md mx-auto">
            Explore the full collection and find the fit that works for you.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-sm text-sm font-medium hover:bg-primary/90 transition"
          >
            Shop Collection
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
