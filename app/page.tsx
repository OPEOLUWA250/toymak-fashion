import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { FirstOrderPopup } from "@/components/first-order-popup";
import ShopPage from "./shop/page";

// The shop is the home page for now. The previous landing page is kept in
// app/_home-hidden/page.tsx; /shop still works and points search engines here.
export const metadata: Metadata = {
  alternates: { canonical: siteUrl },
  description:
    "Shop Toymak shapewear, waist trainers, bras, tops and accessories. Filter by size, color and price to find your fit.",
};

export default function HomePage() {
  return (
    <>
      <ShopPage />
      <FirstOrderPopup />
    </>
  );
}
