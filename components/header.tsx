"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Search, Heart, ShoppingBag, User, ChevronRight, ChevronDown } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useRegion } from "@/lib/region-context";
import { currencySymbols } from "@/lib/pricing";
import { Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

const currencyOptions: { value: Currency; label: string }[] = [
  { value: "GBP", label: "GBP — UK" },
  { value: "NGN", label: "NGN — Nigeria" },
  { value: "USD", label: "USD — US" },
];

export default function Header({
  variant = "solid",
}: {
  variant?: "transparent" | "solid";
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { getItemCount } = useCart();
  const { productIds: wishlistProductIds } = useWishlist();
  const wishlistCount = wishlistProductIds.length;
  const { currency, setCurrency } = useRegion();

  const isTransparent = variant === "transparent" && !scrolled;
  const searchRef = useRef<HTMLFormElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "transparent") return;

    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [variant]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!currencyOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCurrencyOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currencyOpen]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (trimmed) {
      router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
    }
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setSearchValue("");
  };

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Shop All", href: "/shop" },
    { label: "Shapewear", href: "/shop?category=shapewear" },
    { label: "Waist Trainers", href: "/shop?category=waist-trainer" },
    { label: "New Arrivals", href: "/shop?sort=newest" },
  ];

  return (
    <>
      {/* Desktop Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 border-b transition-colors duration-300",
          isTransparent
            ? "bg-transparent border-transparent text-white"
            : "bg-white border-neutral-200 text-neutral",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <h1
                className={cn(
                  "font-bold text-2xl transition-colors duration-300",
                  isTransparent ? "text-white" : "text-primary",
                )}
              >
                TOYMAK
              </h1>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition",
                    isTransparent
                      ? "text-white hover:text-white/70"
                      : "text-neutral hover:text-primary",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Icons */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="relative" ref={currencyRef}>
                <button
                  type="button"
                  onClick={() => setCurrencyOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={currencyOpen}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-2 text-sm font-medium transition",
                    isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                  )}
                >
                  {currencySymbols[currency]} {currency}
                  <ChevronDown size={14} className={cn("transition", currencyOpen && "rotate-180")} />
                </button>
                {currencyOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 rounded-xl border border-neutral-200 bg-white p-1 text-neutral shadow-2xl">
                    {currencyOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === currency}
                        onClick={() => {
                          setCurrency(option.value);
                          setCurrencyOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                          option.value === currency ? "bg-primary/10 text-primary" : "hover:bg-neutral-100",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {searchOpen ? (
                <form
                  ref={searchRef}
                  onSubmit={handleSearchSubmit}
                  className={cn(
                    "flex items-center gap-1.5  border px-3 py-1.5 transition",
                    isTransparent
                      ? "border-white/40 bg-white/10"
                      : "border-neutral-200 bg-white",
                  )}
                >
                  <Search
                    size={16}
                    className={isTransparent ? "text-white/80" : "text-neutral/50"}
                  />
                  <input
                    autoFocus
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search products..."
                    className={cn(
                      "w-40 bg-transparent text-sm outline-none",
                      isTransparent
                        ? "text-white placeholder:text-white/60"
                        : "text-neutral placeholder:text-neutral/40",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchValue("");
                    }}
                    aria-label="Close search"
                    className={cn(
                      " p-0.5 transition",
                      isTransparent ? "hover:bg-white/10" : "hover:bg-neutral/5",
                    )}
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className={cn(
                    " p-2 transition",
                    isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                  )}
                  aria-label="Search"
                >
                  <Search size={20} />
                </button>
              )}
              <Link
                href="/wishlist"
                className={cn(
                  "relative  p-2 transition",
                  isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                )}
                aria-label="Wishlist"
              >
                <Heart size={20} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center  bg-primary text-[10px] font-medium text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href="/account"
                className={cn(
                  " p-2 transition",
                  isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                )}
                aria-label="Account"
              >
                <User size={20} />
              </Link>
              <Link
                href="/cart"
                className={cn(
                  "relative  p-2 transition",
                  isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                )}
                aria-label="Cart"
              >
                <ShoppingBag size={20} />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center  bg-primary text-[10px] font-medium text-white">
                    {getItemCount()}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Icons + Menu Button */}
            <div className="flex items-center gap-0.5 md:hidden">
              <Link
                href="/wishlist"
                className={cn(
                  "relative  p-2 transition",
                  isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                )}
                aria-label="Wishlist"
              >
                <Heart size={19} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center  bg-primary text-[9px] font-medium text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href="/account"
                className={cn(
                  " p-2 transition",
                  isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                )}
                aria-label="Account"
              >
                <User size={19} />
              </Link>
              <Link
                href="/cart"
                className={cn(
                  "relative  p-2 transition",
                  isTransparent ? "hover:bg-white/10" : "hover:text-primary hover:bg-primary/5",
                )}
                aria-label="Cart"
              >
                <ShoppingBag size={19} />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center  bg-primary text-[9px] font-medium text-white">
                    {getItemCount()}
                  </span>
                )}
              </Link>
              <button
                className="p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed inset-0 top-20 z-30 flex flex-col bg-white transition-all duration-300 ease-out md:hidden",
          mobileMenuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0",
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2  border border-neutral-200 px-4 py-3"
          >
            <Search size={16} className="text-neutral/50 flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm text-neutral outline-none placeholder:text-neutral/40"
              tabIndex={mobileMenuOpen ? 0 : -1}
            />
          </form>

          <p className="mb-1 mt-8 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral/40">
            Shop
          </p>
          <div className="flex flex-col">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between border-b border-neutral-100 py-4 text-base font-medium text-neutral transition hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                {item.label}
                <ChevronRight size={16} className="text-neutral/30" />
              </Link>
            ))}
          </div>

          <p className="mb-2 mt-8 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral/40">
            Display currency
          </p>
          <div className="grid grid-cols-3 gap-2">
            {currencyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCurrency(option.value)}
                tabIndex={mobileMenuOpen ? 0 : -1}
                className={cn(
                  "border px-2 py-2.5 text-center text-sm font-semibold transition",
                  option.value === currency
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-neutral-200 text-neutral hover:border-primary/40",
                )}
              >
                {currencySymbols[option.value]} {option.value}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Spacer for fixed header */}
      {variant !== "transparent" && <div className="h-20" />}
    </>
  );
}
