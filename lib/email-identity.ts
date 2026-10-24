/**
 * One person's mailbox can have many spellings. canonicalEmail() maps them to
 * one form, so welcome codes stay one per person and only work for the
 * mailbox they were sent to:
 *
 * - Gmail ignores dots and anything after "+": Jane.Doe+promo@gmail.com
 *   and janedoe@googlemail.com are both janedoe@gmail.com.
 * - The providers in PLUS_TAG_DOMAINS deliver "name+tag@" to "name@".
 * - Everywhere else the address stays as typed (lowercased), since
 *   "name+x@" can be a genuinely different mailbox there.
 *
 * The database has the same rule as public.canonical_email(), which fills
 * signups.email_canonical and orders.customer_email_canonical. Keep the two
 * in sync. Emails are still sent to the exact address the customer typed.
 */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

const PLUS_TAG_DOMAINS = new Set([
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "fastmail.com",
]);

export function canonicalEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (GMAIL_DOMAINS.has(domain)) return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  if (PLUS_TAG_DOMAINS.has(domain)) return `${local.split("+")[0]}@${domain}`;
  return email;
}
