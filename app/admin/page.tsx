"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  LayoutGrid,
  Menu,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Ticket,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { deriveCustomers } from "@/lib/admin-data";
import { useAdminProducts } from "@/lib/use-admin-products";
import { useOrders } from "@/lib/use-orders";
import { useStockSync } from "@/lib/use-stock-sync";
import { useSignups } from "@/lib/use-signups";
import { useContactMessages } from "@/lib/use-contact-messages";
import { useAdminLiveEvents } from "@/lib/use-admin-live-events";
import { cn } from "@/lib/utils";
import type { AdminView } from "@/components/admin/types";
import { OverviewView } from "@/components/admin/overview-view";
import { OrdersView } from "@/components/admin/orders-view";
import { MessagesView } from "@/components/admin/messages-view";
import { ProductsView } from "@/components/admin/products-view";
import { CustomersView } from "@/components/admin/customers-view";
import { InventoryView } from "@/components/admin/inventory-view";
import { SignupsView } from "@/components/admin/signups-view";
import { AdminManagementView } from "@/components/admin/admin-management-view";
import { SettingsView } from "@/components/admin/settings-view";
import { AdminProfileMenu } from "@/components/admin/admin-profile-menu";
import { NotificationsPanel } from "@/components/admin/notifications-panel";

const mainNavItems: { view: AdminView; label: string; icon: typeof LayoutGrid }[] = [
  { view: "overview", label: "Overview", icon: LayoutGrid },
  { view: "orders", label: "Orders", icon: ShoppingCart },
  { view: "messages", label: "Messages", icon: MessageSquare },
  { view: "products", label: "Products", icon: Package },
  { view: "customers", label: "Customers", icon: Users },
  { view: "inventory", label: "Inventory", icon: Boxes },
  { view: "signups", label: "Signups", icon: Ticket },
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
  messages: {
    eyebrow: "Support",
    title: "Messages",
    subtitle: "Everyone who's written in through the homepage contact form.",
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
  signups: {
    eyebrow: "Growth",
    title: "First-Order Signups",
    subtitle: "Everyone who claimed a first-order discount code from the homepage popup.",
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
  badge,
  onClick,
}: {
  item: { view: AdminView; label: string; icon: typeof LayoutGrid };
  active: boolean;
  badge?: number;
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
      <span className="flex-1 text-left">{item.label}</span>
      {!!badge && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            active ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default function AdminPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [productSearch, setProductSearch] = useState("");

  const { products, addProduct, updateProduct, removeProduct } = useAdminProducts();
  const { orders, addOrder, updateOrderStatus } = useOrders();
  const { signups } = useSignups();
  const {
    messages,
    isLoading: messagesLoading,
    refresh: refreshMessages,
    markAsRead: markMessageAsRead,
    receiveMessage,
  } = useContactMessages();
  // Catches orders that only ever arrived via webhook (customer closed the
  // tab before /checkout/success could run) so stock still gets depleted.
  useStockSync();
  // Real-time push: new orders and contact messages land here the instant
  // they're confirmed/submitted elsewhere, no refresh needed.
  useAdminLiveEvents({ onOrder: addOrder, onContactMessage: receiveMessage });

  const customers = useMemo(() => deriveCustomers(orders), [orders]);
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock_qty <= p.low_stock_threshold),
    [products],
  );
  const unshippedOrders = useMemo(
    () => orders.filter((o) => o.status === "unshipped").sort((a, b) => a.created_at.getTime() - b.created_at.getTime()),
    [orders],
  );
  const unreadMessages = useMemo(() => messages.filter((m) => m.status === "new"), [messages]);
  const navBadges: Partial<Record<AdminView, number>> = { messages: unreadMessages.length };
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
              badge={navBadges[item.view]}
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
            <NotificationsPanel
              unshippedOrders={unshippedOrders}
              lowStockProducts={lowStockProducts}
              unreadMessages={unreadMessages}
              onNavigate={handleNavigate}
            />
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
              <OverviewView orders={orders} products={products} onNavigate={handleNavigate} />
            )}
            {activeView === "orders" && (
              <OrdersView orders={orders} onUpdateStatus={updateOrderStatus} />
            )}
            {activeView === "messages" && (
              <MessagesView
                messages={messages}
                isLoading={messagesLoading}
                onRefresh={refreshMessages}
                onMarkAsRead={markMessageAsRead}
              />
            )}
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
            {activeView === "signups" && <SignupsView signups={signups} />}
            {activeView === "admin" && <AdminManagementView />}
            {activeView === "settings" && <SettingsView />}
          </div>
        </section>
      </div>
    </main>
  );
}
