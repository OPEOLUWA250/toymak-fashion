"use client";

import { useMemo } from "react";
import { CircleAlert, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import { Order, Product } from "@/lib/types";
import { deriveCustomers } from "@/lib/admin-data";
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
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const lowStockProducts = products.filter((p) => p.stock_qty <= p.low_stock_threshold);
    const featuredProducts = products.filter((p) => p.featured);
    const processingOrders = orders.filter((o) => o.status === "processing");
    const customers = deriveCustomers(orders);
    const repeatCustomers = customers.filter((c) => c.orderCount > 1);

    return { totalRevenue, lowStockProducts, featuredProducts, processingOrders, customers, repeatCustomers };
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
            value={`£${insights.totalRevenue.toFixed(2)}`}
            subLabel={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
            icon={TrendingUp}
          />
        </button>
        <button onClick={() => onNavigate("orders")} className="text-left">
          <StatCard
            title="Orders"
            value={orders.length.toString()}
            subLabel={`${insights.processingOrders.length} processing`}
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
        <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] lg:p-6">
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
                  <p className="text-sm font-semibold text-neutral-900">£{order.total_amount.toFixed(2)}</p>
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
          <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
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

          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]">
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

          <div className="rounded-[1.75rem] border border-neutral-200 bg-neutral-950 p-5 text-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
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
