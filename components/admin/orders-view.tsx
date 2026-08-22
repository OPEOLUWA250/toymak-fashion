"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Link2, Search } from "lucide-react";
import { Order, OrderStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/pricing";
import { normalizeExternalUrl } from "@/lib/utils";
import { StatusBadge } from "./admin-ui";

const statusFilters: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Unshipped", value: "unshipped" },
  { label: "Shipped", value: "shipped" },
]

const statusOptions: { label: string; value: OrderStatus }[] = [
  { label: "Unshipped", value: "unshipped" },
  { label: "Shipped", value: "shipped" },
]

const requiresTrackingLink = (status: OrderStatus) => status !== "unshipped"

export function OrdersView({
  orders,
  onUpdateStatus,
}: {
  orders: Order[]
  onUpdateStatus: (orderId: string, status: OrderStatus, trackingLink?: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...orders]
      .filter((order) => statusFilter === "all" || order.status === statusFilter)
      .filter(
        (order) =>
          !query ||
          order.tracking_id.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query),
      )
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
  }, [orders, statusFilter, search])

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
            const expanded = expandedId === order.id
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
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatCurrency(order.total_amount, order.currency)}
                  </p>
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
                  <div className="space-y-4 border-t border-neutral-100 bg-neutral-50 px-4 py-4">
                    <div className="space-y-2">
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
                          <p className="font-semibold text-neutral-900">
                            {formatCurrency(item.subtotal, order.currency)}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 pt-1 text-xs text-neutral-500">
                        <span>Shipping: {formatCurrency(order.shipping_cost, order.currency)}</span>
                        <span>Tax: {formatCurrency(order.tax, order.currency)}</span>
                        {order.discount_applied > 0 && (
                          <span>Discount: {formatCurrency(order.discount_applied, order.currency)}</span>
                        )}
                      </div>
                    </div>

                    <OrderTrackingEditor order={order} onUpdateStatus={onUpdateStatus} />
                  </div>
                )}
              </div>
            )
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
  )
}

function OrderTrackingEditor({
  order,
  onUpdateStatus,
}: {
  order: Order
  onUpdateStatus: (orderId: string, status: OrderStatus, trackingLink?: string) => void
}) {
  const [draftStatus, setDraftStatus] = useState<OrderStatus>(order.status)
  const [draftLink, setDraftLink] = useState(order.tracking_link ?? "")
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const needsLink = requiresTrackingLink(draftStatus)
  const dirty = draftStatus !== order.status || draftLink !== (order.tracking_link ?? "")

  const handleSave = () => {
    if (needsLink && draftLink.trim() === "") {
      setError("Add the carrier's tracking link before marking this order as shipped.")
      return
    }
    setError(null)
    const normalizedLink = draftLink.trim() ? normalizeExternalUrl(draftLink) : undefined
    setDraftLink(normalizedLink ?? "")
    onUpdateStatus(order.id, draftStatus, normalizedLink)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <Link2 size={15} className="text-primary" />
        Tracking
      </div>

      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500">Status</label>
          <select
            value={draftStatus}
            onChange={(e) => {
              setDraftStatus(e.target.value as OrderStatus)
              setError(null)
            }}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500">
            Carrier tracking link {needsLink && <span className="text-primary">*</span>}
          </label>
          <input
            type="url"
            value={draftLink}
            onChange={(e) => {
              setDraftLink(e.target.value)
              setError(null)
            }}
            placeholder="https://www.royalmail.com/track-your-item#/tracking-results/..."
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save tracking update
        </button>
        {justSaved && (
          <span className="text-xs font-medium text-emerald-600" role="status">
            Saved — the customer can now see this on their account page
          </span>
        )}
        {order.tracking_link && (
          <a
            href={normalizeExternalUrl(order.tracking_link)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary"
          >
            Open current link
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}
