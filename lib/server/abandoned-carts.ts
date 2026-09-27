import { getSupabaseAdmin } from "./supabase";
import { CartItem, Currency, Product } from "../types";
import { getProductPriceForCurrency } from "../pricing";

const MAX_CART_LINES = 50;

/**
 * Rebuilds a cart from the live catalogue. Only product id, size, colour and
 * quantity are taken from the browser; names, images and prices come from
 * our own products, and anything unavailable is dropped. This is what makes
 * it safe to put cart contents in an email.
 */
export function buildCartItemsFromCatalog(input: unknown, products: Product[]): CartItem[] {
  if (!Array.isArray(input)) return [];
  const byId = new Map(products.filter((p) => !p.status || p.status === "active").map((p) => [p.id, p]));
  const items: CartItem[] = [];
  for (const raw of input.slice(0, MAX_CART_LINES)) {
    if (!raw || typeof raw !== "object") continue;
    const { product_id, size, color, quantity } = raw as Record<string, unknown>;
    const product = typeof product_id === "string" ? byId.get(product_id) : undefined;
    if (!product || typeof size !== "string" || typeof color !== "string") continue;
    if (!Number.isSafeInteger(quantity) || (quantity as number) < 1) continue;
    if (product.sizes.length > 0 ? !product.sizes.includes(size) : size.length > 40) continue;
    if (product.colors.length > 0 ? !product.colors.some((c) => c.name === color) : color.length > 40) continue;
    items.push({
      product_id: product.id,
      product_name: product.name,
      quantity: Math.min(quantity as number, 99),
      size,
      color,
      price_at_addition: product.price_gbp,
      image_url: product.images[0] ?? "",
    });
  }
  return items;
}

/** Subtotal in the cart's currency, from catalogue prices. */
export function cartSubtotal(items: CartItem[], products: Product[], currency: Currency): number {
  const byId = new Map(products.map((p) => [p.id, p]));
  const minor = items.reduce(
    (sum, item) => sum + Math.round(getProductPriceForCurrency(byId.get(item.product_id), currency) * 100) * item.quantity,
    0,
  );
  return minor / 100;
}

function isMissingOptOutTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

/** Unsubscribed from cart reminders? False if the opt-out table doesn't exist yet (before migration 0014). */
export async function isOptedOut(email: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("email_opt_outs")
    .select("email")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error && !isMissingOptOutTable(error)) throw new Error(`Failed to check email opt-out: ${error.message}`);
  return !!data;
}

/** Records an unsubscribe and forgets any saved cart for that address. */
export async function optOutOfCartEmails(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const db = getSupabaseAdmin();
  const { error } = await db.from("email_opt_outs").upsert({ email: normalized }, { ignoreDuplicates: true });
  if (error) throw new Error(`Failed to record opt-out: ${error.message}`);
  await db.from("abandoned_carts").delete().eq("id", normalized);
}

export async function getAbandonedCart(email: string): Promise<AbandonedCart | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("abandoned_carts")
    .select("*")
    .eq("id", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Failed to load abandoned cart: ${error.message}`);
  return data ? rowToCart(data as AbandonedCartRow) : null;
}

export interface AbandonedCart {
  id: string;
  email: string;
  customerName: string | null;
  items: CartItem[];
  currency: Currency;
  subtotal: number;
  recoveryEmailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AbandonedCartRow {
  id: string;
  email: string;
  customer_name: string | null;
  items: CartItem[];
  currency: Currency;
  subtotal: number;
  recovery_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCart(row: AbandonedCartRow): AbandonedCart {
  return {
    id: row.id,
    email: row.email,
    customerName: row.customer_name,
    items: row.items,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    recoveryEmailSentAt: row.recovery_email_sent_at ? new Date(row.recovery_email_sent_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Called (debounced) from the checkout page every time it has a valid email
 * and a non-empty cart — well before payment. One row per email: revisiting
 * checkout just refreshes it (and, importantly, resets recovery_email_sent_at
 * so a second abandoned attempt gets its own reminder rather than staying
 * silenced by an old one).
 */
export async function upsertAbandonedCart(input: {
  email: string;
  customerName: string;
  items: CartItem[];
  currency: Currency;
  subtotal: number;
}): Promise<void> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const { error } = await getSupabaseAdmin().from("abandoned_carts").upsert({
    id: normalizedEmail,
    email: normalizedEmail,
    customer_name: input.customerName || null,
    items: input.items,
    currency: input.currency,
    subtotal: input.subtotal,
    recovery_email_sent_at: null,
  });

  if (error) throw new Error(`Failed to save abandoned cart: ${error.message}`);
}

/** Called once an order actually completes, so a converted customer never gets a recovery email. */
export async function deleteAbandonedCartByEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await getSupabaseAdmin().from("abandoned_carts").delete().eq("id", normalizedEmail);
  if (error) throw new Error(`Failed to clear abandoned cart: ${error.message}`);
}

/**
 * Due for a recovery email: last touched at least an hour ago (long enough
 * that they've actually left, not just switching tabs mid-checkout), no
 * more than 7 days ago (an old cart isn't worth nagging about forever), and
 * never emailed. If they'd already ordered, appendServerOrder would have
 * deleted their row already, so anything left here really didn't convert.
 */
export async function getCartsDueForRecoveryEmail(): Promise<AbandonedCart[]> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from("abandoned_carts")
    .select("*")
    .is("recovery_email_sent_at", null)
    .lte("updated_at", oneHourAgo)
    .gte("updated_at", sevenDaysAgo);

  if (error) throw new Error(`Failed to load abandoned carts: ${error.message}`);
  const carts = (data as AbandonedCartRow[]).map(rowToCart);
  if (carts.length === 0) return carts;

  // Never email anyone who unsubscribed (their row is normally already gone).
  const { data: optOuts, error: optOutError } = await getSupabaseAdmin()
    .from("email_opt_outs")
    .select("email")
    .in("email", carts.map((cart) => cart.email));
  if (optOutError && !isMissingOptOutTable(optOutError)) {
    throw new Error(`Failed to check email opt-outs: ${optOutError.message}`);
  }
  const optedOut = new Set((optOuts ?? []).map((row: { email: string }) => row.email));
  return carts.filter((cart) => !optedOut.has(cart.email));
}

export async function markRecoveryEmailSent(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("abandoned_carts")
    .update({ recovery_email_sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to mark recovery email sent for ${id}: ${error.message}`);
}
