import type { DeliveryStage, DeliveryTracking } from "@/lib/delivery";

/**
 * Parcel2Go API client, read-only: it only looks up tracking. Parcels are
 * still booked and paid for on parcel2go.com.
 *
 * Credentials come from parcel2go.com -> My Account -> API Clients (grant
 * type Client Credentials): PARCEL2GO_CLIENT_ID and PARCEL2GO_CLIENT_SECRET.
 * PARCEL2GO_BASE_URL can point at https://sandbox.parcel2go.com for testing;
 * sandbox credentials are separate.
 */

const REQUEST_TIMEOUT_MS = 8000;

function baseUrl(): string {
  return (process.env.PARCEL2GO_BASE_URL?.trim() || "https://www.parcel2go.com").replace(/\/+$/, "");
}

export function parcel2GoConfigured(): boolean {
  return Boolean(process.env.PARCEL2GO_CLIENT_ID?.trim() && process.env.PARCEL2GO_CLIENT_SECRET?.trim());
}

// Tokens last two hours; one is reused for as long as this server instance
// lives, renewed a minute before it runs out.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(forceNew = false): Promise<string> {
  if (!forceNew && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const clientId = process.env.PARCEL2GO_CLIENT_ID?.trim();
  const clientSecret = process.env.PARCEL2GO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Parcel2Go isn't connected: PARCEL2GO_CLIENT_ID and PARCEL2GO_CLIENT_SECRET are not set.");

  const response = await fetch(`${baseUrl()}/auth/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "public-api",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) {
    throw new Error(`Parcel2Go refused the API credentials (HTTP ${response.status}).`);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

async function apiGet<T>(path: string): Promise<T> {
  for (const forceNew of [false, true]) {
    const response = await fetch(`${baseUrl()}/api${path}`, {
      headers: { Authorization: `Bearer ${await accessToken(forceNew)}`, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    // A token revoked early: get a new one and try once more.
    if (response.status === 401 && !forceNew) continue;
    if (!response.ok) throw new Error(`Parcel2Go tracking request failed (HTTP ${response.status}).`);
    return (await response.json()) as T;
  }
  throw new Error("Parcel2Go rejected the access token.");
}

/** The parts of Parcel2Go's TrackingResult this store uses. */
export interface Parcel2GoTrackingResult {
  Results?: { Timestamp?: string | null; Description?: string | null; Details?: string | null }[] | null;
  Stage?: string | null;
  UsesStages?: boolean;
  IsInError?: boolean;
  EstimatedDeliveryDate?: string | null;
  DroppedOff?: string | null;
  Collected?: string | null;
  InTransit?: string | null;
  AtDepot?: string | null;
  DeliveryScheduled?: string | null;
  Delivered?: string | null;
}

// Parcel2Go's stage fields hold the time each stage was reached. Most
// advanced first, so the first one set is where the parcel is now.
// DeliveryScheduled ("scheduled for delivery from depot" in Parcel2Go's
// webhook guide) is the "out for delivery" step.
const stageFields: [keyof Parcel2GoTrackingResult, DeliveryStage][] = [
  ["Delivered", "delivered"],
  ["DeliveryScheduled", "out_for_delivery"],
  ["AtDepot", "at_depot"],
  ["InTransit", "in_transit"],
  ["Collected", "collected"],
  ["DroppedOff", "dropped_off"],
];

const stageNames: Record<string, DeliveryStage> = {
  delivered: "delivered",
  deliveryscheduled: "out_for_delivery",
  outfordelivery: "out_for_delivery",
  atdepot: "at_depot",
  intransit: "in_transit",
  collected: "collected",
  droppedoff: "dropped_off",
};

/** Parcel2Go's stage name ("DeliveryScheduled") as the store's stage. */
export function stageFromName(name: string | null | undefined): DeliveryStage | null {
  return stageNames[(name ?? "").toLowerCase().replace(/[^a-z]/g, "")] ?? null;
}

export function validTime(value: string | null | undefined): string | null {
  if (!value) return null;
  // Times usually come without a zone. Read them as UTC so every server
  // agrees (UK time is UTC in winter, an hour ahead in summer).
  const time = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) || !value.includes("T") ? value : `${value}Z`);
  // .NET sends "0001-01-01T00:00:00" for "not set".
  return Number.isFinite(time) && new Date(time).getUTCFullYear() > 2000 ? new Date(time).toISOString() : null;
}

function hasTracking(result: Parcel2GoTrackingResult): boolean {
  return (result.Results?.length ?? 0) > 0 || stageFields.some(([field]) => validTime(result[field] as string | null));
}

/** Turns Parcel2Go's tracking answer into the store's simpler status. */
export function toDeliveryTracking(result: Parcel2GoTrackingResult, now = new Date()): DeliveryTracking {
  const events = (result.Results ?? [])
    .map((event) => ({
      at: validTime(event.Timestamp),
      text: [event.Description, event.Details].map((part) => part?.trim()).filter(Boolean).join(" — ") || null,
    }))
    .filter((event) => event.text)
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  const latest = events[0] ?? null;

  let stage: DeliveryStage = "awaiting";
  let stageAt: string | null = null;
  const reached = stageFields.find(([field]) => validTime(result[field] as string | null));
  if (reached) {
    stage = reached[1];
    stageAt = validTime(result[reached[0]] as string | null);
  } else {
    const named = stageFromName(result.Stage);
    if (named) stage = named;
  }

  // Some couriers don't report stages, only scans. Their wording still says
  // when a parcel is out for delivery or delivered.
  if (latest?.text && stage !== "delivered") {
    const text = latest.text.toLowerCase();
    const failed = /\b(not|un|attempted|failed|missed)\b.{0,12}deliver|could not be delivered/.test(text);
    if (!failed && /\bdelivered\b/.test(text)) {
      stage = "delivered";
      stageAt = latest.at;
    } else if (!failed && stage !== "out_for_delivery" && /out for delivery|with (the|our|your) (driver|courier) for delivery/.test(text)) {
      stage = "out_for_delivery";
      stageAt = latest.at;
    }
  }

  return {
    stage,
    stageAt,
    estimatedDelivery: validTime(result.EstimatedDeliveryDate),
    latestEvent: latest?.text?.slice(0, 300) ?? null,
    latestEventAt: latest?.at ?? null,
    problem: Boolean(result.IsInError),
    updatedAt: now.toISOString(),
  };
}

/**
 * Looks a parcel up by the courier's tracking number and delivery postcode,
 * then, for a Parcel2Go order number (digits, maybe after "P2G"), by its
 * order line. Returns null when Parcel2Go has nothing for it yet.
 */
export async function fetchParcel2GoTracking(reference: string, postcode: string): Promise<DeliveryTracking | null> {
  const ref = reference.trim();
  const code = postcode.replace(/\s+/g, "").toUpperCase();
  const attempts: string[] = [];
  if (code) attempts.push(`/tracking/${encodeURIComponent(ref)}/${encodeURIComponent(code)}`);
  const orderLine = /^(?:P2G)?(\d{4,})$/i.exec(ref)?.[1];
  if (orderLine) attempts.push(`/tracking/${orderLine}${code ? `?postcode=${encodeURIComponent(code)}` : ""}`);

  if (attempts.length === 0) throw new Error("This order has no delivery postcode, so use the Parcel2Go order number (P2G…) instead of the courier's tracking number.");

  // Only an error when every lookup failed; an empty answer just means the
  // courier hasn't scanned the parcel yet.
  let lastError: unknown = null;
  let answered = false;
  for (const path of attempts) {
    try {
      const result = await apiGet<Parcel2GoTrackingResult>(path);
      answered = true;
      if (hasTracking(result)) return toDeliveryTracking(result);
    } catch (error) {
      lastError = error;
    }
  }
  if (!answered) throw lastError;
  return null;
}
