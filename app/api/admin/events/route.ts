import { NextRequest } from "next/server";
import { eventBus } from "@/lib/server/event-bus";

// Must never be cached/statically optimized, and needs the persistent
// Node process the in-memory event bus depends on (not edge).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream for the admin dashboard — pushes "order" and
 * "contact-message" events the instant they happen, instead of the client
 * having to poll. One open connection per admin tab; the browser's native
 * EventSource reconnects automatically if it drops.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // controller already closed; listeners get torn down below
        }
      };

      const onOrder = (order: unknown) => send("order", order);
      const onContactMessage = (message: unknown) => send("contact-message", message);

      eventBus.on("order", onOrder);
      eventBus.on("contact-message", onContactMessage);

      // Keeps intermediary proxies/idle timeouts from silently dropping the
      // connection, and lets a closed controller be detected quickly.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      const cleanup = () => {
        eventBus.off("order", onOrder);
        eventBus.off("contact-message", onContactMessage);
        clearInterval(heartbeat);
      };

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
