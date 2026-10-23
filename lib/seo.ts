import type { Metadata } from "next";
import { siteUrl } from "./site-url";
import { siteName } from "./site-info";

/**
 * Title, description, canonical URL and social cards for an indexable page.
 * Next.js replaces (not merges) openGraph/twitter from parent layouts, so
 * every page sets them in full through here.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  images,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  images?: { url: string; alt: string }[];
}): Metadata {
  const url = siteUrl + (path === "/" ? "" : path);
  const fullTitle = absoluteTitle ? title : `${title} | ${siteName}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_GB",
      url,
      title: fullTitle,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}

/** Product copy pasted from marketplaces, flattened to plain sentences. */
export function plainText(text: string): string {
  return text
    .replace(/^\s*about this item\s*/i, "")
    .replace(/[•▪●◦·]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A search-result-length snippet that ends on a whole word. */
export function metaDescription(text: string, max = 155): string {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,.;:–-]+$/, "")}…`;
}

export function absoluteUrl(src: string): string {
  return /^https?:\/\//.test(src) ? src : siteUrl + (src.startsWith("/") ? src : `/${src}`);
}

/** JSON-LD for a <script> tag; "<" is escaped so content can't close it. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
