'use client'

import Link from 'next/link'
import { Mail, MapPin, Phone, Heart, Share2, Clock } from 'lucide-react'
import { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const currentYear = new Date().getFullYear()

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate Resend email service
    setEmail('')
  }

  return (
    <footer className="bg-neutral text-white">
      {/* Newsletter Section */}
      <div className="bg-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md">
            <h3 className="font-serif text-2xl font-bold mb-4">Join Our Community</h3>
            <p className="text-sm mb-6 text-white/90">
              Get exclusive offers, new arrivals, and styling tips delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-2 bg-white text-neutral rounded-sm text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-white text-primary font-medium text-sm rounded-sm hover:bg-opacity-90 transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <h4 className="font-serif text-lg font-bold mb-6">TOYMAK</h4>
            <p className="text-sm text-white/70 mb-6">
              Premium shapewear and fashion for the modern woman. Confidence through quality.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition">
                <Heart size={20} />
              </a>
              <a href="#" className="hover:text-primary transition">
                <Share2 size={20} />
              </a>
              <a href="#" className="hover:text-primary transition">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h5 className="font-medium mb-4">Shop</h5>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/shop" className="hover:text-primary transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop/shapewear" className="hover:text-primary transition">
                  Shapewear
                </Link>
              </li>
              <li>
                <Link href="/shop/waist-trainer" className="hover:text-primary transition">
                  Waist Trainers
                </Link>
              </li>
              <li>
                <Link href="/shop/bra" className="hover:text-primary transition">
                  Bras
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h5 className="font-medium mb-4">Support</h5>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/faq" className="hover:text-primary transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/size-guide" className="hover:text-primary transition">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-primary transition">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="font-medium mb-4">Get in Touch</h5>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex gap-3">
                <Mail size={16} className="flex-shrink-0 mt-0.5" />
                <a href="mailto:hello@toymak.com" className="hover:text-primary transition">
                  hello@toymak.com
                </a>
              </li>
              <li className="flex gap-3">
                <Phone size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p>Mobile: <a href="tel:+447776686876" className="hover:text-primary transition">+44 7776 686876</a></p>
                  <p>Hotline: <a href="tel:+447776686876" className="hover:text-primary transition">+44 7776 686876</a></p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p>26, The Close Harbone, Birmingham.</p>
                  <p>B17 8TU, United Kingdom</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Clock size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p>Monday – Friday: 9:00 – 22:00</p>
                  <p>Saturday &amp; Sunday: 9:00 – 21:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-white/60 gap-4">
            <p>&copy; {currentYear} Toymak Enterprise. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-primary transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary transition">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
