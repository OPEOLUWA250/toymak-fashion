import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Shapewear & Waist Trainer Size Guide",
  description:
    "Find your perfect fit with Toymak Fashion size charts for shapewear, waist trainers and bras, plus step-by-step guidance on how to measure.",
  path: "/size-guide",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
