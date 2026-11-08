import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Parcel2Go webhooks (parcel2go.com -> My Account -> API Clients -> Manage
 * -> Webhooks). Each one arrives as
 *   { Id, Timestamp, Signature, Type, Payload }
 * signed with PARCEL2GO_WEBHOOK_SECRET: Signature is the hex HMAC-SHA256 of
 * `${Id}:${Timestamp as "yyyy-MM-dd HH:mm:ss"}:${Type}`.
 * https://www.parcel2go.com/api/docs/articles/webhooks.html
 */

export interface Parcel2GoWebhook {
  Id: string;
  Timestamp: string;
  Signature: string;
  Type: string;
  Payload?: Record<string, unknown> | null;
}

export function isParcel2GoWebhook(value: unknown): value is Parcel2GoWebhook {
  const body = value as Partial<Parcel2GoWebhook> | null;
  return Boolean(
    body && typeof body.Id === "string" && body.Id.length <= 100 && typeof body.Timestamp === "string"
      && typeof body.Signature === "string" && typeof body.Type === "string",
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// The guide formats the timestamp with .NET's "yyyy-MM-dd HH:mm:ss" but
// doesn't say in which zone, so both the clock time as sent and the same
// moment in UTC are accepted.
function signedTimestamps(timestamp: string): string[] {
  const forms = new Set<string>();
  const literal = /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)/.exec(timestamp);
  if (literal) forms.add(`${literal[1]} ${literal[2]}`);
  const time = new Date(timestamp);
  if (Number.isFinite(time.getTime())) {
    forms.add(`${time.getUTCFullYear()}-${pad(time.getUTCMonth() + 1)}-${pad(time.getUTCDate())} ${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}:${pad(time.getUTCSeconds())}`);
  }
  return [...forms];
}

export function signParcel2GoWebhook(id: string, signedTimestamp: string, type: string, secret: string): string {
  return createHmac("sha256", secret).update(`${id}:${signedTimestamp}:${type}`, "utf8").digest("hex");
}

export function verifyParcel2GoWebhook(webhook: Parcel2GoWebhook, secret: string): boolean {
  const given = Buffer.from(webhook.Signature.trim().toLowerCase(), "utf8");
  return signedTimestamps(webhook.Timestamp).some((form) => {
    const expected = Buffer.from(signParcel2GoWebhook(webhook.Id, form, webhook.Type, secret), "utf8");
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

/** The Tracking event's payload, or null if it isn't one. */
export function trackingEvent(webhook: Parcel2GoWebhook): { orderLineId: string; stage: string | null; at: string | null; description: string | null } | null {
  if (webhook.Type !== "Tracking" || !webhook.Payload) return null;
  const payload = webhook.Payload;
  const orderLineId = String(payload.OrderLineId ?? "").trim();
  if (!/^\d{1,20}$/.test(orderLineId)) return null;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 300) : null);
  return {
    orderLineId,
    stage: text(payload.TrackingStage),
    at: text(payload.Timestamp),
    description: text(payload.StatusDescription),
  };
}
