import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Returns & Exchanges",
  description:
    "Return or exchange your Toymak Fashion order within 30 days of delivery. See how to start a return, what qualifies and when refunds are processed.",
  path: "/returns",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
