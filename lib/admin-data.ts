import { Currency, Order } from "./types";

export interface AdminCustomer {
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpentByCurrency: Partial<Record<Currency, number>>;
  lastOrderDate: Date;
}

/**
 * There's no separate customers table — every customer is derived from who
 * has actually placed an order, so the count here always matches the real
 * orders table rather than a separately-maintained figure.
 */
export function deriveCustomers(orders: Order[]): AdminCustomer[] {
  const byEmail = new Map<string, AdminCustomer>();
  const seenIds = new Set<string>();
  const seenPayments = new Set<string>();

  orders.forEach((order) => {
    const paymentKey = order.payment_reference ? `${order.payment_gateway}:${order.payment_reference}` : null;
    if (seenIds.has(order.id) || (paymentKey && seenPayments.has(paymentKey))) return;
    seenIds.add(order.id);
    if (paymentKey) seenPayments.add(paymentKey);

    const email = order.customer_email.trim().toLowerCase();
    const existing = byEmail.get(email);
    // Sum the recorded, final order amounts in minor units. Never add
    // different currencies together or subtract the discount a second time.
    const amountInMinorUnits = Math.max(0, Math.round(order.total_amount * 100) - Math.round((order.refunded_amount ?? 0) * 100));
    if (existing) {
      existing.orderCount += 1;
      const previous = Math.round((existing.totalSpentByCurrency[order.currency] ?? 0) * 100);
      existing.totalSpentByCurrency[order.currency] = (previous + amountInMinorUnits) / 100;
      if (order.created_at > existing.lastOrderDate) {
        existing.lastOrderDate = order.created_at;
        existing.name = order.customer_name;
        existing.phone = order.customer_phone;
      }
      return;
    }

    byEmail.set(email, {
      email,
      name: order.customer_name,
      phone: order.customer_phone,
      orderCount: 1,
      totalSpentByCurrency: { [order.currency]: amountInMinorUnits / 100 },
      lastOrderDate: order.created_at,
    });
  });

  // Recency is comparable across currencies; spending is not.
  return Array.from(byEmail.values()).sort((a, b) =>
    b.lastOrderDate.getTime() - a.lastOrderDate.getTime() || a.email.localeCompare(b.email),
  );
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
    bucket.revenue[order.currency] = (bucket.revenue[order.currency] ?? 0) + Math.max(0, order.total_amount - (order.refunded_amount ?? 0));
  });

  return Array.from(buckets.values());
}
