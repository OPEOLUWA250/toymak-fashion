import { getServerOrders } from "./order-store";
import { Order } from "../types";

/**
 * Guest order access. There are no customer accounts: an order is proven by
 * the checkout email plus its order number (tracking ID, e.g. TMK-AB12CD),
 * which only the customer has — it's on the success page and in the
 * confirmation email. Email alone is never enough, since that would expose
 * a stranger's address and phone to anyone who knows their email.
 */
export function normalizeOrderNumber(value: string): string {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "");
  return compact.startsWith("TMK-") ? compact : `TMK-${compact}`;
}

export function parseGuestCredentials(email: unknown, orderNumber: unknown): { email: string; orderNumber: string } | null {
  if (typeof email !== "string" || typeof orderNumber !== "string") return null;
  const trimmedEmail = email.trim();
  if (trimmedEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) return null;
  if (!orderNumber.trim() || orderNumber.length > 40) return null;
  return { email: trimmedEmail, orderNumber: normalizeOrderNumber(orderNumber) };
}

export async function findGuestOrders(email: string, orderNumber: string, orderId?: string): Promise<Order[]> {
  const orders = await getServerOrders(email);
  return orders.filter(
    (order) =>
      order.customer_email.trim().toLowerCase() === email.trim().toLowerCase() &&
      order.tracking_id.toUpperCase() === normalizeOrderNumber(orderNumber) &&
      (!orderId || order.id === orderId),
  );
}
