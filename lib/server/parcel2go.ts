import type { DeliveryStage, DeliveryTracking } from "@/lib/delivery";

/**
 * Parcel2Go API client: tracking lookups here, and the quote, order and
 * prepay calls that lib/server/parcel2go-booking.ts uses to book parcels.
 *
 * Credentials come from parcel2go.com -> My Account -> API Clients (grant
 * type Client Credentials): PARCEL2GO_CLIENT_ID and PARCEL2GO_CLIENT_SECRET.
 * PARCEL2GO_BASE_URL can point at https://sandbox.parcel2go.com for testing;
 * sandbox credentials are separate.
 */

const REQUEST_TIMEOUT_MS = 8000;
// Creating and paying for an order does more work on Parcel2Go's side.
const BOOKING_TIMEOUT_MS = 20000;

function baseUrl(): string {
  return (process.env.PARCEL2GO_BASE_URL?.trim() || "https://www.parcel2go.com").replace(/\/+$/, "");
}

export function parcel2GoConfigured(): boolean {
  return Boolean(process.env.PARCEL2GO_CLIENT_ID?.trim() && process.env.PARCEL2GO_CLIENT_SECRET?.trim());
}

// "payment" is needed to pay for bookings from the prepay balance.
type Scope = "public-api" | "public-api payment";

// Tokens last two hours; one per scope is reused for as long as this server
// instance lives, renewed a minute before it runs out.
const cachedTokens = new Map<Scope, { value: string; expiresAt: number }>();

async function accessToken(forceNew = false, scope: Scope = "public-api"): Promise<string> {
  const cached = cachedTokens.get(scope);
  if (!forceNew && cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const clientId = process.env.PARCEL2GO_CLIENT_ID?.trim();
  const clientSecret = process.env.PARCEL2GO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Parcel2Go isn't connected: PARCEL2GO_CLIENT_ID and PARCEL2GO_CLIENT_SECRET are not set.");

  const response = await fetch(`${baseUrl()}/auth/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) {
    throw new Error(`Parcel2Go refused the API credentials (HTTP ${response.status}).`);
  }
  const token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  cachedTokens.set(scope, token);
  return token.value;
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

/**
 * A booking call. Answers with Parcel2Go's status and body rather than
 * throwing on a 4xx, because those carry the reasons (a bad address, not
 * enough prepay). Throws only when Parcel2Go can't be reached or errors.
 */
async function apiSend<T>(method: "GET" | "POST", path: string, body: unknown, scope: Scope): Promise<{ status: number; data: T }> {
  for (const forceNew of [false, true]) {
    const response = await fetch(`${baseUrl()}/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken(forceNew, scope)}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(BOOKING_TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.status === 401 && !forceNew) continue;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Parcel2Go refused this request (HTTP ${response.status}). Check the API client's permissions on parcel2go.com.`);
    }
    if (response.status >= 500) throw new Error(`Parcel2Go had a problem (HTTP ${response.status}). Try again shortly.`);
    return { status: response.status, data: (await response.json().catch(() => ({}))) as T };
  }
  throw new Error("Parcel2Go rejected the access token.");
}

/**
 * Parcel2Go answered and said no (bad address, service unavailable…), so
 * nothing was created. Any other error may have happened after Parcel2Go
 * did the work, e.g. a timeout.
 */
export class Parcel2GoRefusal extends Error {}

/** Parcel2Go's validation errors as one readable line. */
function describeErrors(data: unknown, fallback: string): string {
  const errors = (data as { Errors?: { Error?: string; Description?: string; Name?: string }[] } | null)?.Errors;
  const text = (errors ?? [])
    .map((error) => error.Error ?? error.Description ?? error.Name)
    .filter(Boolean)
    .join(" ");
  return text || fallback;
}

export interface Parcel2GoQuoteAddress {
  Country: string;
  Postcode?: string;
  Town?: string;
  Property?: string;
}

export interface Parcel2GoQuote {
  TotalPrice: number;
  Collection?: string | null;
  EstimatedDeliveryDate?: string | null;
  Service: {
    Slug: string;
    Name: string;
    CourierName: string;
    CollectionType?: string;
    DeliveryType?: string;
    Classification?: string;
    IsPrinterRequired?: boolean;
  };
}

/** Live prices for a parcel; quoting books nothing. */
export async function quoteParcel2Go(request: {
  service?: string;
  collection: Parcel2GoQuoteAddress;
  delivery: Parcel2GoQuoteAddress;
  parcel: { value: number; weightKg: number; lengthCm: number; widthCm: number; heightCm: number };
}): Promise<Parcel2GoQuote[]> {
  const { status, data } = await apiSend<{ Quotes?: Parcel2GoQuote[] }>("POST", "/quotes", {
    Service: request.service || undefined,
    CollectionAddress: request.collection,
    DeliveryAddress: request.delivery,
    Parcels: [{
      Value: request.parcel.value,
      Weight: request.parcel.weightKg,
      Length: request.parcel.lengthCm,
      Width: request.parcel.widthCm,
      Height: request.parcel.heightCm,
    }],
  }, "public-api");
  if (status >= 400) throw new Parcel2GoRefusal(describeErrors(data, `Parcel2Go couldn't quote this parcel (HTTP ${status}).`));
  return data.Quotes ?? [];
}

export interface Parcel2GoCreatedOrder {
  OrderId: string;
  Hash?: string;
  TotalPrice?: number;
  Links?: Record<string, string>;
  OrderlineIdMap?: { OrderLineId: string; ItemId: string; Hash?: string }[];
}

/** Creates an unpaid order on Parcel2Go. */
export async function createParcel2GoOrder(order: unknown): Promise<Parcel2GoCreatedOrder> {
  const { status, data } = await apiSend<Parcel2GoCreatedOrder>("POST", "/orders", order, "public-api");
  if (status >= 400) throw new Parcel2GoRefusal(describeErrors(data, `Parcel2Go didn't accept the booking (HTTP ${status}).`));
  if (!data.OrderId) throw new Error("Parcel2Go answered without an order number.");
  return data;
}

/** Pays for an order from the prepay balance. Never throws for a refusal, e.g. too little balance. */
export async function payParcel2GoWithPrepay(orderId: string, hash: string | undefined): Promise<
  { paid: true; documents: { name: string; url: string }[] } | { paid: false; reason: string }
> {
  const query = hash ? `?hash=${encodeURIComponent(hash)}` : "";
  const { status, data } = await apiSend<{ Links?: { Name?: string; Link?: string }[] }>(
    "POST", `/orders/${encodeURIComponent(orderId)}/paywithprepay${query}`, undefined, "public-api payment",
  );
  if (status >= 400) return { paid: false, reason: describeErrors(data, `Parcel2Go didn't take the prepay payment (HTTP ${status}).`) };
  const documents = (data.Links ?? [])
    .filter((link): link is { Name: string; Link: string } => Boolean(link.Name && link.Link && /^https:\/\//.test(link.Link)))
    .map((link) => ({ name: link.Name, url: link.Link }));
  return { paid: true, documents };
}

/** The account's prepay balance in pounds, or null if Parcel2Go doesn't say. */
export async function getParcel2GoPrepayBalance(): Promise<number | null> {
  const { status, data } = await apiSend<unknown>("GET", "/prepay", undefined, "public-api payment");
  if (status >= 400) return null;
  const value = typeof data === "number" ? data : Number((data as { Balance?: unknown })?.Balance ?? data);
  return Number.isFinite(value) ? value : null;
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
