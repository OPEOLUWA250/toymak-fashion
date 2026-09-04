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
 * Shared order store used by both the admin dashboard and the storefront
 * account page — backed entirely by GET /api/orders (Supabase) now, no more
 * localStorage/mock seed. addOrder is a local-only optimistic append so
 * /checkout/success can show the order immediately after
 * POST /api/orders/confirm succeeds, without waiting on a refetch; the
 * order itself is already durably saved server-side by that point.
 */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((response) => response.json())
      .then((data: { orders?: Order[] }) => {
        setOrders(reviveDates(data.orders ?? []));
      })
      .finally(() => setIsLoading(false));
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
        const data = (await response.json()) as { order?: Order };
        if (data.order) {
          const updated = reviveDates([data.order])[0];
          setOrders((current) => current.map((o) => (o.id === updated.id ? updated : o)));
        }
      },
    }),
    [],
  );

  return { orders, isLoading, ...actions };
}
