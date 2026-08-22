'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { mockProducts } from '@/lib/mock-products'
import { cn } from '@/lib/utils'
import { ProductCard } from '@/components/product-card'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Grid3x3,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

const CATEGORY_DEFS = [
  { value: 'shapewear', label: 'Shapewear' },
  { value: 'waist-trainer', label: 'Waist Trainers' },
  { value: 'bra', label: 'Bras' },
  { value: 'tops', label: 'Tops' },
  { value: 'accessories', label: 'Accessories' },
] as const

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const SORT_LABELS = {
  featured: 'Featured',
  newest: 'Newest',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  'name-asc': 'Name: A–Z',
} as const

type SortValue = keyof typeof SORT_LABELS

function toggleInList<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopPageInner />
    </Suspense>
  )
}

function ShopPageInner() {
  const searchParams = useSearchParams()

  const priceFloor = useMemo(
    () => Math.floor(Math.min(...mockProducts.map((p) => p.price_gbp))),
    [],
  )
  const priceCeil = useMemo(
    () => Math.ceil(Math.max(...mockProducts.map((p) => p.price_gbp))),
    [],
  )

  const categories = useMemo(
    () =>
      CATEGORY_DEFS.map((cat) => ({
        ...cat,
        count: mockProducts.filter((p) => p.category === cat.value).length,
      })).filter((cat) => cat.count > 0),
    [],
  )

  const allColors = useMemo(() => {
    const map = new Map<string, string>()
    mockProducts.forEach((p) => p.colors.forEach((c) => {
      if (!map.has(c.name)) map.set(c.name, c.hex)
    }))
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }))
  }, [])

  const allSizes = useMemo(
    () => SIZE_ORDER.filter((size) => mockProducts.some((p) => p.sizes.includes(size))),
    [],
  )

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const category = searchParams.get('category')
    return category ? [category] : []
  })
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState(priceCeil)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortValue>(() => {
    const sort = searchParams.get('sort')
    const validSorts: SortValue[] = ['featured', 'newest', 'price-low', 'price-high', 'name-asc']
    return validSorts.includes(sort as SortValue) ? (sort as SortValue) : 'featured'
  })
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [sortOpen, setSortOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const sortMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSortOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedColors([])
    setSelectedSizes([])
    setMaxPrice(priceCeil)
    setInStockOnly(false)
    setSearchQuery('')
  }

  const activeFilterCount =
    selectedCategories.length +
    selectedColors.length +
    selectedSizes.length +
    (maxPrice < priceCeil ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0)

  const sortedProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = mockProducts.filter((product) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
        return false
      }
      if (product.price_gbp > maxPrice) return false
      if (
        selectedColors.length > 0 &&
        !product.colors.some((c) => selectedColors.includes(c.name))
      ) {
        return false
      }
      if (selectedSizes.length > 0 && !product.sizes.some((s) => selectedSizes.includes(s))) {
        return false
      }
      if (inStockOnly && product.stock_qty <= 0) return false
      if (
        query &&
        !product.name.toLowerCase().includes(query) &&
        !product.description.toLowerCase().includes(query)
      ) {
        return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price_gbp - b.price_gbp
        case 'price-high':
          return b.price_gbp - a.price_gbp
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'name-asc':
          return a.name.localeCompare(b.name)
        default:
          return Number(b.featured) - Number(a.featured)
      }
    })
  }, [selectedCategories, maxPrice, selectedColors, selectedSizes, inStockOnly, searchQuery, sortBy])

  const filterProps: FilterContentProps = {
    categories,
    selectedCategories,
    onToggleCategory: (value) => setSelectedCategories((prev) => toggleInList(prev, value)),
    allColors,
    selectedColors,
    onToggleColor: (value) => setSelectedColors((prev) => toggleInList(prev, value)),
    allSizes,
    selectedSizes,
    onToggleSize: (value) => setSelectedSizes((prev) => toggleInList(prev, value)),
    priceFloor,
    priceCeil,
    maxPrice,
    onMaxPriceChange: setMaxPrice,
    inStockOnly,
    onInStockChange: setInStockOnly,
  }

  return (
    <main className="bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-primary-light py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-neutral/50">
            <Link href="/" className="hover:text-primary transition">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral">Shop</span>
          </nav>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                The Collection
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-neutral">
                Shop All Products
              </h1>
              <p className="mt-3 max-w-xl text-neutral/60">
                Premium shapewear, waist trainers, and fashion essentials designed for
                confidence at every curve.
              </p>
            </div>
            <p className="text-sm text-neutral/50">
              {sortedProducts.length} of {mockProducts.length} products
            </p>
          </div>

          {/* Quick category tabs */}
          <div className="mt-10 -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              className={cn(
                'shrink-0 px-5 py-2.5 text-sm font-semibold transition',
                selectedCategories.length === 0
                  ? 'bg-primary text-white shadow-sm shadow-primary/25'
                  : 'border border-neutral/15 bg-white text-neutral hover:border-primary/40',
              )}
            >
              All
            </button>
            {categories.map((cat) => {
              const active =
                selectedCategories.length === 1 && selectedCategories[0] === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategories([cat.value])}
                  className={cn(
                    'shrink-0 px-5 py-2.5 text-sm font-semibold transition',
                    active
                      ? 'bg-primary text-white shadow-sm shadow-primary/25'
                      : 'border border-neutral/15 bg-white text-neutral hover:border-primary/40',
                  )}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Shop Content */}
      <section className="py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-neutral/10 bg-white p-6">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-neutral">
                    Filters
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-70 transition"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <FilterContent {...filterProps} />
              </div>
            </aside>

            {/* Products Column */}
            <div>
              {/* Toolbar */}
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-neutral/10 bg-white p-4 shadow-sm">
                <div className="relative min-w-45 flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-xl border border-neutral/15 bg-transparent py-2.5 pl-9 pr-3 text-sm text-neutral outline-none placeholder:text-neutral/40 focus:border-primary transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral/15 px-4 py-2.5 text-sm font-medium text-neutral hover:border-primary/40 transition lg:hidden"
                >
                  <SlidersHorizontal size={16} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative" ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSortOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                    className="flex items-center gap-2 rounded-xl border border-neutral/15 px-4 py-2.5 text-sm font-medium text-neutral hover:border-primary/40 transition"
                  >
                    <span className="text-neutral/40">Sort:</span>
                    {SORT_LABELS[sortBy]}
                    <ChevronDown
                      size={14}
                      className={cn('transition', sortOpen && 'rotate-180')}
                    />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-56 rounded-xl border border-neutral/10 bg-white p-1.5 shadow-2xl">
                      {(Object.entries(SORT_LABELS) as [SortValue, string][]).map(
                        ([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setSortBy(value)
                              setSortOpen(false)
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
                              sortBy === value
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-neutral hover:bg-neutral-50',
                            )}
                          >
                            {label}
                            {sortBy === value && <Check size={14} />}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="hidden items-center gap-1 rounded-xl border border-neutral/15 p-1 lg:flex">
                  <button
                    type="button"
                    onClick={() => setDensity('comfortable')}
                    aria-label="Comfortable grid"
                    className={cn(
                      'rounded-lg p-2 transition',
                      density === 'comfortable'
                        ? 'bg-neutral text-white'
                        : 'text-neutral/40 hover:text-neutral',
                    )}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity('compact')}
                    aria-label="Compact grid"
                    className={cn(
                      'rounded-lg p-2 transition',
                      density === 'compact'
                        ? 'bg-neutral text-white'
                        : 'text-neutral/40 hover:text-neutral',
                    )}
                  >
                    <Grid3x3 size={16} />
                  </button>
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeFilterCount > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  {selectedCategories.map((value) => {
                    const cat = categories.find((c) => c.value === value)
                    return (
                      <FilterChip
                        key={value}
                        label={cat?.label ?? value}
                        onRemove={() =>
                          setSelectedCategories((prev) => toggleInList(prev, value))
                        }
                      />
                    )
                  })}
                  {selectedColors.map((value) => (
                    <FilterChip
                      key={value}
                      label={value}
                      onRemove={() => setSelectedColors((prev) => toggleInList(prev, value))}
                    />
                  ))}
                  {selectedSizes.map((value) => (
                    <FilterChip
                      key={value}
                      label={`Size ${value}`}
                      onRemove={() => setSelectedSizes((prev) => toggleInList(prev, value))}
                    />
                  ))}
                  {maxPrice < priceCeil && (
                    <FilterChip
                      label={`Up to £${maxPrice}`}
                      onRemove={() => setMaxPrice(priceCeil)}
                    />
                  )}
                  {inStockOnly && (
                    <FilterChip label="In stock" onRemove={() => setInStockOnly(false)} />
                  )}
                  {searchQuery.trim() && (
                    <FilterChip
                      label={`"${searchQuery.trim()}"`}
                      onRemove={() => setSearchQuery('')}
                    />
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-70 transition"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Products Grid */}
              {sortedProducts.length > 0 ? (
                <div
                  className={cn(
                    'grid gap-x-6 gap-y-10 sm:grid-cols-2',
                    density === 'compact' ? 'lg:grid-cols-4 lg:gap-8' : 'lg:grid-cols-3 lg:gap-x-8',
                  )}
                >
                  {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral/20 bg-tertiary/20 py-20 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Search size={22} />
                  </div>
                  <p className="text-lg font-bold text-neutral">
                    No products match your filters
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-neutral/60">
                    Try adjusting or clearing your filters to see more of our collection.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[88vw] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral/10 px-5 py-4">
              <p className="text-lg font-bold text-neutral">Filters</p>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 hover:bg-neutral/5 transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterContent {...filterProps} />
            </div>
            <div className="flex gap-3 border-t border-neutral/10 p-4">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-xl border border-neutral/15 py-3 text-sm font-semibold text-neutral hover:bg-neutral/5 transition"
              >
                Clear all
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
              >
                Show {sortedProducts.length} results
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}

interface FilterContentProps {
  categories: { value: string; label: string; count: number }[]
  selectedCategories: string[]
  onToggleCategory: (value: string) => void
  allColors: { name: string; hex: string }[]
  selectedColors: string[]
  onToggleColor: (value: string) => void
  allSizes: string[]
  selectedSizes: string[]
  onToggleSize: (value: string) => void
  priceFloor: number
  priceCeil: number
  maxPrice: number
  onMaxPriceChange: (value: number) => void
  inStockOnly: boolean
  onInStockChange: (value: boolean) => void
}

function FilterContent({
  categories,
  selectedCategories,
  onToggleCategory,
  allColors,
  selectedColors,
  onToggleColor,
  allSizes,
  selectedSizes,
  onToggleSize,
  priceFloor,
  priceCeil,
  maxPrice,
  onMaxPriceChange,
  inStockOnly,
  onInStockChange,
}: FilterContentProps) {
  return (
    <div className="space-y-8">
      {/* Categories */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-neutral">Categories</h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => onToggleCategory(cat.value)}
              aria-pressed={selectedCategories.includes(cat.value)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-tertiary/50"
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition',
                  selectedCategories.includes(cat.value)
                    ? 'border-primary bg-primary text-white'
                    : 'border-neutral/25',
                )}
              >
                {selectedCategories.includes(cat.value) && <Check size={11} />}
              </span>
              <span className="flex-1 text-sm text-neutral">{cat.label}</span>
              <span className="text-xs text-neutral/40">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-neutral">Color</h3>
        <div className="flex flex-wrap gap-2.5">
          {allColors.map((color) => {
            const checked = selectedColors.includes(color.name)
            return (
              <button
                key={color.name}
                type="button"
                onClick={() => onToggleColor(color.name)}
                aria-pressed={checked}
                title={color.name}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition',
                  checked
                    ? 'border-primary ring-2 ring-primary/25 ring-offset-2'
                    : 'border-neutral/15 hover:border-neutral/35',
                )}
                style={{ backgroundColor: color.hex }}
              />
            )
          })}
        </div>
      </div>

      {/* Size */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-neutral">Size</h3>
        <div className="grid grid-cols-4 gap-2">
          {allSizes.map((size) => {
            const checked = selectedSizes.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => onToggleSize(size)}
                aria-pressed={checked}
                className={cn(
                  'rounded-lg border py-2 text-xs font-medium transition',
                  checked
                    ? 'border-primary bg-primary text-white'
                    : 'border-neutral/15 text-neutral hover:border-primary/40',
                )}
              >
                {size}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-neutral">Price</h3>
        <input
          type="range"
          min={priceFloor}
          max={priceCeil}
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="mt-2 flex justify-between text-xs text-neutral/50">
          <span>£{priceFloor}</span>
          <span className="font-medium text-neutral">Up to £{maxPrice}</span>
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-neutral">Availability</h3>
        <button
          type="button"
          onClick={() => onInStockChange(!inStockOnly)}
          aria-pressed={inStockOnly}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1 transition hover:bg-tertiary/50"
        >
          <span className="text-sm text-neutral">In stock only</span>
          <span
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition',
              inStockOnly ? 'bg-primary' : 'bg-neutral/20',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                inStockOnly ? 'left-4' : 'left-0.5',
              )}
            />
          </span>
        </button>
      </div>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 text-xs font-medium capitalize text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="p-0.5 hover:bg-primary/20 transition"
      >
        <X size={12} />
      </button>
    </span>
  )
}

