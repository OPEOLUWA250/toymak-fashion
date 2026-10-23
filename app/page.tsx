import { FirstOrderPopup } from "@/components/first-order-popup";
import ShopView from "@/components/shop-view";
import { getAllProducts } from "@/lib/server/products";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { contactEmail, contactPhone, siteName } from "@/lib/site-info";
import { siteUrl } from "@/lib/site-url";

// The shop is the home page for now. The previous landing page is kept in
// app/_home-hidden/page.tsx; /shop still works and points search engines here.
export const metadata = pageMetadata({
  title: "Toymak Fashion | Shapewear, Waist Trainers & Bras",
  absoluteTitle: true,
  description:
    "Shop Toymak Fashion shapewear, waist trainers, bodysuits and bras that sculpt and smooth. Find your fit with our size guide. UK-based, with international delivery.",
  path: "/",
});

export const revalidate = 60;

const organization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      legalName: "Toymak Enterprise",
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
      email: contactEmail,
      telephone: contactPhone,
      address: { "@type": "PostalAddress", addressCountry: "GB" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: contactEmail,
        telephone: contactPhone,
        availableLanguage: "English",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      alternateName: "Toymak",
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en-GB",
    },
  ],
};

export default async function HomePage() {
  const products = await getAllProducts().catch(() => []);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
      <ShopView initialProducts={products} />
      <FirstOrderPopup />
    </>
  );
}
