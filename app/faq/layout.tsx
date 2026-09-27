import { siteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/faq` },
  title: "Frequently Asked Questions | Toymak",
  description: "Find answers to questions about Toymak orders, sizing, shipping, returns and product care.",

};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}