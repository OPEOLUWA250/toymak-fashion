import { verifyCheckoutSnapshot } from "./checkout-snapshots";
import { PaymentVerification } from "@/lib/order-builder";

export function getPaystackSecretKey(): string {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Paystack isn't configured yet. Add PAYSTACK_SECRET_KEY to .env.local.");
  }
  return secretKey;
}

/**
 * Calls Paystack's verify endpoint and normalizes the result. Shared by the
 * client-facing verify route and the webhook route so a payment resolves
 * to the exact same order data no matter which one processes it first.
 * Returns null for anything that isn't a confirmed successful transaction.
 */
export async function verifyPaystackTransaction(
  reference: string,
): Promise<PaymentVerification | null> {
  const secretKey = getPaystackSecretKey();

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    // Bounded so a slow Paystack can't hang the request until the function
    // times out; the webhook's 500 then lets Paystack retry later.
    { headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(15_000) },
  );
  const data = await response.json();

  // A failed verification request is not evidence of an unpaid transaction.
  // Throw so the webhook returns 500 and Paystack retries delivery.
  if (!response.ok || data.status !== true || typeof data.data?.status !== "string") {
    throw new Error("Payment verification is temporarily unavailable. Please try again.");
  }
  if (data.data.status !== "success") {
    return null;
  }

  const tx = data.data;
  const metadata = tx.metadata ?? {};
  if (metadata.checkout_snapshot_id) return verifyCheckoutSnapshot(metadata.checkout_snapshot_id, "paystack", tx.amount, tx.currency);
  if (tx.currency !== "NGN") throw new Error("Unexpected payment currency.");

  return {
    status: "success",
    currency: "NGN",
    customerEmail: tx.customer?.email ?? "",
    customerName: metadata.customer_name ?? "Guest",
    customerPhone: metadata.customer_phone ?? "",
    shippingAddress: metadata.shipping_address,
    orderItems: metadata.order_items ?? [],
    subtotal: metadata.subtotal ?? 0,
    shippingCost: metadata.shipping_cost ?? 0,
    tax: metadata.tax ?? 0,
    total: (tx.amount ?? 0) / 100,
    discount: metadata.discount ?? 0,
    discountCode: metadata.discount_code || undefined,
  };
}
