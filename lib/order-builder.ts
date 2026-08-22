import { Address, Currency, Order, OrderItem, PaymentGateway } from "./types";

export interface PaymentVerification {
  status: "success" | "failed";
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: Address;
  orderItems: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
}

/**
 * Turns a verified payment into an Order record. Used by both the client
 * (checkout/success, for the fast on-screen confirmation) and the webhook
 * routes (the durable, browser-independent record) so a given payment
 * always resolves to the exact same order id/tracking id — derived
 * deterministically from the payment reference — no matter which path
 * creates it first.
 */
export function buildOrderFromVerification(
  paymentId: string,
  gateway: PaymentGateway,
  currency: Currency,
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
    currency,
    payment_gateway: gateway,
    payment_reference: paymentId,
    items: verification.orderItems,
    subtotal: verification.subtotal,
    shipping_cost: verification.shippingCost,
    tax: verification.tax,
    discount_applied: 0,
    total_amount: verification.total,
    created_at: new Date(),
    updated_at: new Date(),
  };
}
