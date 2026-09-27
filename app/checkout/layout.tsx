import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | Toymak",
  description: "Complete your Toymak order with your delivery details and preferred available payment option.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}