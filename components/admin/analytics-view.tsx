"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Currency, Order } from "@/lib/types";
import { deriveSalesTrend } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/pricing";

const RANGE_OPTIONS = [30, 90] as const;
type Range = (typeof RANGE_OPTIONS)[number];

const currencyOrder: Currency[] = ["GBP", "USD", "NGN"];

function Bars({
  points,
  values,
  formatValue,
}: {
  points: { label: string }[];
  values: number[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(...values, 1);
  // 90 daily bars packed into a normal-width card would be unreadable, so
  // the chart scrolls horizontally instead of squeezing bars down to
  // nothing — same "wide content gets its own overflow-x-auto" pattern
  // used for the admin data tables.
  const showEveryLabel = points.length <= 14;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex h-40 min-w-full items-end gap-1" style={{ width: `${points.length * 14}px` }}>
        {values.map((value, i) => (
          <div key={i} className="group relative flex h-full w-3 shrink-0 flex-col justify-end">
            <div
              className="w-full rounded-t bg-primary/80 transition group-hover:bg-primary"
              style={{ height: `${(value / max) * 100}%` }}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white group-hover:block">
              {points[i].label}: {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex min-w-full gap-1" style={{ width: `${points.length * 14}px` }}>
        {points.map((point, i) => (
          <div key={i} className="w-3 shrink-0 text-center">
            {(showEveryLabel || i % 7 === 0) && (
              <span className="block -rotate-45 text-[9px] text-neutral-400 origin-top-left whitespace-nowrap">
                {point.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsView({ orders }: { orders: Order[] }) {
  const [range, setRange] = useState<Range>(30);
  const [revenueCurrency, setRevenueCurrency] = useState<Currency>("GBP");

  const trend = useMemo(() => deriveSalesTrend(orders, range), [orders, range]);

  const availableCurrencies = useMemo(() => {
    const present = new Set<Currency>();
    trend.forEach((point) => {
      currencyOrder.forEach((currency) => {
        if (point.revenue[currency]) present.add(currency);
      });
    });
    return currencyOrder.filter((currency) => present.has(currency));
  }, [trend]);

  const activeCurrency = availableCurrencies.includes(revenueCurrency)
    ? revenueCurrency
    : availableCurrencies[0] ?? "GBP";

  const totals = useMemo(() => {
    const orderCount = trend.reduce((sum, point) => sum + point.orderCount, 0);
    const revenueByCurrency: Partial<Record<Currency, number>> = {};
    trend.forEach((point) => {
      currencyOrder.forEach((currency) => {
        if (point.revenue[currency]) {
          revenueByCurrency[currency] = (revenueByCurrency[currency] ?? 0) + point.revenue[currency]!;
        }
      });
    });
    return { orderCount, revenueByCurrency };
  }, [trend]);

  // Orders in range that actually settled in the currency being averaged —
  // not the total order count across every currency, which would badly
  // skew this number whenever more than one currency is in play.
  const ordersInActiveCurrency = useMemo(() => {
    return orders.filter((order) => order.currency === activeCurrency && trend.some((p) => p.date === order.created_at.toISOString().slice(0, 10))).length;
  }, [orders, activeCurrency, trend]);

  const revenueValues = trend.map((point) => point.revenue[activeCurrency] ?? 0);
  const orderValues = trend.map((point) => point.orderCount);
  const avgOrderValue =
    totals.revenueByCurrency[activeCurrency] && ordersInActiveCurrency > 0
      ? totals.revenueByCurrency[activeCurrency]! / ordersInActiveCurrency
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm leading-6 text-neutral-600">
          Sales trends over time — a snapshot of the last {range} days, computed from real order data.
        </p>
        <div className="flex shrink-0 gap-1 rounded-xl border border-neutral-200 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                range === option ? "bg-primary text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Orders</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{totals.orderCount}</p>
          <p className="mt-1 text-xs text-neutral-500">in the last {range} days</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Revenue</p>
          {currencyOrder.filter((c) => totals.revenueByCurrency[c]).length === 0 ? (
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{formatCurrency(0, "GBP")}</p>
          ) : (
            currencyOrder
              .filter((c) => totals.revenueByCurrency[c])
              .map((c, i) => (
                <p
                  key={c}
                  className={i === 0 ? "mt-2 text-2xl font-semibold text-neutral-900" : "mt-0.5 text-sm font-medium text-neutral-500"}
                >
                  {formatCurrency(totals.revenueByCurrency[c]!, c)}
                </p>
              ))
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Avg order value</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {formatCurrency(avgOrderValue, activeCurrency)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">in {activeCurrency}</p>
        </div>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Orders per day</h2>
            <p className="text-sm text-neutral-500">Hover a bar for the exact count</p>
          </div>
        </div>
        {totals.orderCount === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No orders in this range yet.</p>
        ) : (
          <Bars points={trend} values={orderValues} formatValue={(v) => `${v} order${v === 1 ? "" : "s"}`} />
        )}
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Revenue per day</h2>
              <p className="text-sm text-neutral-500">Broken out by currency — orders settle in whatever their gateway charged</p>
            </div>
          </div>
          {availableCurrencies.length > 1 && (
            <div className="flex gap-1 rounded-xl border border-neutral-200 p-1">
              {availableCurrencies.map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setRevenueCurrency(currency)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeCurrency === currency ? "bg-primary text-white" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          )}
        </div>
        {availableCurrencies.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No revenue in this range yet.</p>
        ) : (
          <Bars points={trend} values={revenueValues} formatValue={(v) => formatCurrency(v, activeCurrency)} />
        )}
      </div>
    </div>
  );
}
