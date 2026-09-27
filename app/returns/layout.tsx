import { siteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/returns` },
  title: "Returns and Exchanges | Toymak",
  description: "Learn how to request a return or size exchange for your Toymak order and review return requirements.",

};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}