import { getSupabaseAdmin } from "./supabase";
import { NewsletterSignup } from "../types";
import { getStoreSettings } from "./settings";

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
    suffix += chars[Math.floor(Math.random() * chars.length)];
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

  const existing = await supabase.from("signups").select("*").eq("email", normalizedEmail).maybeSingle();
  if (existing.error) throw new Error(`Failed to check existing signup: ${existing.error.message}`);
  if (existing.data) {
    return { signup: rowToSignup(existing.data as SignupRow), isNew: false };
  }

  const { data, error } = await supabase
    .from("signups")
    .insert({
      id: `signup-${Date.now()}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: normalizedEmail,
      coupon_code: generateCouponCode(),
      email_sent: false,
    })
    .select("*")
    .single();

  // A unique-constraint violation here means two requests for the same
  // brand-new email raced each other — fall back to fetching the row the
  // other request just created, rather than erroring the second customer.
  if (error?.code === "23505") {
    const raced = await supabase.from("signups").select("*").eq("email", normalizedEmail).single();
    if (raced.data) return { signup: rowToSignup(raced.data as SignupRow), isNew: false };
  }
  if (error) throw new Error(`Failed to create signup: ${error.message}`);

  return { signup: rowToSignup(data as SignupRow), isNew: true };
}

export async function markSignupEmailSent(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("signups").update({ email_sent: true }).eq("id", id);
  if (error) throw new Error(`Failed to mark signup ${id} as emailed: ${error.message}`);
}

/**
 * Checked server-side at checkout, never trusting a discount the client
 * claims to have already validated. A code is valid if it exists and hasn't
 * been redeemed by a previous order yet — "one use per customer", enforced
 * for real instead of just stated in the coupon email copy.
 *
 * The rate itself comes from the admin-editable Settings value (current
 * promo rate), not a hardcoded constant — so changing it in the dashboard
 * changes what every unredeemed code is worth from that point on.
 */
export async function validateCouponCode(
  code: string,
): Promise<{ valid: boolean; discountPercent: number }> {
  const normalized = code.trim().toUpperCase();
  const [{ data, error }, settings] = await Promise.all([
    getSupabaseAdmin().from("signups").select("coupon_redeemed_at").eq("coupon_code", normalized).maybeSingle(),
    getStoreSettings(),
  ]);

  if (error) throw new Error(`Failed to validate coupon code: ${error.message}`);
  if (!data || data.coupon_redeemed_at) {
    return { valid: false, discountPercent: 0 };
  }
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
