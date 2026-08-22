import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toymak - Premium Shapewear & Fashion",
  description:
    "Discover luxury shapewear and fashion designed for the modern woman. Premium quality, confidence-boosting styles.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
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
    <html lang="en" className="bg-background">
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
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
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
