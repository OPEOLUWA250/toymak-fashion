"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ruler, ArrowRight } from "lucide-react";
import {
  sizeChart,
  categoryLabels,
  measurementSteps,
  fitTips,
  type SizeCategory,
} from "@/lib/size-guide-data";

const categories = Object.keys(sizeChart) as SizeCategory[];

function isSizeCategory(value: string | null): value is SizeCategory {
  return categories.includes(value as SizeCategory);
}

function SizeGuideInner() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<SizeCategory>(() => {
    const requested = searchParams.get("category");
    return isSizeCategory(requested) ? requested : "shapewear";
  });

  return (
    <main className="bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral">
            Size Guide
          </h1>
          <p className="text-neutral/60 mt-4 max-w-lg mx-auto">
            Find your perfect fit. Use the guide below to match your measurements to our sizes.
          </p>
        </div>
      </section>

      {/* How to Measure */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral text-center mb-4">
            How to Measure
          </h2>
          <p className="text-neutral/60 text-center mb-10 max-w-md mx-auto text-sm">
            Use a soft measuring tape and stand in front of a mirror for accuracy.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {measurementSteps.map((step) => (
              <div
                key={step.step}
                className="rounded-2xl border border-neutral/10 p-6 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-neutral mb-2">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-neutral/60">
                  {step.instruction}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Size Chart */}
      <section id="size-chart" className="py-16 md:py-20 bg-tertiary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral text-center mb-10">
            Size Chart
          </h2>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`uppercase tracking-[0.16em] text-xs font-semibold pb-2 border-b-2 transition-colors ${
                  activeCategory === cat
                    ? "text-primary border-primary"
                    : "text-neutral/40 border-transparent hover:text-neutral/60"
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral/10 overflow-hidden bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral text-white">
                  <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.12em] text-xs">
                    Size
                  </th>
                  <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.12em] text-xs">
                    Bust
                  </th>
                  <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.12em] text-xs">
                    Waist
                  </th>
                  <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.12em] text-xs">
                    Hips
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizeChart[activeCategory].map((row, idx) => (
                  <tr
                    key={row.size}
                    className={idx % 2 === 0 ? "bg-white" : "bg-tertiary/30"}
                  >
                    <td className="px-6 py-4 font-semibold text-neutral">
                      {row.size}
                    </td>
                    <td className="px-6 py-4 text-neutral/65">{row.bustLabel}</td>
                    <td className="px-6 py-4 text-neutral/65">{row.waistLabel}</td>
                    <td className="px-6 py-4 text-neutral/65">{row.hipsLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-neutral/40 mt-4 text-center">
            All measurements are approximate. For the best fit, refer to individual product pages.
          </p>
        </div>
      </section>

      {/* Fit Tips */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral text-center mb-10">
            Fit Tips
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {fitTips.map((tip, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-neutral/10 p-6 bg-white hover:shadow-sm transition-shadow"
              >
                <Ruler size={20} className="text-primary mb-4" />
                <h3 className="font-semibold text-neutral mb-2">{tip.title}</h3>
                <p className="text-sm leading-6 text-neutral/60">
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-secondary/30 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral mb-4">
            Still Unsure?
          </h2>
          <p className="text-neutral/60 mb-8 max-w-md mx-auto">
            Check our FAQ for more sizing advice, or explore the collection.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-sm text-sm font-medium hover:bg-primary/90 transition"
            >
              View FAQ
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 border border-neutral/20 text-neutral px-8 py-3 rounded-sm text-sm font-medium hover:bg-neutral/5 transition"
            >
              Shop Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function SizeGuidePage() {
  return (
    <Suspense fallback={null}>
      <SizeGuideInner />
    </Suspense>
  );
}
