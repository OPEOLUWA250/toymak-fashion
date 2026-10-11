"use client";

import Link from "next/link";
import { handleShopLinkClick, shopHref } from "@/lib/shop-navigation";

/** A link to the shop's product list, usable from server components (footer). */
export function ShopLink({
  params,
  className,
  children,
}: {
  params?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
}) {
  const href = shopHref(params);
  return (
    <Link href={href} onClick={(event) => handleShopLinkClick(event, href)} className={className}>
      {children}
    </Link>
  );
}
