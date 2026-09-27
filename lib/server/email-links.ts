import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed links for abandoned-cart emails ("return to my bag", "unsubscribe").
 * A token names one email address and one purpose, and can't be forged or
 * edited to target someone else without the server secret.
 *
 * The secret is EMAIL_LINK_SECRET, falling back to the service-role key
 * (always present on the server, never sent to browsers). Changing it
 * invalidates links in emails already sent.
 */
export type EmailLinkPurpose = "restore-cart" | "unsubscribe";

function secret(): string {
  const value = process.env.EMAIL_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("No secret configured for email links.");
  return value;
}

function signature(purpose: EmailLinkPurpose, email: string): Buffer {
  return createHmac("sha256", secret()).update(`${purpose}:${email}`).digest();
}

export function createEmailLinkToken(purpose: EmailLinkPurpose, email: string): string {
  const normalized = email.trim().toLowerCase();
  return `${Buffer.from(normalized).toString("base64url")}.${signature(purpose, normalized).toString("base64url")}`;
}

/** The email address a valid token was issued for, or null. */
export function verifyEmailLinkToken(purpose: EmailLinkPurpose, token: unknown): string | null {
  if (typeof token !== "string" || token.length > 1000) return null;
  const [encodedEmail, encodedSignature, extra] = token.split(".");
  if (!encodedEmail || !encodedSignature || extra !== undefined) return null;
  try {
    const email = Buffer.from(encodedEmail, "base64url").toString("utf8");
    const expected = signature(purpose, email);
    const actual = Buffer.from(encodedSignature, "base64url");
    return actual.length === expected.length && timingSafeEqual(actual, expected) ? email : null;
  } catch {
    return null;
  }
}
