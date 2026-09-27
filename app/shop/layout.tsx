import { siteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/shop` },
  title: "Shop All Products | Toymak",
  description: "Explore Toymak shapewear, waist trainers, bras, tops and accessories. Filter by size, color and price to find your fit.",

};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}