import { Address, Currency, Order, OrderItem, PaymentGateway } from "./types";

export interface PaymentVerification {
  status: "success" | "failed";
  currency: Currency;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: Address;
  orderItems: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  discount: number;
  discountCode?: string;
}

/**
 * Turns a verified payment into an Order record. Used by both the client
 * (checkout/success, for the fast on-screen confirmation) and the webhook
 * routes (the durable, browser-independent record) so a given payment
 * always resolves to the exact same order id/tracking id — derived
 * deterministically from the payment reference — no matter which path
 * creates it first.
 *
 * Currency comes from `verification.currency` — i.e. what the gateway
 * itself actually charged (Stripe's own session.currency, or NGN for
 * Paystack) — never re-guessed from country/gateway at this point, so a
 * GBP vs USD Stripe charge can never get mislabeled.
 */
export function buildOrderFromVerification(
  paymentId: string,
  gateway: PaymentGateway,
  verification: PaymentVerification,
): Order {
  const shortRef = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

  return {
    id: `ord-${shortRef}`,
    tracking_id: `TMK-${shortRef}`,
    customer_name: verification.customerName || "Guest",
    customer_email: verification.customerEmail,
    customer_phone: verification.customerPhone,
    shipping_address: verification.shippingAddress,
    status: "unshipped",
    currency: verification.currency,
    payment_gateway: gateway,
    payment_reference: paymentId,
    items: verification.orderItems,
    subtotal: verification.subtotal,
    shipping_cost: verification.shippingCost,
    tax: verification.tax,
    discount_applied: verification.discount,
    total_amount: verification.total,
    created_at: new Date(),
    updated_at: new Date(),
  };
}
