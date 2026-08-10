"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Order, OrderStatus } from "@/lib/types";
import { StatusBadge } from "./admin-ui";

const statusFilters: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Out for delivery", value: "out-for-delivery" },
  { label: "Delivered", value: "delivered" },
];

export function OrdersView({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...orders]
      .filter((order) => statusFilter === "all" || order.status === statusFilter)
      .filter(
        (order) =>
          !query ||
          order.tracking_id.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query),
      )
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }, [orders, statusFilter, search]);

  return (
    <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] lg:p-6">
      <div className="mb-5 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Orders</h2>
          <p className="text-sm text-neutral-500">Every order placed on the storefront</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
            <Search size={14} className="text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking ID or customer"
              className="w-56 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.9fr_0.8fr_auto] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:grid">
          <span>Order</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Status</span>
          <span>Payment</span>
          <span>Items</span>
        </div>

        <div className="divide-y divide-neutral-200 bg-white">
          {filtered.map((order) => {
            const expanded = expandedId === order.id;
            return (
              <div key={order.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="grid w-full grid-cols-1 gap-3 px-4 py-4 text-left transition hover:bg-neutral-50 sm:grid-cols-[1.2fr_1fr_1fr_0.9fr_0.8fr_auto] sm:items-center"
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
                  <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    <ChevronDown
                      size={14}
                      className={`transition ${expanded ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-2 border-t border-neutral-100 bg-neutral-50 px-4 py-4">
                    {order.items.map((item) => (
                      <div
                        key={`${item.product_id}-${item.size}-${item.color}`}
                        className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-neutral-900">{item.product_name}</p>
                          <p className="text-xs text-neutral-500">
                            Size {item.size} · {item.color} · Qty {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-neutral-900">£{item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 pt-1 text-xs text-neutral-500">
                      <span>Shipping: £{order.shipping_cost.toFixed(2)}</span>
                      <span>Tax: £{order.tax.toFixed(2)}</span>
                      {order.discount_applied > 0 && <span>Discount: £{order.discount_applied.toFixed(2)}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              No orders match that search or filter.
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Showing {filtered.length} of {orders.length} orders
      </p>
    </div>
  );
}
