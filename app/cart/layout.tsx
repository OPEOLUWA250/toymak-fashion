import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Bag | Toymak",
  description: "Review the items in your Toymak shopping bag, update quantities and continue to checkout.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}