"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminCustomer } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/pricing";
import { Currency } from "@/lib/types";

const currencies: Currency[] = ["GBP", "USD", "NGN"];

export function CustomersView({ customers, isLoading = false, error = null }: {
  customers: AdminCustomer[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query),
    );
  }, [customers, search]);

  if (isLoading) return <p role="status" className="p-6 text-sm text-neutral-500">Loading customers and their order totals...</p>;
  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">Customer totals could not be loaded. Please refresh to try again.</p>;

  return (
    <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Customers</h2>
          <p className="text-sm text-neutral-500">
            Derived from who has actually placed an order — {customers.length} so far
          </p>
          <p className="mt-1 text-xs text-neutral-500">Totals include shipping and tax, after discounts. Each currency is shown separately.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
          <Search size={14} className="text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200">
        <div className="hidden grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_1fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:grid">
          <span>Customer</span>
          <span>Email</span>
          <span>Orders</span>
          <span>Total Spent</span>
          <span>Last Order</span>
        </div>

        <div className="divide-y divide-neutral-200 bg-white">
          {filtered.map((customer) => (
            <div
              key={customer.email}
              className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_1fr] sm:items-center"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {customer.name
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{customer.name}</p>
                  {customer.orderCount > 1 && (
                    <span className="text-[11px] font-medium text-primary">Repeat customer</span>
                  )}
                </div>
              </div>
              <p className="truncate text-sm text-neutral-600">{customer.email}</p>
              <p className="text-sm text-neutral-600"><span className="sm:hidden">Orders: </span>{customer.orderCount}</p>
              <div className="space-y-1 text-sm font-semibold tabular-nums text-neutral-900">
                <span className="block text-xs font-normal text-neutral-500 sm:hidden">Total spent</span>
                {currencies.filter((currency) => customer.totalSpentByCurrency[currency] !== undefined).map((currency) => (
                  <p key={currency} className="break-words">
                    {formatCurrency(customer.totalSpentByCurrency[currency]!, currency)}
                    <span className="ml-1 text-[10px] font-normal text-neutral-500">{currency}</span>
                  </p>
                ))}
              </div>
              <p className="text-sm text-neutral-500">
                {customer.lastOrderDate.toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </p>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              {customers.length === 0 ? "Customers will appear here after their first confirmed order." : "No customers match that search."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
