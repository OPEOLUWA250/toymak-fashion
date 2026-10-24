import { randomInt, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "./supabase";
import { NewsletterSignup } from "../types";
import { getStoreSettings } from "./settings";
import { canonicalEmail } from "../email-identity";

interface SignupRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  coupon_code: string;
  email_sent: boolean;
  created_at: string;
}

function rowToSignup(row: SignupRow): NewsletterSignup {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    coupon_code: row.coupon_code,
    email_sent: row.email_sent,
    created_at: new Date(row.created_at),
  };
}

function generateCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1, easy to type from an email
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[randomInt(chars.length)]; // unpredictable, unlike Math.random
  }
  return `WELCOME-${suffix}`;
}

export async function getAllSignups(): Promise<NewsletterSignup[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load signups: ${error.message}`);
  return (data as SignupRow[]).map(rowToSignup);
}

/**
 * Real, global duplicate protection — the same email from a different
 * browser is now correctly recognized, unlike the old localStorage-only
 * check. Returns the existing signup (and isNew: false) rather than
 * minting a second coupon code for the same person.
 */
export async function createOrGetSignup(
  firstName: string,
  lastName: string,
  email: string,
): Promise<{ signup: NewsletterSignup; isNew: boolean }> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  // One signup per person: jane.doe+2@gmail.com finds janedoe@gmail.com's
  // signup (see lib/email-identity.ts), and the database's unique index on
  // email_canonical backs this up against concurrent requests.
  const canonical = canonicalEmail(normalizedEmail);

  const existing = await supabase.from("signups").select("*").eq("email_canonical", canonical).maybeSingle();
  if (existing.error) throw new Error(`Failed to check existing signup: ${existing.error.message}`);
  if (existing.data) {
    return { signup: rowToSignup(existing.data as SignupRow), isNew: false };
  }

  const { data, error } = await supabase
    .from("signups")
    .insert({
      id: `signup-${Date.now()}-${randomUUID().slice(0, 8)}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: normalizedEmail,
      coupon_code: generateCouponCode(),
      email_sent: false,
    })
    .select("*")
    .single();

  // A unique-constraint violation here means two requests for the same
  // brand-new person raced each other — fall back to fetching the row the
  // other request just created, rather than erroring the second customer.
  if (error?.code === "23505") {
    const raced = await supabase.from("signups").select("*").eq("email_canonical", canonical).maybeSingle();
    if (raced.data) return { signup: rowToSignup(raced.data as SignupRow), isNew: false };
  }
  if (error) throw new Error(`Failed to create signup: ${error.message}`);

  return { signup: rowToSignup(data as SignupRow), isNew: true };
}

/**
 * The coupon email is always built from this server-side record — never
 * from what the browser sends — so it can only ever send a signup's own
 * code to its own address.
 */
export type CouponCodeStatus = "active" | "used" | "already-ordered";

/**
 * codeStatus tells the email what to say: the code is ready to use, was
 * already used on an order, or can't be used because this person has
 * ordered before (codes are first-order only). Only the inbox owner sees
 * it — the signup popup never reveals it, so it can't be used to find out
 * who has shopped here.
 */
export async function getSignupForCouponEmail(
  id: string,
): Promise<{ firstName: string; email: string; couponCode: string; lastSentAt: Date | null; codeStatus: CouponCodeStatus } | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("signups").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load signup ${id}: ${error.message}`);
  if (!data) return null;
  const row = data as SignupRow & { email_last_sent_at?: string | null; coupon_redeemed_at?: string | null };

  let codeStatus: CouponCodeStatus = "active";
  if (row.coupon_redeemed_at) {
    codeStatus = "used";
  } else {
    const { count, error: ordersError } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_email_canonical", canonicalEmail(row.email));
    if (ordersError) throw new Error(`Failed to check previous orders: ${ordersError.message}`);
    if (count) codeStatus = "already-ordered";
  }

  return {
    firstName: row.first_name,
    email: row.email,
    couponCode: row.coupon_code,
    lastSentAt: row.email_last_sent_at ? new Date(row.email_last_sent_at) : null,
    codeStatus,
  };
}

export async function markSignupEmailSent(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  let { error } = await db
    .from("signups")
    .update({ email_sent: true, email_last_sent_at: new Date().toISOString() })
    .eq("id", id);
  // Before migration 0014 there's no email_last_sent_at column.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ({ error } = await db.from("signups").update({ email_sent: true }).eq("id", id));
  }
  if (error) throw new Error(`Failed to mark signup ${id} as emailed: ${error.message}`);
}

/**
 * Checked server-side at checkout, never trusting a discount the client
 * claims to have already validated. A code is valid if it exists and hasn't
 * been redeemed by a previous order yet — "one use per customer", enforced
 * for real instead of just stated in the coupon email copy.
 *
 * A code is also only valid with the mailbox it was sent to (compared with
 * canonicalEmail, so Jane.Doe@gmail.com still matches janedoe@gmail.com),
 * so it can't be shared or used with someone else's address. And it's for
 * a first order only: refused once that person has any order.
 *
 * reason "already-ordered" is only ever reported after the code and email
 * have matched, so it can't reveal whether a stranger has shopped here.
 *
 * The rate itself comes from the admin-editable Settings value (current
 * promo rate), not a hardcoded constant — so changing it in the dashboard
 * changes what every unredeemed code is worth from that point on.
 */
export async function validateCouponCode(
  code: string,
  email: string,
): Promise<{ valid: boolean; discountPercent: number; reason?: "invalid" | "already-ordered" }> {
  const normalized = code.trim().toUpperCase();
  const checkoutEmail = typeof email === "string" ? canonicalEmail(email) : "";
  const db = getSupabaseAdmin();
  const [{ data, error }, settings] = await Promise.all([
    db.from("signups").select("email, coupon_redeemed_at").eq("coupon_code", normalized).maybeSingle(),
    getStoreSettings(),
  ]);

  if (error) throw new Error(`Failed to validate coupon code: ${error.message}`);
  if (!data || data.coupon_redeemed_at || !checkoutEmail || canonicalEmail(data.email) !== checkoutEmail) {
    return { valid: false, discountPercent: 0, reason: "invalid" };
  }

  const { count, error: ordersError } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_email_canonical", checkoutEmail);
  if (ordersError) throw new Error(`Failed to check previous orders: ${ordersError.message}`);
  if (count) return { valid: false, discountPercent: 0, reason: "already-ordered" };

  return { valid: true, discountPercent: settings.welcomeDiscountPercent };
}

/**
 * Marks a code as spent once its order is durably recorded. Filtered on
 * coupon_redeemed_at is null so a duplicate call (e.g. a webhook retry) is a
 * harmless no-op rather than double-processing anything.
 */
export async function redeemCouponCode(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const { error } = await getSupabaseAdmin()
    .from("signups")
    .update({ coupon_redeemed_at: new Date().toISOString() })
    .eq("coupon_code", normalized)
    .is("coupon_redeemed_at", null);

  if (error) throw new Error(`Failed to redeem coupon code: ${error.message}`);
}
