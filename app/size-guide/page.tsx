import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { Ruler, ArrowRight } from "lucide-react";
import { fitTips } from "@/lib/size-guide-data";
import { HowToMeasureImage } from "@/components/size-guide-panel";

// Measuring guide only — each product's own size chart is shown on its page.
export default function SizeGuidePage() {
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
            Find your perfect fit. Use the guide below to take your measurements.
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
          <HowToMeasureImage className="mx-auto max-w-3xl" />
          <p className="mt-3 text-center text-xs text-neutral/40">
            Tap the image to open it full size.
          </p>
        </div>
      </section>

      {/* Fit Tips */}
      <section className="py-16 md:py-20 bg-tertiary/30">
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
