import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order | Toymak",
  description: "Track your Toymak order and download your receipt — no account needed.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
