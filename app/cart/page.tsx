'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart()
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(0)

  const subtotal = getTotal()
  const shipping = subtotal > 50 ? 0 : 7.99
  const tax = (subtotal + shipping) * 0.2 // 20% VAT
  const total = subtotal + shipping + tax - discountApplied

  const handleApplyDiscount = () => {
    if (discountCode.toLowerCase() === 'welcome10') {
      setDiscountApplied(subtotal * 0.1)
      setDiscountCode('')
    } else {
      alert('Invalid discount code')
    }
  }

  if (items.length === 0) {
    return (
      <main className="bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-6 max-w-xl mx-auto">
            <h1 className="font-serif text-3xl font-bold text-neutral">Your Cart is Empty</h1>
            <p className="text-neutral/70 leading-relaxed">
              Discover our premium collection of shapewear and fashion.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-bold rounded-sm hover:bg-opacity-90 transition"
            >
              Start Shopping
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-serif text-3xl font-bold text-neutral mb-12">Shopping Cart</h1>

        <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] gap-10 lg:gap-12 items-start">
          {/* Cart Items */}
          <div className="space-y-6">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-4 rounded-2xl border border-neutral/10 bg-white p-4 sm:p-5 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)_auto]"
              >
                <img src={item.image_url} alt={item.product_name} className="h-24 w-24 rounded-xl object-cover" />
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-bold text-neutral break-words">{item.product_name}</h3>
                  <p className="mt-1 text-sm text-neutral/70">
                    Size: {item.size} | Color: {item.color}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center rounded-lg border border-neutral/15 bg-white">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.size, item.color, item.quantity - 1)}
                        className="px-4 py-2 text-neutral hover:bg-tertiary transition"
                      >
                        −
                      </button>
                      <span className="border-x border-neutral/15 px-4 py-2 text-sm font-medium text-neutral">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.size, item.color, item.quantity + 1)}
                        className="px-4 py-2 text-neutral hover:bg-tertiary transition"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-primary">£{(item.price_at_addition * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <button
                    onClick={() => removeItem(item.product_id, item.size, item.color)}
                    className="rounded-full p-2 text-neutral/60 hover:bg-primary/5 hover:text-primary transition"
                    aria-label={`Remove ${item.product_name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-[#fafafa] border border-neutral/10 p-6 rounded-2xl h-fit space-y-5 sticky top-28">
            <h2 className="font-serif text-xl font-bold text-neutral">Order Summary</h2>

            <div className="space-y-3 border-b border-neutral/10 pb-4 text-sm text-neutral">
              <div className="flex justify-between gap-4">
                <span>Subtotal</span>
                <span className="font-medium">£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-primary font-medium' : 'font-medium'}>
                  {shipping === 0 ? 'FREE' : `£${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Tax (VAT)</span>
                <span className="font-medium">£{tax.toFixed(2)}</span>
              </div>
              {discountApplied > 0 && (
                <div className="flex justify-between gap-4 text-primary font-medium">
                  <span>Discount</span>
                  <span>-£{discountApplied.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">£{total.toFixed(2)}</span>
            </div>

            {/* Discount Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral">Promo Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 rounded-md border border-neutral/20 px-3 py-2 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleApplyDiscount}
                  className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-neutral/60">Tip: Try &quot;welcome10&quot;</p>
            </div>

            {/* Checkout */}
            <Link
              href="/checkout"
              className="block w-full rounded-md bg-primary py-3 text-center font-bold text-white transition hover:bg-opacity-90"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/shop"
              className="block w-full rounded-md border-2 border-neutral text-center font-bold text-neutral py-3 hover:bg-neutral/5 transition"
            >
              Continue Shopping
            </Link>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-neutral/10 space-y-2 text-xs text-neutral/60">
              <p>✓ 30-day returns</p>
              <p>✓ Secure checkout</p>
              <p>✓ Free shipping over £50</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
