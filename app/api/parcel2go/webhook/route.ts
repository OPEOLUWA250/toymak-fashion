import { NextRequest, NextResponse } from "next/server";
import { isParcel2GoWebhook, trackingEvent, verifyParcel2GoWebhook } from "@/lib/server/parcel2go-webhook";
import { applyParcel2GoTrackingEvent } from "@/lib/server/delivery-tracking";

// Parcel2Go retries with a backoff until it gets a 200, so anything older
// than this is either a very late retry or a replay; the daily check has
// already covered it.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Parcel2Go's webhook: tracking updates for parcels on the store's account,
 * so delivery status (and the out-for-delivery and delivered emails) follow
 * within minutes instead of waiting for the daily check.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PARCEL2GO_WEBHOOK_SECRET?.trim();
  // Not a 200, so Parcel2Go keeps the event and retries once it's set.
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  if (!isParcel2GoWebhook(body)) return NextResponse.json({ error: "Not a Parcel2Go webhook." }, { status: 400 });
  if (!verifyParcel2GoWebhook(body, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  const sentAt = Date.parse(body.Timestamp);
  if (Number.isFinite(sentAt) && Date.now() - sentAt > MAX_AGE_MS) return NextResponse.json({ ignored: "too old" });

  const event = trackingEvent(body);
  // Claims and enquiries ("Case") aren't used by the store.
  if (!event) return NextResponse.json({ ignored: body.Type });

  try {
    return NextResponse.json({ updated: await applyParcel2GoTrackingEvent(event) });
  } catch (error) {
    console.error(`Parcel2Go webhook ${body.Id} failed:`, error);
    return NextResponse.json({ error: "Could not apply the update; please retry." }, { status: 500 });
  }
}
