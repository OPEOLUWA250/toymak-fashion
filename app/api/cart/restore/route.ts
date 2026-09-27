import { NextRequest, NextResponse } from "next/server";
import { buildCartItemsFromCatalog, getAbandonedCart } from "@/lib/server/abandoned-carts";
import { verifyEmailLinkToken } from "@/lib/server/email-links";
import { getAllProducts } from "@/lib/server/products";

/**
 * "Return to my bag" from a reminder email: returns the saved cart for the
 * signed link, re-checked against today's catalogue, so it can be restored
 * on whatever device the email is opened on. Returns items only — never the
 * email address.
 */
export async function GET(request: NextRequest) {
  const email = verifyEmailLinkToken("restore-cart", request.nextUrl.searchParams.get("token"));
  if (!email) return NextResponse.json({ error: "This link isn't valid." }, { status: 400 });

  try {
    const cart = await getAbandonedCart(email);
    if (!cart) return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "private, no-store" } });
    const items = buildCartItemsFromCatalog(cart.items, await getAllProducts());
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not restore your bag. Please retry." }, { status: 500 });
  }
}
