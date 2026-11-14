import type { ShippingMethod } from './shipping'
import type { RoyalMailOrderRecord } from './royal-mail'

// Category ids (slugs) are managed by admins — see lib/categories.ts.
export type ProductCategory = string

export interface Category {
  id: string
  label: string
}
// The store's own status ends at "shipped". After that, Royal Mail's own
// tracking (order.tracking_number) or the carrier's link takes over.
export type OrderStatus = 'unshipped' | 'shipped'
export type Currency = 'GBP' | 'NGN' | 'USD'
export type PaymentGateway = 'stripe' | 'paystack'
export type DiscountType = 'percentage' | 'fixed'
export type Rating = 1 | 2 | 3 | 4 | 5

export interface Color {
  name: string
  hex: string
  inventory: number
}

export interface Product {
  status?: 'active' | 'draft' | 'archived'
  variants?: { size: string; color: string; stock: number }[]
  id: string
  name: string
  description: string
  longDescription?: string
  price_gbp: number
  price_ngn: number
  price_usd?: number
  /** Shipping weight for one item, in kilograms. */
  weight_kg?: number
  compare_at_price_gbp?: number
  category: ProductCategory
  sizes: string[]
  colors: Color[]
  stock_qty: number
  low_stock_threshold: number
  sku: string
  images: string[]
  /** Product-specific size chart image; null once an admin removes it. */
  sizeGuideImage?: string | null
  featured: boolean
  created_at: Date
  updated_at: Date
}

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  size: string
  color: string
  price_at_addition: number
  image_url: string
  /** Snapshot for display/backward-compatible saved carts; checkout re-reads the product. */
  weight_kg?: number
}

export interface Address {
  fullName: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  /** Absent on orders placed before customers could choose express. */
  shippingMethod?: ShippingMethod
}

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  size: string
  color: string
  unit_price: number
  subtotal: number
  /** Shipping weight for one item, in kilograms. */
  weight_kg?: number
}

export interface Order {
  refunded_amount?: number
  fulfillment_issue?: string | null
  id: string
  tracking_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: Address
  status: OrderStatus
  /** Third-party carrier tracking URL, added by admin when marking an order as shipped. */
  tracking_link?: string
  /** Royal Mail tracking number, from Click & Drop or typed in by an admin. */
  tracking_number?: string
  /** The order in Royal Mail Click & Drop (lib/server/royal-mail-orders.ts). Admin-only. */
  royal_mail?: RoyalMailOrderRecord | null
  /** When the customer was emailed that their order shipped. */
  shipped_email_sent_at?: string | null
  currency: Currency
  payment_gateway: PaymentGateway
  payment_reference: string
  items: OrderItem[]
  subtotal: number
  shipping_cost: number
  tax: number
  discount_applied: number
  total_amount: number
  created_at: Date
  updated_at: Date
}

/** Where a review was written: on this site, or on our TikTok Shop and copied here. */
export type ReviewSource = 'website' | 'tiktok'
export type ReviewFit = 'small' | 'as_expected' | 'large'

export interface Review {
  id: string
  /** Null for shop-wide reviews, which is all of them since reviews moved to /reviews. */
  product_id: string | null
  customer_name: string
  rating: Rating
  comment: string
  photo_urls: string[]
  approved: boolean
  source: ReviewSource
  /** A confirmed purchase: a matching order here, or TikTok Shop's own badge. */
  verified: boolean
  item_color: string | null
  item_size: string | null
  fit: ReviewFit | null
  /** Reviewer's country, e.g. "United Kingdom". */
  location: string | null
  created_at: Date
  updated_at: Date
}

export interface DiscountCode {
  id: string
  code: string
  type: DiscountType
  value: number
  expiry_date: Date
  usage_limit: number
  times_used: number
  active: boolean
  created_at: Date
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'new' | 'read'
  created_at: Date
}

export interface NewsletterSignup {
  id: string
  first_name: string
  last_name: string
  email: string
  coupon_code: string
  email_sent: boolean
  created_at: Date
}

export interface CheckoutState {
  currentStep: 1 | 2 | 3
  contact: {
    fullName: string
    email: string
    phone: string
  }
  shipping: Address | null
  paymentMethod: PaymentGateway | null
  currency: Currency
  discountCode: string | null
}
