import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Shapewear FAQs: Orders, Sizing, Shipping & Returns",
  description:
    "Answers to common questions about Toymak Fashion orders, shapewear sizing, UK and international shipping, returns, exchanges and garment care.",
  path: "/faq",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
