"use client";

import { useEffect, useMemo, useState } from "react";
import { Order, OrderStatus } from "./types";
import { mockOrders } from "./mock-orders";

const STORAGE_KEY = "toymak-orders";

function reviveDates(orders: Order[]): Order[] {
  return orders.map((order) => ({
    ...order,
    created_at: new Date(order.created_at),
    updated_at: new Date(order.updated_at),
  }));
}

/**
 * Shared order store used by both the admin dashboard and the storefront
 * account page, so a status/tracking-link update made by admin is
 * immediately visible to a customer looking up their order — there's no
 * real backend yet, so localStorage is the single source of truth both
 * sides read from.
 */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOrders(reviveDates(JSON.parse(saved)));
      } catch {
        // ignore corrupt local data, fall back to mock seed
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders, isHydrated]);

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
      updateOrderStatus: (orderId: string, status: OrderStatus, trackingLink?: string) => {
        setOrders((current) =>
          current.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status,
                  tracking_link: trackingLink !== undefined ? trackingLink : order.tracking_link,
                  updated_at: new Date(),
                }
              : order,
          ),
        );
      },
    }),
    [],
  );

  return { orders, ...actions };
}
