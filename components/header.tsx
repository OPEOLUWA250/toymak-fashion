'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Search, Heart, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { getItemCount } = useCart()

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Shop All', href: '/shop' },
    { label: 'Shapewear', href: '/shop/shapewear' },
    { label: 'Waist Trainers', href: '/shop/waist-trainer' },
    { label: 'New Arrivals', href: '/shop?sort=newest' },
  ]

  return (
    <>
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 text-neutral">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <h1 className="font-serif font-bold text-2xl text-primary">TOYMAK</h1>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-neutral hover:text-primary transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Icons */}
            <div className="hidden md:flex items-center space-x-3 text-neutral">
              <button className="rounded-full p-2 hover:text-primary hover:bg-primary/5 transition" aria-label="Search">
                <Search size={20} />
              </button>
              <Link href="/wishlist" className="rounded-full p-2 hover:text-primary hover:bg-primary/5 transition" aria-label="Wishlist">
                <Heart size={20} />
              </Link>
              <Link href="/cart" className="relative rounded-full p-2 hover:text-primary hover:bg-primary/5 transition" aria-label="Cart">
                <ShoppingBag size={20} />
                {getItemCount() > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {getItemCount()}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-neutral-200 md:hidden">
          <nav className="flex flex-col space-y-4 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-medium text-neutral hover:text-primary transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <hr className="my-4" />
            <Link
              href="/cart"
              className="flex items-center space-x-2 text-base font-medium text-neutral hover:text-primary transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingBag size={20} />
              <span>Cart</span>
            </Link>
          </nav>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="h-20" />
    </>
  )
}
