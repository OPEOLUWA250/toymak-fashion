import { siteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/size-guide` },
  title: "Size Guide | Toymak",
  description: "Use Toymak size charts and measuring guidance to choose shapewear, waist trainers and bras that fit.",

};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}