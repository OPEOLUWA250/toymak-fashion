'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Boxes,
  ChevronDown,
  CircleAlert,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  Menu,
  Package,
  PanelLeftClose,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { mockProducts } from '@/lib/mock-products'
import { Order, OrderStatus } from '@/lib/types'

const orders: Order[] = [
  {
    id: 'ord-9281',
    tracking_id: 'TMK-9281',
    customer_name: 'Elena Vance',
    customer_email: 'elena@example.com',
    customer_phone: '+44 7700 900111',
    shipping_address: {
      fullName: 'Elena Vance',
      email: 'elena@example.com',
      phone: '+44 7700 900111',
      street: '12 King Street',
      city: 'London',
      state: 'Greater London',
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    status: 'processing',
    currency: 'GBP',
    payment_gateway: 'stripe',
    payment_reference: 'pi_3QTMK9281',
    items: [
      {
        product_id: 'prod-001',
        product_name: 'Full Body Shaper Bra',
        quantity: 1,
        size: 'M',
        color: 'Nude',
        unit_price: 89.99,
        subtotal: 89.99,
      },
    ],
    subtotal: 89.99,
    shipping_cost: 8,
    tax: 0,
    discount_applied: 0,
    total_amount: 97.99,
    created_at: new Date('2026-07-19T09:24:00'),
    updated_at: new Date('2026-07-19T09:24:00'),
  },
  {
    id: 'ord-9275',
    tracking_id: 'TMK-9275',
    customer_name: 'Marcus Thorne',
    customer_email: 'marcus@example.com',
    customer_phone: '+44 7700 900222',
    shipping_address: {
      fullName: 'Marcus Thorne',
      email: 'marcus@example.com',
      phone: '+44 7700 900222',
      street: '88 Camden Road',
      city: 'Manchester',
      state: 'Greater Manchester',
      postalCode: 'M1 4BT',
      country: 'United Kingdom',
    },
    status: 'shipped',
    currency: 'GBP',
    payment_gateway: 'paystack',
    payment_reference: 'ps_4TMK9275',
    items: [
      {
        product_id: 'prod-002',
        product_name: 'Waist Trainer Pro',
        quantity: 1,
        size: 'L',
        color: 'Black',
        unit_price: 65,
        subtotal: 65,
      },
    ],
    subtotal: 65,
    shipping_cost: 6.5,
    tax: 0,
    discount_applied: 0,
    total_amount: 71.5,
    created_at: new Date('2026-07-19T08:11:00'),
    updated_at: new Date('2026-07-19T10:02:00'),
  },
  {
    id: 'ord-9269',
    tracking_id: 'TMK-9269',
    customer_name: 'Lila Rosier',
    customer_email: 'lila@example.com',
    customer_phone: '+44 7700 900333',
    shipping_address: {
      fullName: 'Lila Rosier',
      email: 'lila@example.com',
      phone: '+44 7700 900333',
      street: '44 Portland Place',
      city: 'Birmingham',
      state: 'West Midlands',
      postalCode: 'B1 2JT',
      country: 'United Kingdom',
    },
    status: 'delivered',
    currency: 'GBP',
    payment_gateway: 'stripe',
    payment_reference: 'pi_3QTMK9269',
    items: [
      {
        product_id: 'prod-003',
        product_name: 'Seamless Bodysuit',
        quantity: 2,
        size: 'S',
        color: 'Nude',
        unit_price: 54.99,
        subtotal: 109.98,
      },
    ],
    subtotal: 109.98,
    shipping_cost: 0,
    tax: 0,
    discount_applied: 10,
    total_amount: 99.98,
    created_at: new Date('2026-07-18T16:45:00'),
    updated_at: new Date('2026-07-19T08:30:00'),
  },
  {
    id: 'ord-9260',
    tracking_id: 'TMK-9260',
    customer_name: 'Sarah Monroe',
    customer_email: 'sarah@example.com',
    customer_phone: '+44 7700 900444',
    shipping_address: {
      fullName: 'Sarah Monroe',
      email: 'sarah@example.com',
      phone: '+44 7700 900444',
      street: '7 Queen Victoria St',
      city: 'Leeds',
      state: 'West Yorkshire',
      postalCode: 'LS1 2HE',
      country: 'United Kingdom',
    },
    status: 'out-for-delivery',
    currency: 'GBP',
    payment_gateway: 'stripe',
    payment_reference: 'pi_3QTMK9260',
    items: [
      {
        product_id: 'prod-004',
        product_name: 'Sculpting Tank Top',
        quantity: 1,
        size: 'M',
        color: 'Black',
        unit_price: 45,
        subtotal: 45,
      },
    ],
    subtotal: 45,
    shipping_cost: 5,
    tax: 0,
    discount_applied: 0,
    total_amount: 50,
    created_at: new Date('2026-07-18T14:20:00'),
    updated_at: new Date('2026-07-19T11:18:00'),
  },
]

const navItems = [
  { label: 'Overview', icon: LayoutGrid },
  { label: 'Orders', icon: ShoppingCart },
  { label: 'Products', icon: Package },
  { label: 'Customers', icon: Users },
  { label: 'Inventory', icon: Boxes },
  { label: 'Settings', icon: Settings },
]

const statusStyles: Record<OrderStatus, string> = {
  processing: 'bg-fuchsia-100 text-fuchsia-700',
  shipped: 'bg-amber-100 text-amber-700',
  'out-for-delivery': 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string
  value: string
  change: string
  icon: typeof TrendingUp
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon size={18} />
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          {change}
        </span>
      </div>
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {status.replace(/-/g, ' ')}
    </span>
  )
}

export default function AdminPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const insights = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
    const lowStockProducts = mockProducts.filter((product) => product.stock_qty <= product.low_stock_threshold)
    const featuredProducts = mockProducts.filter((product) => product.featured)

    return {
      totalRevenue,
      lowStockProducts,
      featuredProducts,
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f6f1f8] text-neutral-900">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(230,0,229,0.16),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] lg:gap-6 lg:p-6">
        <aside className="hidden w-72 shrink-0 rounded-4xl border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_-40px_rgba(59,18,72,0.5)] lg:block">
          <div className="mb-8">
            <p className="font-serif text-2xl font-bold text-neutral-900">Toymak Admin</p>
            <p className="text-sm text-neutral-500">Management suite</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <button
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  index === 0
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-neutral-600 hover:bg-primary/8 hover:text-primary'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl bg-linear-to-br from-primary to-fuchsia-500 p-5 text-white">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles size={18} />
              <p className="text-sm font-medium">Pro Access</p>
            </div>
            <p className="text-sm/6 text-white/85">Launch new campaigns, review performance, and keep stock moving.</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-primary transition hover:bg-white/90"
            >
              View Storefront
            </Link>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute left-0 top-0 h-full w-[85vw] max-w-sm bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="font-serif text-2xl font-bold">Toymak Admin</p>
                  <p className="text-sm text-neutral-500">Management suite</p>
                </div>
                <button
                  className="rounded-full border border-neutral-200 p-2"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item, index) => (
                  <button
                    key={item.label}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      index === 0 ? 'bg-primary text-white' : 'bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 rounded-3xl bg-neutral-950 p-5 text-white">
                <p className="font-medium">Quick Actions</p>
                <div className="mt-4 space-y-3 text-sm text-white/80">
                  <p>• Review yesterday's orders</p>
                  <p>• Approve low-stock alerts</p>
                  <p>• Export product catalog</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="flex-1 px-4 pb-10 pt-4 lg:px-0 lg:pt-0">
          <div className="rounded-4xl border border-white/70 bg-white/80 shadow-[0_20px_80px_-40px_rgba(59,18,72,0.45)] backdrop-blur">
            <div className="flex flex-col gap-6 border-b border-neutral-200/70 px-5 py-5 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-4 xl:justify-start">
                <div>
                  <p className="text-sm font-medium text-primary">Dashboard Overview</p>
                  <h1 className="font-serif text-3xl font-bold text-neutral-900">Good morning, Toymak team</h1>
                  <p className="mt-1 text-sm text-neutral-500">A responsive control center for sales, stock, and fulfillment.</p>
                </div>

                <button
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-3 xl:max-w-2xl xl:flex-row xl:items-center xl:justify-end">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                  <Search size={16} className="text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by order ID, product, customer"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  />
                </div>
                <div className="flex items-center gap-2 self-end xl:self-auto">
                  <button className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm">
                    <Bell size={16} />
                  </button>
                  <button className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm">
                    <PanelLeftClose size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8 px-5 py-6 lg:px-8">
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <StatCard title="Total Sales" value={`£${insights.totalRevenue.toFixed(2)}`} change="+12.5%" icon={TrendingUp} />
                <StatCard title="New Orders" value={orders.length.toString()} change="+8%" icon={ShoppingCart} />
                <StatCard title="Inventory" value={`${insights.lowStockProducts.length} Low Stock`} change="4 alerts" icon={CircleAlert} />
                <StatCard title="Customer Growth" value="1,204" change="+24%" icon={Users} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] lg:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-neutral-900">Recent Orders</h2>
                        <p className="text-sm text-neutral-500">Live order queue and payment status</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                          <Filter size={14} />
                          Filters
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                          <Download size={14} />
                          Export
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-neutral-200">
                      <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                        <span>Order</span>
                        <span>Customer</span>
                        <span>Total</span>
                        <span>Status</span>
                        <span>Payment</span>
                        <span>Action</span>
                      </div>

                      <div className="divide-y divide-neutral-200 bg-white">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.7fr] sm:items-center"
                          >
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{order.tracking_id}</p>
                              <p className="text-xs text-neutral-500">{order.created_at.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{order.customer_name}</p>
                              <p className="text-xs text-neutral-500">{order.customer_email}</p>
                            </div>
                            <p className="text-sm font-semibold text-neutral-900">£{order.total_amount.toFixed(2)}</p>
                            <StatusBadge status={order.status} />
                            <p className="text-sm text-neutral-600">{order.payment_gateway}</p>
                            <button className="inline-flex items-center gap-2 justify-start rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 sm:justify-center">
                              <Eye size={14} />
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
                      <p>Showing 1 to {orders.length} of 1,240 orders</p>
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-neutral-200 px-3 py-2">1</button>
                        <button className="rounded-lg border border-primary bg-primary px-3 py-2 text-white">2</button>
                        <button className="rounded-lg border border-neutral-200 px-3 py-2">3</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {mockProducts.slice(0, 3).map((product, index) => (
                      <article
                        key={product.id}
                        className={`rounded-3xl border p-5 shadow-[0_16px_45px_-35px_rgba(0,0,0,0.3)] ${
                          index === 0
                            ? 'border-primary/20 bg-linear-to-br from-white to-fuchsia-50'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Product</p>
                            <h3 className="mt-1 font-serif text-lg font-bold text-neutral-900">{product.name}</h3>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            {product.stock_qty} in stock
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500">{product.description}</p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min((product.stock_qty / 200) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-neutral-500">SKU</span>
                          <span className="font-medium text-neutral-900">{product.sku}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="space-y-6">
                  <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-neutral-900">Top Selling</h2>
                        <p className="text-sm text-neutral-500">Best performers this week</p>
                      </div>
                      <button className="rounded-lg border border-neutral-200 p-2 text-neutral-500">
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {insights.featuredProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3">
                          <img src={product.images[0]} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
                            <p className="text-xs text-neutral-500">{product.stock_qty} sold</p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${80 - index * 14}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-primary">£{product.price_gbp.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]">
                    <div className="mb-3 flex items-center gap-2 text-amber-700">
                      <CircleAlert size={16} />
                      <p className="text-sm font-semibold">Insight</p>
                    </div>
                    <p className="text-sm leading-6 text-amber-950/80">
                      {insights.lowStockProducts.length > 0
                        ? `${insights.lowStockProducts[0].name} is close to the reorder threshold. Restock before the weekend spike.`
                        : 'Inventory is healthy across the catalog.'}
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-neutral-200 bg-neutral-950 p-5 text-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
                    <div className="mb-4 flex items-center gap-2">
                      <Store size={16} />
                      <p className="text-sm font-semibold">Storefront Snapshot</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white/10 p-4">
                        <p className="text-white/60">Products</p>
                        <p className="mt-1 text-2xl font-semibold">{mockProducts.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-4">
                        <p className="text-white/60">Featured</p>
                        <p className="mt-1 text-2xl font-semibold">{insights.featuredProducts.length}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/75">
                      Keep the dashboard clean and decisive. The storefront and admin now speak the same design language.
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}