import blocklist from "./disposable-email-domains.json";

/**
 * Throwaway inbox services (Mailinator, 10minutemail, Guerrilla Mail, ...),
 * from the public-domain list at
 * https://github.com/disposable-email-domains/disposable-email-domains.
 * To update, replace disposable-email-domains.json with that repo's
 * disposable_email_blocklist.conf as a JSON array of domains.
 */
const DISPOSABLE_DOMAINS = new Set<string>(blocklist as string[]);

/** True for an address at a listed domain or any subdomain of one. */
export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) return true;
  }
  return false;
}
