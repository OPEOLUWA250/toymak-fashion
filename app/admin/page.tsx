"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  LayoutGrid,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { mockOrders } from "@/lib/mock-orders";
import { deriveCustomers } from "@/lib/admin-data";
import { useAdminProducts } from "@/lib/use-admin-products";
import { cn } from "@/lib/utils";
import type { AdminView } from "@/components/admin/types";
import { OverviewView } from "@/components/admin/overview-view";
import { OrdersView } from "@/components/admin/orders-view";
import { ProductsView } from "@/components/admin/products-view";
import { CustomersView } from "@/components/admin/customers-view";
import { InventoryView } from "@/components/admin/inventory-view";
import { AdminManagementView } from "@/components/admin/admin-management-view";
import { SettingsView } from "@/components/admin/settings-view";
import { AdminProfileMenu } from "@/components/admin/admin-profile-menu";

const mainNavItems: { view: AdminView; label: string; icon: typeof LayoutGrid }[] = [
  { view: "overview", label: "Overview", icon: LayoutGrid },
  { view: "orders", label: "Orders", icon: ShoppingCart },
  { view: "products", label: "Products", icon: Package },
  { view: "customers", label: "Customers", icon: Users },
  { view: "inventory", label: "Inventory", icon: Boxes },
];

const bottomNavItems: { view: AdminView; label: string; icon: typeof LayoutGrid }[] = [
  { view: "admin", label: "Admin", icon: UserCog },
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
  admin: {
    eyebrow: "Team",
    title: "Admin Access",
    subtitle: "Manage who has access to this dashboard.",
  },
  settings: {
    eyebrow: "Configuration",
    title: "Settings",
    subtitle: "How checkout routes payments, shipping, and tax.",
  },
};

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { view: AdminView; label: string; icon: typeof LayoutGrid };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
        active
          ? "bg-primary text-white shadow-lg shadow-primary/25"
          : "text-neutral-600 hover:bg-primary/8 hover:text-primary",
      )}
    >
      <item.icon size={16} />
      {item.label}
    </button>
  );
}

export default function AdminPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [productSearch, setProductSearch] = useState("");

  const { products, addProduct, updateProduct, removeProduct } = useAdminProducts();

  const customers = useMemo(() => deriveCustomers(mockOrders), []);
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock_qty <= p.low_stock_threshold).length,
    [products],
  );
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
    <main className="flex h-screen overflow-hidden bg-[#f6f1f8] text-neutral-900">
      {/* Sidebar: full 100vh, extreme left */}
      <aside
        className={cn(
          "w-72 shrink-0 flex-col border-r border-neutral-200 bg-white",
          sidebarCollapsed ? "hidden" : "hidden lg:flex",
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-5">
          <p className="text-lg font-bold text-neutral-900">Toymak Admin</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {mainNavItems.map((item) => (
            <NavButton
              key={item.view}
              item={item}
              active={activeView === item.view}
              onClick={() => handleNavigate(item.view)}
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-neutral-200 p-4">
          {bottomNavItems.map((item) => (
            <NavButton
              key={item.view}
              item={item}
              active={activeView === item.view}
              onClick={() => handleNavigate(item.view)}
            />
          ))}
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 flex h-full w-[85vw] max-w-sm flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 p-5">
              <p className="text-lg font-bold text-neutral-900">Toymak Admin</p>
              <button
                className="rounded-full border border-neutral-200 p-2"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {mainNavItems.map((item) => (
                <NavButton
                  key={item.view}
                  item={item}
                  active={activeView === item.view}
                  onClick={() => handleNavigate(item.view)}
                />
              ))}
            </nav>

            <div className="space-y-1 border-t border-neutral-200 p-4">
              {bottomNavItems.map((item) => (
                <NavButton
                  key={item.view}
                  item={item}
                  active={activeView === item.view}
                  onClick={() => handleNavigate(item.view)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right column: top bar (starts beside sidebar) + content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              className="rounded-xl p-2 text-neutral-700 transition hover:bg-neutral-100"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <p className="text-lg font-bold text-neutral-900">Toymak Admin</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavigate("inventory")}
              className="relative rounded-xl p-2 text-neutral-700 transition hover:bg-neutral-100"
              aria-label={
                lowStockCount > 0 ? `${lowStockCount} products need restocking` : "Notifications"
              }
            >
              <Bell size={18} />
              {lowStockCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                  {lowStockCount}
                </span>
              )}
            </button>
            <AdminProfileMenu />
          </div>
        </header>

        <section className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-col gap-4 border-b border-neutral-200 bg-white px-5 py-5 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{copy.eyebrow}</p>
              <h1 className="text-3xl font-bold text-neutral-900">{copy.title}</h1>
              <p className="mt-1 text-sm text-neutral-500">{copy.subtitle}</p>
            </div>

            <div className="flex items-center gap-3 xl:max-w-xl xl:flex-1 xl:justify-end">
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
              <button
                type="button"
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                className="hidden shrink-0 rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700 shadow-sm transition hover:border-primary hover:text-primary lg:inline-flex"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
            {activeView === "overview" && (
              <OverviewView orders={mockOrders} products={products} onNavigate={handleNavigate} />
            )}
            {activeView === "orders" && <OrdersView orders={mockOrders} />}
            {activeView === "products" && (
              <ProductsView
                products={products}
                search={productSearch}
                onSearchChange={setProductSearch}
                onAddProduct={addProduct}
                onUpdateProduct={updateProduct}
                onDeleteProduct={removeProduct}
              />
            )}
            {activeView === "customers" && <CustomersView customers={customers} />}
            {activeView === "inventory" && <InventoryView products={products} />}
            {activeView === "admin" && <AdminManagementView />}
            {activeView === "settings" && <SettingsView />}
          </div>
        </section>
      </div>
    </main>
  );
}
