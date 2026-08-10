import { Order } from "./types";

export interface AdminCustomer {
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: Date;
}

/**
 * There's no separate customer table in this mock dataset — every customer
 * is derived from who has actually placed an order, so the count here always
 * matches what's really in `mockOrders` rather than a made-up figure.
 */
export function deriveCustomers(orders: Order[]): AdminCustomer[] {
  const byEmail = new Map<string, AdminCustomer>();

  orders.forEach((order) => {
    const existing = byEmail.get(order.customer_email);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += order.total_amount;
      if (order.created_at > existing.lastOrderDate) {
        existing.lastOrderDate = order.created_at;
      }
      return;
    }

    byEmail.set(order.customer_email, {
      email: order.customer_email,
      name: order.customer_name,
      phone: order.customer_phone,
      orderCount: 1,
      totalSpent: order.total_amount,
      lastOrderDate: order.created_at,
    });
  });

  return Array.from(byEmail.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}
