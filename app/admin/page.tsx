"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Boxes,
  LayoutGrid,
  Menu,
  Package,
  PanelLeftClose,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { mockProducts } from "@/lib/mock-products";
import { mockOrders } from "@/lib/mock-orders";
import { deriveCustomers } from "@/lib/admin-data";
import type { AdminView } from "@/components/admin/types";
import { OverviewView } from "@/components/admin/overview-view";
import { OrdersView } from "@/components/admin/orders-view";
import { ProductsView } from "@/components/admin/products-view";
import { CustomersView } from "@/components/admin/customers-view";
import { InventoryView } from "@/components/admin/inventory-view";
import { SettingsView } from "@/components/admin/settings-view";

const navItems: { view: AdminView; label: string; icon: typeof LayoutGrid }[] = [
  { view: "overview", label: "Overview", icon: LayoutGrid },
  { view: "orders", label: "Orders", icon: ShoppingCart },
  { view: "products", label: "Products", icon: Package },
  { view: "customers", label: "Customers", icon: Users },
  { view: "inventory", label: "Inventory", icon: Boxes },
  { view: "settings", label: "Settings", icon: SettingsIcon },
];

const viewCopy: Record<AdminView, { eyebrow: string; title: string; subtitle: string }> = {
  overview: {
    eyebrow: "Dashboard Overview",
    title: "Good morning, Toymak team",
    subtitle: "A responsive control center for sales, stock, and fulfillment.",
  },
  orders: {
    eyebrow: "Fulfillment",
    title: "Orders",
    subtitle: "Track every order placed on the storefront.",
  },
  products: {
    eyebrow: "Catalog",
    title: "Products",
    subtitle: "The exact products, prices, and stock live on the storefront.",
  },
  customers: {
    eyebrow: "Customers",
    title: "Customers",
    subtitle: "Everyone who has placed an order, derived from real order data.",
  },
  inventory: {
    eyebrow: "Stock",
    title: "Inventory",
    subtitle: "Monitor stock levels and reorder thresholds.",
  },
  settings: {
    eyebrow: "Configuration",
    title: "Settings",
    subtitle: "How checkout routes payments, shipping, and tax.",
  },
};

export default function AdminPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [productSearch, setProductSearch] = useState("");

  const customers = useMemo(() => deriveCustomers(mockOrders), []);
  const copy = viewCopy[activeView];

  const handleNavigate = (view: AdminView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const handleTopSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setActiveView("products");
  };

  return (
    <main className="min-h-screen bg-[#f6f1f8] text-neutral-900">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(230,0,229,0.16),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] lg:gap-6 lg:p-6">
        <aside className="hidden w-72 shrink-0 rounded-4xl border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_-40px_rgba(59,18,72,0.5)] lg:block">
          <div className="mb-8">
            <p className="text-2xl font-bold text-neutral-900">
              Toymak Admin
            </p>
            <p className="text-sm text-neutral-500">Management suite</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  activeView === item.view
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-neutral-600 hover:bg-primary/8 hover:text-primary"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl bg-linear-to-br from-primary to-fuchsia-500 p-5 text-white">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles size={18} />
              <p className="text-sm font-medium">Pro Access</p>
            </div>
            <p className="text-sm/6 text-white/85">
              Launch new campaigns, review performance, and keep stock moving.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-primary transition hover:bg-white/90"
            >
              View Storefront
            </Link>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-[85vw] max-w-sm bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">Toymak Admin</p>
                  <p className="text-sm text-neutral-500">Management suite</p>
                </div>
                <button
                  className="rounded-full border border-neutral-200 p-2"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => handleNavigate(item.view)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      activeView === item.view
                        ? "bg-primary text-white"
                        : "bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <section className="min-w-0 flex-1 px-4 pb-10 pt-4 lg:px-0 lg:pt-0">
          <div className="rounded-4xl border border-white/70 bg-white/80 shadow-[0_20px_80px_-40px_rgba(59,18,72,0.45)] backdrop-blur">
            <div className="flex flex-col gap-6 border-b border-neutral-200/70 px-5 py-5 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-4 xl:justify-start">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {copy.eyebrow}
                  </p>
                  <h1 className="text-3xl font-bold text-neutral-900">
                    {copy.title}
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    {copy.subtitle}
                  </p>
                </div>

                <button
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-3 xl:max-w-2xl xl:flex-row xl:items-center xl:justify-end">
                <form
                  onSubmit={handleTopSearchSubmit}
                  className="flex flex-1 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                >
                  <Search size={16} className="text-neutral-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products by name or SKU"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  />
                </form>
                <div className="flex items-center gap-2 self-end xl:self-auto">
                  <button
                    type="button"
                    className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm"
                    aria-label="Notifications"
                  >
                    <Bell size={16} />
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm"
                    aria-label="Collapse panel"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-6 lg:px-8">
              {activeView === "overview" && (
                <OverviewView orders={mockOrders} products={mockProducts} onNavigate={handleNavigate} />
              )}
              {activeView === "orders" && <OrdersView orders={mockOrders} />}
              {activeView === "products" && (
                <ProductsView
                  products={mockProducts}
                  search={productSearch}
                  onSearchChange={setProductSearch}
                />
              )}
              {activeView === "customers" && <CustomersView customers={customers} />}
              {activeView === "inventory" && <InventoryView products={mockProducts} />}
              {activeView === "settings" && <SettingsView />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
