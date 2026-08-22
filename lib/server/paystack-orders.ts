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
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const data = await response.json();

  if (!response.ok || !data.status || data.data?.status !== "success") {
    return null;
  }

  const tx = data.data;
  const metadata = tx.metadata ?? {};

  return {
    status: "success",
    customerEmail: tx.customer?.email ?? "",
    customerName: metadata.customer_name ?? "Guest",
    customerPhone: metadata.customer_phone ?? "",
    shippingAddress: metadata.shipping_address,
    orderItems: metadata.order_items ?? [],
    subtotal: metadata.subtotal ?? 0,
    shippingCost: metadata.shipping_cost ?? 0,
    tax: metadata.tax ?? 0,
    total: metadata.total ?? (tx.amount ?? 0) / 100,
  };
}
