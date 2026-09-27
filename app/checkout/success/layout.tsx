import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Confirmation | Toymak",
  description: "Check your Toymak payment confirmation and find your order details and next steps.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}