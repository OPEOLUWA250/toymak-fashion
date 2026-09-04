"use client";

import { useMemo, useState } from "react";
import { LineChart, Rows3, ShoppingCart } from "lucide-react";
import { Currency, Order } from "@/lib/types";
import { deriveSalesTrend, DailyTrendPoint } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/pricing";

const RANGE_OPTIONS = [7, 30, 90] as const;
type Range = (typeof RANGE_OPTIONS)[number];

const currencyOrder: Currency[] = ["GBP", "USD", "NGN"];

// Percent-based coordinate space (0-100 on both axes). Values map into the
// top 75% of that, leaving the bottom edge as a real zero baseline and the
// top ~25% as headroom so a label sitting above the highest point never
// gets clipped.
const VALUE_TOP = 25;
const VALUE_BOTTOM = 100;

function yFor(value: number, max: number): number {
  return VALUE_BOTTOM - (value / max) * (VALUE_BOTTOM - VALUE_TOP);
}

/**
 * A hand-rolled line/area trend chart — dots are plain HTML elements
 * positioned with CSS percentages (not SVG circles) specifically so they
 * stay perfect circles under the non-uniform x/y stretching a responsive,
 * non-square SVG viewBox would otherwise apply to them. Only the line/area
 * fill (which tolerates that stretch fine) is actual SVG.
 */
function TrendChart({
  points,
  values,
  formatValue,
}: {
  points: DailyTrendPoint[];
  values: number[];
  formatValue: (value: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  const count = values.length;

  const xFor = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 50);
  const coords = values.map((value, i) => ({ x: xFor(i), y: yFor(value, max) }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[count - 1]?.x ?? 0} ${VALUE_BOTTOM} L ${coords[0]?.x ?? 0} ${VALUE_BOTTOM} Z`;

  // Reference lines at 0 / half / max, with the actual value labeled at the
  // left edge — the only calibration a reader gets without hovering.
  const gridLines = [
    { y: VALUE_BOTTOM, value: 0 },
    { y: yFor(max / 2, max), value: max / 2 },
    { y: VALUE_TOP, value: max },
  ];

  // With a lot of days, labeling every one would be noise — space them out
  // as the range grows, but a 7-day view can afford to show every label.
  const labelStride = count <= 7 ? 1 : count <= 30 ? 5 : 10;

  return (
    <div>
      <div className="relative h-44 w-full">
        {gridLines.map((line) => (
          <div
            key={line.y}
            className="absolute left-10 right-0 border-t border-dashed border-neutral-100"
            style={{ top: `${line.y}%` }}
          >
            <span className="absolute -left-10 -top-2 w-8 text-right text-[10px] text-neutral-400">
              {formatValue(line.value).replace(/\.00$/, "")}
            </span>
          </div>
        ))}

        <div className="absolute inset-y-0 left-10 right-0">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#101820" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#101820" stopOpacity="0" />
              </linearGradient>
            </defs>
            {count > 0 && <path d={areaPath} fill="url(#trend-area-fill)" stroke="none" />}
            {count > 1 && (
              <path d={linePath} fill="none" stroke="#101820" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {coords.map((c, i) => {
            const hasActivity = values[i] > 0;
            const showLabel = hasActivity && (count <= 7 || i % labelStride === 0 || values[i] === max);
            return (
              <div
                key={points[i].date}
                className="absolute top-0 h-full -translate-x-1/2 cursor-default"
                style={{ left: `${c.x}%`, width: `${Math.max(100 / count, 4)}%` }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
              >
                {hoverIndex === i && (
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-neutral-200" />
                )}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-all ${
                    hasActivity ? "bg-primary" : "bg-neutral-300"
                  } ${hoverIndex === i ? "h-3.5 w-3.5" : "h-2 w-2"}`}
                  style={{ top: `${c.y}%` }}
                />
                {(showLabel || hoverIndex === i) && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ top: `${Math.max(c.y - 14, 0)}%` }}
                  >
                    {hoverIndex === i ? `${points[i].label}: ${formatValue(values[i])}` : formatValue(values[i])}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="ml-10 mt-2 flex justify-between text-[10px] text-neutral-400">
        {points.map((point, i) =>
          i % labelStride === 0 || i === count - 1 ? (
            <span key={point.date} className="whitespace-nowrap">
              {point.label}
            </span>
          ) : (
            <span key={point.date} />
          ),
        )}
      </div>
    </div>
  );
}

function TrendTable({
  points,
  valueLabel,
  formatValue,
}: {
  points: DailyTrendPoint[];
  valueLabel: string;
  formatValue: (p: DailyTrendPoint) => string;
}) {
  // A day with zero orders necessarily has zero revenue too (revenue only
  // accumulates alongside an order landing), so this one check covers both tables.
  const nonZero = [...points].reverse().filter((p) => p.orderCount > 0);

  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-100">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-neutral-50">
          <tr>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Date</th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {nonZero.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-3 py-6 text-center text-neutral-400">
                No activity in this range.
              </td>
            </tr>
          ) : (
            nonZero.map((point) => (
              <tr key={point.date}>
                <td className="px-3 py-2 text-neutral-700">{point.label}</td>
                <td className="px-3 py-2 font-medium text-neutral-900">{formatValue(point)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: "chart" | "table"; onChange: (view: "chart" | "table") => void }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-xl border border-neutral-200 p-1">
      {([
        { id: "chart" as const, icon: LineChart },
        { id: "table" as const, icon: Rows3 },
      ]).map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-label={option.id === "chart" ? "Show chart" : "Show table"}
          aria-pressed={view === option.id}
          className={`rounded-lg p-1.5 transition ${
            view === option.id ? "bg-primary text-white" : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          <option.icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function AnalyticsView({ orders }: { orders: Order[] }) {
  const [range, setRange] = useState<Range>(7);
  const [revenueCurrency, setRevenueCurrency] = useState<Currency>("GBP");
  const [ordersView, setOrdersView] = useState<"chart" | "table">("chart");
  const [revenueView, setRevenueView] = useState<"chart" | "table">("chart");

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
    return orders.filter(
      (order) =>
        order.currency === activeCurrency &&
        trend.some((p) => p.date === order.created_at.toISOString().slice(0, 10)),
    ).length;
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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Orders per day</h2>
              <p className="text-sm text-neutral-500">Hover a point for the exact count</p>
            </div>
          </div>
          <ViewToggle view={ordersView} onChange={setOrdersView} />
        </div>
        {totals.orderCount === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            No orders in this range yet — try a wider range above.
          </p>
        ) : ordersView === "chart" ? (
          <TrendChart points={trend} values={orderValues} formatValue={(v) => `${v}`} />
        ) : (
          <TrendTable points={trend} valueLabel="Orders" formatValue={(p) => String(p.orderCount)} />
        )}
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LineChart size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Revenue per day</h2>
              <p className="text-sm text-neutral-500">Broken out by currency — orders settle in whatever their gateway charged</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <ViewToggle view={revenueView} onChange={setRevenueView} />
          </div>
        </div>
        {availableCurrencies.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            No revenue in this range yet — try a wider range above.
          </p>
        ) : revenueView === "chart" ? (
          <TrendChart points={trend} values={revenueValues} formatValue={(v) => formatCurrency(v, activeCurrency)} />
        ) : (
          <TrendTable
            points={trend}
            valueLabel={`Revenue (${activeCurrency})`}
            formatValue={(p) => formatCurrency(p.revenue[activeCurrency] ?? 0, activeCurrency)}
          />
        )}
      </div>
    </div>
  );
}
