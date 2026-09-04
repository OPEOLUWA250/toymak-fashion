import { Currency, Order } from "./types";

export interface AdminCustomer {
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: Date;
}

/**
 * There's no separate customers table — every customer is derived from who
 * has actually placed an order, so the count here always matches the real
 * orders table rather than a separately-maintained figure.
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

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // "20 Aug"
  orderCount: number;
  revenue: Partial<Record<Currency, number>>;
}

/**
 * One bucket per calendar day over the trailing `days` days (including
 * today), even for days with zero orders — a real trend chart needs the
 * gaps, not just the days that happened to have activity. Revenue is kept
 * broken out by currency for the same reason it is on the overview card:
 * orders settle in whatever currency their gateway charged, and summing
 * across currencies would be a meaningless number.
 */
export function deriveSalesTrend(orders: Order[], days: number): DailyTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, DailyTrendPoint>();
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      orderCount: 0,
      revenue: {},
    });
  }

  orders.forEach((order) => {
    const key = order.created_at.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return; // outside the selected range
    bucket.orderCount += 1;
    bucket.revenue[order.currency] = (bucket.revenue[order.currency] ?? 0) + order.total_amount;
  });

  return Array.from(buckets.values());
}
