'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { Package, RefreshCw, Clock, CheckCircle, Shield, Mail, ArrowRight } from 'lucide-react'

const policyHighlights = [
  {
    icon: Clock,
    title: '30-Day Returns',
    description: 'Return any full-price item within 30 days of delivery, no questions asked.',
  },
  {
    icon: RefreshCw,
    title: 'Free Size Exchanges',
    description: 'Found the wrong size? We\'ll exchange it for free on all full-price orders.',
  },
  {
    icon: Package,
    title: 'Easy Process',
    description: 'Email us, get a label, send it back. Refunds processed within 5–7 business days.',
  },
]

const returnSteps = [
  {
    step: 1,
    title: 'Contact Us',
    description:
      'Email hello@toymak.com with your order number and a brief reason for your return or exchange. You\'ll hear from us within 24 hours.',
  },
  {
    step: 2,
    title: 'Receive Your Label',
    description:
      'We\'ll email you a prepaid return shipping label. Print it out and attach it to your parcel.',
  },
  {
    step: 3,
    title: 'Ship It Back',
    description:
      'Package your item securely with all original tags and packaging, then drop it off at your nearest collection point.',
  },
  {
    step: 4,
    title: 'Refund or Exchange',
    description:
      'Once we receive and inspect your return, we\'ll process your refund within 5–7 business days, or dispatch your exchange immediately.',
  },
]

const eligible = [
  'Unworn, unwashed, and in original condition',
  'All tags and packaging intact',
  'Returned within 30 days of delivery',
  'Full-price items',
]

const notEligible = [
  'Items marked as Final Sale',
  'Hygiene-sealed products that have been opened',
  'Items without original tags or packaging',
  'Items showing signs of wear, washing, or alteration',
]

export default function ReturnsPage() {
  return (
    <main className="bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral">
            Returns & Exchanges
          </h1>
          <p className="text-neutral/60 mt-4 max-w-lg mx-auto">
            Hassle-free returns within 30 days. Your satisfaction is our priority.
          </p>
        </div>
      </section>

      {/* Policy Highlights */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {policyHighlights.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral/10 p-6 bg-white text-center hover:shadow-sm transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-neutral/60">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Return Process */}
      <section className="py-16 md:py-20 bg-tertiary/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral text-center mb-12">
            How It Works
          </h2>
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-primary/20" />
            <div className="space-y-10">
              {returnSteps.map((item) => (
                <div key={item.step} className="relative">
                  <div className="absolute -left-5 top-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-neutral mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-7 text-neutral/60">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral text-center mb-12">
            Return Eligibility
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Eligible */}
            <div className="rounded-2xl border border-neutral/10 p-6 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-green-600" />
                <h3 className="font-semibold text-neutral">Eligible for Return</h3>
              </div>
              <ul className="space-y-3">
                {eligible.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm text-neutral/65"
                  >
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Not Eligible */}
            <div className="rounded-2xl border border-neutral/10 p-6 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-neutral/40" />
                <h3 className="font-semibold text-neutral">Not Eligible</h3>
              </div>
              <ul className="space-y-3">
                {notEligible.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm text-neutral/65"
                  >
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-neutral/30" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-secondary/30 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral mb-4">
            Need Help?
          </h2>
          <p className="text-neutral/60 mb-8 max-w-md mx-auto">
            Our support team is ready to assist with any return or exchange.
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
              href="/faq"
              className="inline-flex items-center gap-2 border border-neutral/20 text-neutral px-8 py-3 rounded-sm text-sm font-medium hover:bg-neutral/5 transition"
            >
              View FAQ
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
