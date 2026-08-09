'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { useState } from 'react'
import { Ruler, ArrowRight } from 'lucide-react'

const measurementSteps = [
  {
    step: 1,
    title: 'Bust',
    instruction:
      'Measure around the fullest part of your bust, keeping the tape level and snug but not tight.',
  },
  {
    step: 2,
    title: 'Waist',
    instruction:
      'Measure around your natural waistline — the narrowest part of your torso, usually just above the navel.',
  },
  {
    step: 3,
    title: 'Hips',
    instruction:
      'Measure around the widest part of your hips and buttocks, keeping the tape parallel to the floor.',
  },
]

type Category = 'shapewear' | 'waist-trainers' | 'bras'

const sizeData: Record<
  Category,
  { size: string; bust: string; waist: string; hips: string }[]
> = {
  shapewear: [
    { size: 'XS', bust: '30–32" / 76–81cm', waist: '24–26" / 61–66cm', hips: '33–35" / 84–89cm' },
    { size: 'S', bust: '32–34" / 81–86cm', waist: '26–28" / 66–71cm', hips: '35–37" / 89–94cm' },
    { size: 'M', bust: '34–36" / 86–91cm', waist: '28–30" / 71–76cm', hips: '37–39" / 94–99cm' },
    { size: 'L', bust: '36–38" / 91–97cm', waist: '30–32" / 76–81cm', hips: '39–41" / 99–104cm' },
    { size: 'XL', bust: '38–40" / 97–102cm', waist: '32–34" / 81–86cm', hips: '41–43" / 104–109cm' },
    { size: 'XXL', bust: '40–42" / 102–107cm', waist: '34–36" / 86–91cm', hips: '43–45" / 109–114cm' },
  ],
  'waist-trainers': [
    { size: 'XS', bust: '—', waist: '22–24" / 56–61cm', hips: '—' },
    { size: 'S', bust: '—', waist: '24–26" / 61–66cm', hips: '—' },
    { size: 'M', bust: '—', waist: '26–28" / 66–71cm', hips: '—' },
    { size: 'L', bust: '—', waist: '28–30" / 71–76cm', hips: '—' },
    { size: 'XL', bust: '—', waist: '30–32" / 76–81cm', hips: '—' },
    { size: 'XXL', bust: '—', waist: '32–34" / 81–86cm', hips: '—' },
  ],
  bras: [
    { size: 'XS', bust: '30–32" / 76–81cm', waist: '—', hips: '—' },
    { size: 'S', bust: '32–34" / 81–86cm', waist: '—', hips: '—' },
    { size: 'M', bust: '34–36" / 86–91cm', waist: '—', hips: '—' },
    { size: 'L', bust: '36–38" / 91–97cm', waist: '—', hips: '—' },
    { size: 'XL', bust: '38–40" / 97–102cm', waist: '—', hips: '—' },
    { size: 'XXL', bust: '40–42" / 102–107cm', waist: '—', hips: '—' },
  ],
}

const categoryLabels: Record<Category, string> = {
  shapewear: 'Shapewear',
  'waist-trainers': 'Waist Trainers',
  bras: 'Bras',
}

const fitTips = [
  {
    title: 'Size up for comfort',
    description:
      'Shapewear is designed for compression, so if you\'re between sizes, going up will give you a more comfortable fit without sacrificing support.',
  },
  {
    title: 'Measure over undergarments',
    description:
      'For the most accurate results, take measurements wearing the undergarments you\'d normally wear — no padding or push-up.',
  },
  {
    title: 'Check product-specific notes',
    description:
      'Some styles run slightly different from our standard chart. Always check the fit notes on individual product pages for the best guidance.',
  },
]

export default function SizeGuidePage() {
  const [activeCategory, setActiveCategory] = useState<Category>('shapewear')

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
      <section className="py-16 md:py-20 bg-tertiary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral text-center mb-10">
            Size Chart
          </h2>

          {/* Category Tabs */}
          <div className="flex justify-center gap-6 mb-8">
            {(Object.keys(sizeData) as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`uppercase tracking-[0.16em] text-xs font-semibold pb-2 border-b-2 transition-colors ${
                  activeCategory === cat
                    ? 'text-primary border-primary'
                    : 'text-neutral/40 border-transparent hover:text-neutral/60'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral/10 overflow-hidden bg-white">
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
                {sizeData[activeCategory].map((row, idx) => (
                  <tr
                    key={row.size}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-tertiary/30'}
                  >
                    <td className="px-6 py-4 font-semibold text-neutral">
                      {row.size}
                    </td>
                    <td className="px-6 py-4 text-neutral/65">{row.bust}</td>
                    <td className="px-6 py-4 text-neutral/65">{row.waist}</td>
                    <td className="px-6 py-4 text-neutral/65">{row.hips}</td>
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
  )
}
