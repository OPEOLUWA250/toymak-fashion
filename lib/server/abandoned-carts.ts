import { getSupabaseAdmin } from "./supabase";
import { CartItem, Currency } from "../types";

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
  return (data as AbandonedCartRow[]).map(rowToCart);
}

export async function markRecoveryEmailSent(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("abandoned_carts")
    .update({ recovery_email_sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to mark recovery email sent for ${id}: ${error.message}`);
}
