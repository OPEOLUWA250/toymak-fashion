import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Our Story",
  description:
    "Meet Toymak Fashion: UK-based shapewear designed for comfort, confidence and real curves. Discover our story and what drives every piece we make.",
  path: "/our-story",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
