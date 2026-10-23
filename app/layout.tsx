import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { RegionProvider } from "@/lib/region-context";
import { siteName } from "@/lib/site-info";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const defaultDescription =
  "Premium shapewear, waist trainers and bras designed for the modern woman. Sculpt, smooth and feel confident with Toymak Fashion.";

// Indexable pages set their own canonical URL and social cards through
// pageMetadata() in lib/seo.ts; these are the fallbacks for everything else.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} | Premium Shapewear & Fashion`, template: `%s | ${siteName}` },
  description: defaultDescription,
  applicationName: siteName,
  openGraph: { type: "website", siteName, locale: "en_GB", description: defaultDescription },
  twitter: { card: "summary_large_image" },
  // Paste the token from Google Search Console's "HTML tag" method into
  // GOOGLE_SITE_VERIFICATION (or verify through DNS and leave it unset).
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  // The TM monogram sits on a white tile, so one set reads on both light
  // and dark browser tabs.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#101820" },
    { media: "(prefers-color-scheme: dark)", color: "#101820" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className="light bg-background">
      <head>
        {/* Satoshi isn't a real Google Fonts family - Google silently drops
            that part of the request, so body text actually renders via the
            system-ui fallback chain below. That's intentional: this mirrors
            merczcord-tech.vercel.app's font setup exactly, including that
            quirk. A <link> (not a CSS @import) so the browser discovers it
            immediately instead of after the stylesheet containing it loads. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Satoshi:wght@100;400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">
        <RegionProvider>
          <CartProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </CartProvider>
        </RegionProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
        {/* Same live Chatway widget already running on toymakenterprise.co.uk
            (reusing the existing account/inbox, per the owner's choice) —
            loaded after the page is interactive so it never blocks render. */}
        <Script
          id="chatway-widget"
          src="https://cdn.chatway.app/widget.js?include[]=faqs&id=ilOU6894aUCB"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
