"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CircleAlert, PackageSearch } from "lucide-react";
import { Order, Product } from "@/lib/types";
import type { AdminView } from "./types";

export function NotificationsPanel({
  unshippedOrders,
  lowStockProducts,
  onNavigate,
}: {
  unshippedOrders: Order[];
  lowStockProducts: Product[];
  onNavigate: (view: AdminView) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalCount = unshippedOrders.length + lowStockProducts.length;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const goTo = (view: AdminView) => {
    onNavigate(view);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl p-2 text-neutral-700 transition hover:bg-neutral-100"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={totalCount > 0 ? `${totalCount} notifications` : "Notifications"}
      >
        <Bell size={18} />
        {totalCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Notifications
          </p>

          {totalCount === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {unshippedOrders.slice(0, 4).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => goTo("orders")}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PackageSearch size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      {order.tracking_id} needs shipping
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {order.customer_name} · £{order.total_amount.toFixed(2)}
                    </span>
                  </span>
                </button>
              ))}

              {lowStockProducts.slice(0, 4).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => goTo("inventory")}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <CircleAlert size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      {product.name} is low on stock
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {product.stock_qty} left · reorder at {product.low_stock_threshold}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {(unshippedOrders.length > 0 || lowStockProducts.length > 0) && (
            <div className="mt-1 flex items-center gap-2 border-t border-neutral-100 pt-2">
              {unshippedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => goTo("orders")}
                  className="flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  View orders
                </button>
              )}
              {lowStockProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => goTo("inventory")}
                  className="flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  View inventory
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
