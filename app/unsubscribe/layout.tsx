import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe | Toymak",
  description: "Stop bag reminder emails from Toymak.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
