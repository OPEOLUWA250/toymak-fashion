'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { ChevronDown, Mail, Ruler } from 'lucide-react'
import { faqSections } from '@/lib/faq-data'

export default function FAQPage() {
  return (
    <main className="bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral">
            Frequently Asked Questions
          </h1>
          <p className="text-neutral/60 mt-4 max-w-lg mx-auto">
            Everything you need to know. Can&apos;t find your answer?{' '}
            <Link href="/#contact" className="text-primary hover:underline">
              Get in touch
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={sectionIdx > 0 ? 'mt-14' : ''}>
              <h2 className="text-2xl font-bold text-neutral mb-6">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.questions.map((item, idx) => (
                  <details
                    key={idx}
                    className="group rounded-2xl border border-neutral/10 bg-white hover:shadow-sm transition-shadow"
                  >
                    <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-sm font-semibold text-neutral list-none [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown
                        size={16}
                        className="shrink-0 ml-4 text-neutral/40 transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div className="px-6 pb-5">
                      <div className="border-t border-neutral/10 pt-4">
                        <p className="text-sm leading-7 text-neutral/65">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-secondary/30 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral mb-4">
            Still Have Questions?
          </h2>
          <p className="text-neutral/60 mb-8 max-w-md mx-auto">
            Our team is here to help. Reach out and we&apos;ll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@toymak.com"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-sm text-sm font-medium hover:bg-primary/90 transition"
            >
              <Mail size={16} />
              Email Us
            </a>
            <Link
              href="/size-guide"
              className="inline-flex items-center gap-2 border border-neutral/20 text-neutral px-8 py-3 rounded-sm text-sm font-medium hover:bg-neutral/5 transition"
            >
              <Ruler size={16} />
              Size Guide
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
