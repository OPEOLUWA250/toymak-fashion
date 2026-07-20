import Header from '@/components/header'
import Footer from '@/components/footer'
import { mockProducts } from '@/lib/mock-products'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProductClient from './product-client'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return mockProducts.map((product) => ({
    id: product.id,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = mockProducts.find((p) => p.id === id)

  if (!product) {
    return {
      title: 'Product not found',
    }
  }

  return {
    title: `${product.name} | Toymak Fashion`,
    description: product.longDescription ?? product.description,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = mockProducts.find((p) => p.id === id)
  const relatedProducts = product
    ? mockProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)
    : []

  if (!product) {
    notFound()
  }

  return (
    <main className="bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <nav className="text-sm text-neutral/50 mb-6 md:mb-8">
          <Link href="/" className="hover:text-primary transition">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-primary transition">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neutral">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 xl:gap-16 items-start">
          <div className="space-y-4">
            <div className="relative bg-[#f7f3f6] rounded-2xl overflow-hidden min-h-[28rem] md:min-h-[40rem] flex items-center justify-center">
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
                {product.featured ? 'Best Seller' : 'New Arrival'}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                {product.images.slice(1).map((image, index) => (
                  <div key={image} className="bg-[#f7f3f6] rounded-xl overflow-hidden h-36 md:h-44">
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <ProductClient product={product} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-20 border-t">
            <h2 className="font-serif text-3xl font-bold text-neutral mb-8">You May Also Like</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <Link key={related.id} href={`/product/${related.id}`} className="group">
                  <div className="bg-tertiary/50 rounded-lg overflow-hidden mb-4 h-64">
                    <img
                      src={related.images[0]}
                      alt={related.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition"
                    />
                  </div>
                  <h3 className="font-serif font-bold text-neutral group-hover:text-primary transition">
                    {related.name}
                  </h3>
                  <p className="text-sm text-neutral/60 mb-2">{related.description}</p>
                  <span className="text-primary font-bold">£{related.price_gbp}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  )
}
