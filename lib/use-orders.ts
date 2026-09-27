"use client";

import { useEffect, useMemo, useState } from "react";
import { Order, OrderStatus } from "./types";

function reviveDates(orders: Order[]): Order[] {
  return orders.map((order) => ({
    ...order,
    created_at: new Date(order.created_at),
    updated_at: new Date(order.updated_at),
  }));
}

/**
 * Admin dashboard order store, backed by GET /api/orders (Supabase).
 * Customers have no accounts — they look up a single order by email + order
 * number via POST /api/orders/lookup instead. addOrder is a local-only
 * append for orders arriving through the live admin event stream.
 */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch("/api/orders", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load orders. Please refresh to try again.");
        return response.json();
      })
      .then((data: { orders?: Order[] }) => {
        if (!Array.isArray(data.orders)) throw new Error("Unable to load orders. Please refresh to try again.");
        if (controller.signal.aborted) return;
        const loaded = reviveDates(data.orders);
        // Preserve any confirmed order received through the live event
        // stream while this initial request was still in flight.
        setOrders((current) => [...loaded, ...current.filter((order) => !loaded.some((saved) =>
          saved.id === order.id || (saved.payment_reference === order.payment_reference && saved.payment_gateway === order.payment_gateway),
        ))]);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Unable to load orders. Please refresh to try again."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, []);

  const actions = useMemo(
    () => ({
      addOrder: (order: Order) => {
        setOrders((current) => {
          if (current.some((existing) => existing.payment_reference === order.payment_reference)) {
            return current;
          }
          return [order, ...current];
        });
      },
      updateOrderStatus: async (orderId: string, status: OrderStatus, trackingLink?: string) => {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, trackingLink }),
        });
        const data = (await response.json()) as { order?: Order; error?: string };
        if (!response.ok || !data.order) throw new Error(data.error ?? "Could not update this order. Please try again.");
        if (data.order) {
          const updated = reviveDates([data.order])[0];
          setOrders((current) => current.map((o) => (o.id === updated.id ? updated : o)));
        }
      },
    }),
    [],
  );

  return { orders, isLoading, error, ...actions };
}
