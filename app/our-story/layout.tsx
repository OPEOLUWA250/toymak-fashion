import { siteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/our-story` },
  title: "Our Story | Toymak",
  description: "Get to know Toymak and our approach to comfortable shapewear, thoughtful design and everyday confidence.",

};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}