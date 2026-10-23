import { pageMetadata } from "@/lib/seo";

// Same page as the home page, which is the canonical copy.
export const metadata = pageMetadata({
  title: "Shop Shapewear, Waist Trainers & Bras",
  description:
    "Shop the full Toymak Fashion collection of shapewear, waist trainers, bodysuits, bras and tops. Filter by size, colour and price to find your fit.",
  path: "/",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
