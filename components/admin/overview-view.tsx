"use client";

import { useMemo } from "react";
import { CircleAlert, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import { Currency, Order, Product } from "@/lib/types";
import { deriveCustomers } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/pricing";
import { StatCard, StatusBadge } from "./admin-ui";
import type { AdminView } from "./types";

export function OverviewView({
  orders,
  products,
  onNavigate,
}: {
  orders: Order[];
  products: Product[];
  onNavigate: (view: AdminView) => void;
}) {
  const insights = useMemo(() => {
    // Orders are placed in whichever currency their gateway settled in
    // (Paystack -> NGN, Stripe -> GBP/USD) — there's no real exchange rate
    // in this mock app to convert between them, so revenue is kept broken
    // out by currency rather than summed into one misleading number.
    const revenueByCurrency = orders.reduce<Partial<Record<Currency, number>>>((sums, order) => {
      sums[order.currency] = (sums[order.currency] ?? 0) + order.total_amount;
      return sums;
    }, {});
    const currencyOrder: Currency[] = ["GBP", "USD", "NGN"];
    const totalRevenueDisplay =
      currencyOrder
        .filter((currency) => revenueByCurrency[currency] !== undefined)
        .map((currency) => formatCurrency(revenueByCurrency[currency]!, currency))
        .join(" + ") || formatCurrency(0, "GBP");
    const lowStockProducts = products.filter((p) => p.stock_qty <= p.low_stock_threshold);
    const featuredProducts = products.filter((p) => p.featured);
    const unshippedOrders = orders.filter((o) => o.status === "unshipped");
    const customers = deriveCustomers(orders);
    const repeatCustomers = customers.filter((c) => c.orderCount > 1);

    return { totalRevenueDisplay, lowStockProducts, featuredProducts, unshippedOrders, customers, repeatCustomers };
  }, [orders, products]);

  const recentOrders = [...orders]
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <button onClick={() => onNavigate("orders")} className="text-left">
          <StatCard
            title="Total Sales"
            value={insights.totalRevenueDisplay}
            subLabel={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
            icon={TrendingUp}
          />
        </button>
        <button onClick={() => onNavigate("orders")} className="text-left">
          <StatCard
            title="Orders"
            value={orders.length.toString()}
            subLabel={`${insights.unshippedOrders.length} unshipped`}
            icon={ShoppingCart}
          />
        </button>
        <button onClick={() => onNavigate("inventory")} className="text-left">
          <StatCard
            title="Inventory"
            value={`${insights.lowStockProducts.length} Low Stock`}
            subLabel={`${products.length} products total`}
            icon={CircleAlert}
          />
        </button>
        <button onClick={() => onNavigate("customers")} className="text-left">
          <StatCard
            title="Customers"
            value={insights.customers.length.toString()}
            subLabel={`${insights.repeatCustomers.length} repeat`}
            icon={Users}
          />
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)]">
        <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">Recent Orders</h2>
              <p className="text-sm text-neutral-500">The most recently placed orders</p>
            </div>
            <button
              onClick={() => onNavigate("orders")}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-primary hover:text-primary"
            >
              View all orders
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:grid">
              <span>Order</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Status</span>
              <span>Payment</span>
            </div>

            <div className="divide-y divide-neutral-200 bg-white">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{order.tracking_id}</p>
                    <p className="text-xs text-neutral-500">
                      {order.created_at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{order.customer_name}</p>
                    <p className="text-xs text-neutral-500">{order.customer_email}</p>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatCurrency(order.total_amount, order.currency)}
                  </p>
                  <StatusBadge status={order.status} />
                  <p className="text-sm text-neutral-600">{order.payment_gateway}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            Showing {recentOrders.length} of {orders.length} orders
          </p>
        </div>

        <aside className="space-y-6">
          <div className="rounded-none border border-neutral-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-neutral-900">Featured Products</h2>
              <p className="text-sm text-neutral-500">Flagged as featured on the storefront</p>
            </div>

            <div className="space-y-4">
              {insights.featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
                    <p className="text-xs text-neutral-500">{product.stock_qty} in stock</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((product.stock_qty / 200) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary">£{product.price_gbp.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-none border border-amber-200 bg-amber-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <CircleAlert size={16} />
              <p className="text-sm font-semibold">Insight</p>
            </div>
            <p className="text-sm leading-6 text-amber-950/80">
              {insights.lowStockProducts.length > 0
                ? `${insights.lowStockProducts[0].name} is close to the reorder threshold. Restock before the weekend spike.`
                : "Inventory is healthy across the catalog."}
            </p>
          </div>

          <div className="rounded-none border border-neutral-200 bg-neutral-950 p-5 text-white">
            <div className="mb-4 flex items-center gap-2">
              <Store size={16} />
              <p className="text-sm font-semibold">Storefront Snapshot</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-white/60">Products</p>
                <p className="mt-1 text-2xl font-semibold">{products.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-white/60">Featured</p>
                <p className="mt-1 text-2xl font-semibold">{insights.featuredProducts.length}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
