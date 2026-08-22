"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminCustomer } from "@/lib/admin-data";

export function CustomersView({ customers }: { customers: AdminCustomer[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query),
    );
  }, [customers, search]);

  return (
    <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Customers</h2>
          <p className="text-sm text-neutral-500">
            Derived from who has actually placed an order — {customers.length} so far
          </p>
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
              <p className="text-sm text-neutral-600">{customer.orderCount}</p>
              <p className="text-sm font-semibold text-neutral-900">£{customer.totalSpent.toFixed(2)}</p>
              <p className="text-sm text-neutral-500">
                {customer.lastOrderDate.toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </p>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              No customers match that search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
