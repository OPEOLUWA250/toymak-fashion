"use client";

import { useEffect } from "react";
import { useOrders } from "./use-orders";
import { useAdminProducts } from "./use-admin-products";
import { mockOrders } from "./mock-orders";

const APPLIED_KEY = "toymak-stock-applied-refs";

// The seed orders represent backstory, not new sales — stock_qty in the
// mock catalog was authored assuming those already happened, so they're
// excluded here rather than depleting stock retroactively the first time
// any browser runs this.
const seedOrderRefs = new Set(mockOrders.map((order) => order.payment_reference));

/**
 * Depletes stock_qty for every real order this browser hasn't already
 * applied, tracked by payment_reference so it's safe to call from multiple
 * pages (checkout/success for the common case, admin for orders that only
 * ever arrived via webhook) without double-decrementing.
 */
export function useStockSync() {
  const { orders } = useOrders();
  const { decrementStock } = useAdminProducts();

  useEffect(() => {
    if (orders.length === 0) return;

    let applied: string[] = [];
    try {
      applied = JSON.parse(localStorage.getItem(APPLIED_KEY) ?? "[]");
    } catch {
      applied = [];
    }

    const appliedSet = new Set(applied);
    const newlyConfirmed = orders.filter(
      (order) => !appliedSet.has(order.payment_reference) && !seedOrderRefs.has(order.payment_reference),
    );
    if (newlyConfirmed.length === 0) return;

    newlyConfirmed.forEach((order) => decrementStock(order.items));

    localStorage.setItem(
      APPLIED_KEY,
      JSON.stringify([...appliedSet, ...newlyConfirmed.map((order) => order.payment_reference)]),
    );
  }, [orders, decrementStock]);
}
