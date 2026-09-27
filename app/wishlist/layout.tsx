import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Wishlist | Toymak",
  description: "Find your saved Toymak favorites and return to the products you love.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}