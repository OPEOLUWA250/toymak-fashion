/** Store identity shared by pages, emails, receipts and structured data. */
export const siteName = "Toymak Fashion";

// Must be a mailbox (or forwarder) on a domain the store owns. The old
// hello@toymak.com address bounced: toymak.com isn't registered.
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@toymakfashion.com";

export const contactPhone = "+447776686876";
