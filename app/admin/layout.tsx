import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Store Dashboard | Toymak",
  description: "Manage Toymak products, orders, customer information and store settings.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}