'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { mockProducts } from '@/lib/mock-products'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function ShopPage() {
  const [sortBy, setSortBy] = useState('featured')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState(150)

  const categories = ['shapewear', 'waist-trainer', 'bra', 'accessories'] as const

  const filteredProducts = mockProducts.filter((product) => {
    if (selectedCategory && product.category !== selectedCategory) return false
    if (product.price_gbp > maxPrice) return false
    return true
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price_gbp - b.price_gbp
      case 'price-high':
        return b.price_gbp - a.price_gbp
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default:
        return 0
    }
  })

  return (
    <main className="bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-tertiary/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-neutral">Shop All Products</h1>
          <p className="text-neutral/60 mt-2">Browse our complete collection of premium shapewear and fashion</p>
        </div>
      </section>

      {/* Shop Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <div className="md:col-span-1">
              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h3 className="font-medium text-neutral mb-4">Categories</h3>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`text-sm ${
                          selectedCategory === null
                            ? 'text-primary font-medium'
                            : 'text-neutral/60 hover:text-neutral'
                        }`}
                      >
                        All Products
                      </button>
                    </li>
                    {categories.map((cat) => (
                      <li key={cat}>
                        <button
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-sm capitalize ${
                            selectedCategory === cat
                              ? 'text-primary font-medium'
                              : 'text-neutral/60 hover:text-neutral'
                          }`}
                        >
                          {cat.replace('-', ' ')}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-medium text-neutral mb-4">Price Range</h3>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-neutral/60 mt-2">Up to £{maxPrice}</p>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="md:col-span-3">
              {/* Toolbar */}
              <div className="mb-8 flex justify-between items-center">
                <p className="text-sm text-neutral/60">{sortedProducts.length} products</p>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none px-4 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="featured">Featured</option>
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Products */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`} className="group">
                    <div className="relative bg-tertiary/50 rounded-lg overflow-hidden mb-4 h-72">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-neutral group-hover:text-primary transition">
                      {product.name}
                    </h3>
                    <p className="text-neutral/60 text-sm mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-bold">£{product.price_gbp}</span>
                      <div className="flex gap-2">
                        {product.colors.slice(0, 3).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded-full border border-neutral/30"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {sortedProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-neutral/60">No products found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
