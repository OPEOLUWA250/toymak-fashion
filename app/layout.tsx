import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
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
    { media: "(prefers-color-scheme: light)", color: "#E600E5" },
    { media: "(prefers-color-scheme: dark)", color: "#E600E5" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased font-sans">
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
