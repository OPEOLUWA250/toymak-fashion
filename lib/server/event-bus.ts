import { EventEmitter } from "events";

/**
 * In-memory event bus the order/contact stores emit on, and the admin SSE
 * stream (app/api/admin/events) subscribes to for real-time push to the
 * dashboard. Kept on `globalThis` so it survives Next.js dev's module
 * hot-reloading (a fresh module evaluation would otherwise create a second,
 * disconnected emitter).
 *
 * This only fans out within a single Node process — true for local dev and
 * a single always-on server, but not across multiple server instances or
 * serverless invocations. Same ceiling as the file-based stores it
 * complements: a real deployment needs a real pub/sub (e.g. Redis) here.
 */
declare global {
  // eslint-disable-next-line no-var
  var __toymakEventBus: EventEmitter | undefined;
}

export const eventBus: EventEmitter = globalThis.__toymakEventBus ?? new EventEmitter();
globalThis.__toymakEventBus = eventBus;
eventBus.setMaxListeners(50); // several admin tabs/sessions may subscribe at once
