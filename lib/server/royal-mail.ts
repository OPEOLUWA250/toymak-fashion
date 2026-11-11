/**
 * Royal Mail Click & Drop API client (https://api.parcel.royalmail.com).
 *
 * The key comes from Click & Drop -> Settings -> Integrations -> Add a new
 * integration -> Click & Drop API: ROYAL_MAIL_API_KEY. On a pay-as-you-go
 * account the API can create orders and read them back (with their tracking
 * number once the label is printed) but can't buy labels; that's done in
 * Click & Drop.
 */

const BASE_URL = "https://api.parcel.royalmail.com/api/v1";
const REQUEST_TIMEOUT_MS = 10000;

export function royalMailConfigured(): boolean {
  return Boolean(process.env.ROYAL_MAIL_API_KEY?.trim());
}

/**
 * Royal Mail answered and said no (a bad address, an unknown service), so
 * nothing was created. Any other error may have happened after Click & Drop
 * did the work, e.g. a timeout.
 */
export class RoyalMailRefusal extends Error {}

type Answer<T> = { status: number; data: T };

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<Answer<T>> {
  const key = process.env.ROYAL_MAIL_API_KEY?.trim();
  if (!key) throw new Error("Royal Mail isn't connected: ROYAL_MAIL_API_KEY is not set.");
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Royal Mail refused the API key (HTTP ${response.status}). Check ROYAL_MAIL_API_KEY against Click & Drop -> Settings -> Integrations.`);
  }
  if (response.status === 429) throw new Error("Royal Mail is busy (too many requests). Try again in a moment.");
  if (response.status >= 500) throw new Error(`Royal Mail had a problem (HTTP ${response.status}). Try again shortly.`);
  return { status: response.status, data: (await response.json().catch(() => null)) as T };
}

/** Royal Mail's error answers, in any of their shapes, as one readable line. */
export function describeErrors(data: unknown, fallback: string): string {
  const messages: string[] = [];
  const collect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(collect);
    const item = value as Record<string, unknown>;
    const text = [item.errorMessage, item.message, item.details, item.description]
      .find((part): part is string => typeof part === "string" && part.trim() !== "");
    if (text) {
      const fields = Array.isArray(item.fields)
        ? (item.fields as { fieldName?: string }[]).map((field) => field.fieldName).filter(Boolean)
        : [];
      messages.push(fields.length ? `${text.trim()} (${fields.join(", ")})` : text.trim());
    }
    collect(item.errors);
  };
  collect(data);
  return [...new Set(messages)].join(" ") || fallback;
}

// ---------- Services ----------

export interface RoyalMailService {
  code: string;
  name: string;
  /** Pay-as-you-go accounts are told the price. */
  price?: number;
}

/**
 * The services the account can use, optionally for one parcel. Tries the
 * general list first, then the pay-as-you-go (OLP) list, which some
 * accounts have instead.
 */
export async function listRoyalMailServices(parcel?: { postcode: string; grams: number }): Promise<RoyalMailService[]> {
  // Neither list answering means the first failure is usually the cause.
  let firstError: unknown = null;

  const general = parcel
    ? `?${new URLSearchParams({ destinationCountryCode: "GBR", destinationPostcode: parcel.postcode, packageWeight: String(parcel.grams) })}`
    : "";
  try {
    const { status, data } = await call<{ services?: { serviceCode?: string; serviceName?: string }[] }[]>("GET", `/services${general}`);
    const fromAccount = (status === 200 && Array.isArray(data) ? data : [])
      .flatMap((carrier) => carrier.services ?? [])
      .filter((service) => service.serviceCode && service.serviceName)
      .map((service) => ({ code: service.serviceCode!, name: service.serviceName! }));
    if (fromAccount.length > 0) return dedupe(fromAccount);
  } catch (error) {
    firstError = error;
  }

  const olp = new URLSearchParams({ country: "GBR", ...(parcel ? { weight: String(parcel.grams), postcode: parcel.postcode } : {}) });
  let second: Answer<{ services?: { serviceCode?: string; serviceName?: string; cost?: number; vatCost?: number }[] } | null>;
  try {
    second = await call("GET", `/services/olp?${olp}`);
  } catch (error) {
    throw firstError ?? error;
  }
  if (second.status >= 400) {
    if (firstError) throw firstError;
    throw new RoyalMailRefusal(describeErrors(second.data, `Royal Mail wouldn't list its services (HTTP ${second.status}).`));
  }
  return dedupe((second.data?.services ?? [])
    .filter((service) => service.serviceCode && service.serviceName)
    .map((service) => ({
      code: service.serviceCode!,
      name: service.serviceName!,
      price: typeof service.cost === "number" ? Math.round((service.cost + (service.vatCost ?? 0)) * 100) / 100 : undefined,
    })));
}

function dedupe(services: RoyalMailService[]): RoyalMailService[] {
  const seen = new Set<string>();
  return services.filter((service) => !seen.has(service.code) && seen.add(service.code));
}

/**
 * Royal Mail Tracked 48 (or 24 for express) from the account's services:
 * the plain one where there's a choice, rather than an age-verified,
 * signed-for or high-volume variant.
 */
export function pickTrackedService(services: RoyalMailService[], express: boolean): RoyalMailService | undefined {
  const days = express ? "24" : "48";
  const tracked = services.filter((service) => new RegExp(`\\btracked\\s*${days}\\b`, "i").test(service.name) && !/return/i.test(service.name));
  const plain = tracked.filter((service) => !/age|sign|high\s*vol|international/i.test(service.name));
  const pool = plain.length > 0 ? plain : tracked;
  return [...pool].sort((a, b) => a.name.length - b.name.length)[0];
}

// ---------- Orders ----------

export interface RoyalMailOrderInfo {
  orderIdentifier: number;
  orderReference?: string;
  createdOn?: string;
  printedOn?: string | null;
  manifestedOn?: string | null;
  shippedOn?: string | null;
  trackingNumber?: string | null;
}

/** Creates one order in Click & Drop. Throws RoyalMailRefusal when it's turned down. */
export async function createRoyalMailOrder(order: unknown): Promise<RoyalMailOrderInfo> {
  const { status, data } = await call<{
    createdOrders?: RoyalMailOrderInfo[];
    failedOrders?: { errors?: unknown[] }[];
  }>("POST", "/orders", { items: [order] });
  if (status >= 400) throw new RoyalMailRefusal(describeErrors(data, `Royal Mail didn't accept the order (HTTP ${status}).`));
  const created = data?.createdOrders?.[0];
  if (created?.orderIdentifier) return created;
  if (data?.failedOrders?.length) {
    throw new RoyalMailRefusal(describeErrors(data.failedOrders, "Royal Mail didn't accept the order."));
  }
  throw new Error("Royal Mail answered without an order number.");
}

/**
 * Orders by Click & Drop number, or by our order number (passed as a
 * string). Orders Click & Drop doesn't have are left out.
 */
export async function getRoyalMailOrders(identifiers: (number | string)[]): Promise<RoyalMailOrderInfo[]> {
  const found: RoyalMailOrderInfo[] = [];
  // Up to 100 per request.
  for (let start = 0; start < identifiers.length; start += 100) {
    const batch = identifiers.slice(start, start + 100)
      .map((id) => (typeof id === "number" ? String(id) : `"${encodeURIComponent(id)}"`))
      .join(";");
    const { status, data } = await call<RoyalMailOrderInfo[]>("GET", `/orders/${batch}`);
    if (status === 404) continue;
    if (status >= 400) throw new Error(describeErrors(data, `Royal Mail couldn't look the orders up (HTTP ${status}).`));
    if (Array.isArray(data)) found.push(...data);
  }
  return found;
}
