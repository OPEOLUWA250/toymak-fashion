import { NextRequest, NextResponse } from "next/server";
import { upsertAbandonedCart } from "@/lib/server/abandoned-carts";
import { CartItem, Currency } from "@/lib/types";

interface SaveCartBody {
  email: string;
  customerName: string;
  items: CartItem[];
  currency: Currency;
  subtotal: number;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/**
 * Debounce-called from the checkout page whenever it has a valid email and
 * a non-empty cart — the only way to know a cart was "abandoned" rather
 * than never really started, since the cart itself never touches the
 * server until now. Silently no-ops on bad input rather than erroring,
 * since this fires opportunistically in the background and shouldn't ever
 * surface as a checkout-blocking failure.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SaveCartBody>;
  const { email, customerName, items, currency, subtotal } = body;

  if (!email || !EMAIL_PATTERN.test(email) || !items?.length || !currency) {
    return NextResponse.json({ saved: false });
  }

  try {
    await upsertAbandonedCart({
      email,
      customerName: customerName ?? "",
      items,
      currency,
      subtotal: subtotal ?? 0,
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Failed to save abandoned cart:", error);
    return NextResponse.json({ saved: false });
  }
}
