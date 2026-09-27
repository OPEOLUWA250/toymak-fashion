import { NextRequest, NextResponse } from "next/server";
import { buildCartItemsFromCatalog, cartSubtotal, isOptedOut, upsertAbandonedCart } from "@/lib/server/abandoned-carts";
import { getAllProducts } from "@/lib/server/products";
import { Currency } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCIES: Currency[] = ["GBP", "NGN", "USD"];

/**
 * Debounce-called from the checkout page whenever it has a valid email and
 * a non-empty cart — the only way to know a cart was "abandoned" rather
 * than never really started, since the cart itself never touches the
 * server until now. Silently no-ops on bad input rather than erroring,
 * since this fires opportunistically in the background and shouldn't ever
 * surface as a checkout-blocking failure.
 *
 * Only product ids, sizes, colours and quantities are taken from the
 * request; everything that appears in the reminder email (names, images,
 * prices, subtotal) is rebuilt from the catalogue.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ saved: false }); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const currency = CURRENCIES.find((value) => value === body.currency);
  if (!EMAIL_PATTERN.test(email) || email.length > 254 || !currency) {
    return NextResponse.json({ saved: false });
  }
  const customerName = typeof body.customerName === "string"
    ? body.customerName.replace(/[\r\n]/g, " ").trim().slice(0, 100)
    : "";

  try {
    if (await isOptedOut(email)) return NextResponse.json({ saved: false });
    const products = await getAllProducts();
    const items = buildCartItemsFromCatalog(body.items, products);
    if (items.length === 0) return NextResponse.json({ saved: false });

    await upsertAbandonedCart({
      email,
      customerName,
      items,
      currency,
      subtotal: cartSubtotal(items, products, currency),
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Failed to save abandoned cart:", error);
    return NextResponse.json({ saved: false });
  }
}
