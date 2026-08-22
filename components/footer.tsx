import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone, Heart, Share2, Clock } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      {/* Shop CTA Section — kept a shade distinct from the black footer
          below so the two don't visually merge into one flat band */}
      <div className="bg-secondary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4 text-neutral">
              Ready to Find Your Fit?
            </h3>
            <p className="text-sm mb-6 text-neutral/70">
              Premium shapewear, waist trainers, and essentials — designed for
              confidence at every curve.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white font-medium text-sm rounded-sm hover:bg-opacity-90 transition"
            >
              Shop Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <h4 className="text-lg font-bold mb-6">TOYMAK</h4>
            <p className="text-sm text-white/70 mb-6">
              Premium shapewear and fashion for the modern woman. Confidence
              through quality.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition">
                <Heart size={20} />
              </a>
              <a href="#" className="hover:text-white transition">
                <Share2 size={20} />
              </a>
              <a href="#" className="hover:text-white transition">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h5 className="font-medium mb-4">Shop</h5>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/shop" className="hover:text-white transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=shapewear"
                  className="hover:text-white transition"
                >
                  Shapewear
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=waist-trainer"
                  className="hover:text-white transition"
                >
                  Waist Trainers
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=bra"
                  className="hover:text-white transition"
                >
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
                <Link href="/our-story" className="hover:text-white transition">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/size-guide"
                  className="hover:text-white transition"
                >
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-white transition">
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
                <Mail size={16} className="shrink-0 mt-0.5" />
                <a
                  href="mailto:hello@toymak.com"
                  className="hover:text-white transition"
                >
                  hello@toymak.com
                </a>
              </li>
              <li className="flex gap-3">
                <Phone size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p>
                    Mobile:{" "}
                    <a
                      href="tel:+447776686876"
                      className="hover:text-white transition"
                    >
                      +44 7776 686876
                    </a>
                  </p>
                  <p>
                    Hotline:{" "}
                    <a
                      href="tel:+447776686876"
                      className="hover:text-white transition"
                    >
                      +44 7776 686876
                    </a>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p>26, The Close Harbone, Birmingham.</p>
                  <p>B17 8TU, United Kingdom</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Clock size={16} className="shrink-0 mt-0.5" />
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
              <Link href="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
