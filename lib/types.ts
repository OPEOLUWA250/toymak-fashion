export type ProductCategory = 'shapewear' | 'waist-trainer' | 'bra' | 'accessories' | 'tops'
export type OrderStatus = 'unshipped' | 'shipped' | 'out-for-delivery' | 'delivered'
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
  id: string
  name: string
  description: string
  longDescription?: string
  price_gbp: number
  price_ngn: number
  price_usd?: number
  compare_at_price_gbp?: number
  category: ProductCategory
  sizes: string[]
  colors: Color[]
  stock_qty: number
  low_stock_threshold: number
  sku: string
  images: string[]
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
}

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  size: string
  color: string
  unit_price: number
  subtotal: number
}

export interface Order {
  id: string
  tracking_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: Address
  status: OrderStatus
  /** Third-party carrier tracking URL, added by admin when marking an order as shipped. */
  tracking_link?: string
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

export interface Review {
  id: string
  product_id: string
  customer_name: string
  rating: Rating
  comment: string
  photo_urls: string[]
  approved: boolean
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

export interface NewsletterSignup {
  id: string
  first_name: string
  last_name: string
  email: string
  coupon_code: string
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
