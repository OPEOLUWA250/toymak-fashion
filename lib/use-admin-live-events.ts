"use client";

import { useEffect, useRef } from "react";
import { ContactMessage, Order } from "./types";

const RESYNC_INTERVAL_MS = 60_000;

/**
 * Subscribes to the admin SSE stream (app/api/admin/events) for real-time
 * order and contact-message push. The browser's native EventSource
 * reconnects automatically if the connection drops.
 *
 * The stream's event bus is in-memory, so it only carries events raised on
 * the same server instance — on Vercel a webhook usually runs elsewhere.
 * onResync (a full reload of orders and messages) therefore also runs every
 * minute while the tab is visible, and whenever the admin returns to it.
 */
export function useAdminLiveEvents({
  onOrder,
  onContactMessage,
  onResync,
}: {
  onOrder: (order: Order) => void;
  onContactMessage: (message: ContactMessage) => void;
  onResync: () => void;
}) {
  // Refs so the effect below only ever subscribes once, regardless of
  // whether the caller passes stable or freshly-created callback functions.
  const onOrderRef = useRef(onOrder);
  const onContactMessageRef = useRef(onContactMessage);
  const onResyncRef = useRef(onResync);
  useEffect(() => {
    onOrderRef.current = onOrder;
    onContactMessageRef.current = onContactMessage;
    onResyncRef.current = onResync;
  });

  useEffect(() => {
    const resyncIfVisible = () => {
      if (document.visibilityState === "visible") onResyncRef.current();
    };
    const interval = setInterval(resyncIfVisible, RESYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange", resyncIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", resyncIfVisible);
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/admin/events");

    const handleOrder = (event: MessageEvent) => {
      try {
        const order = JSON.parse(event.data) as Order;
        order.created_at = new Date(order.created_at);
        order.updated_at = new Date(order.updated_at);
        onOrderRef.current(order);
      } catch {
        // ignore malformed event
      }
    };

    const handleContactMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ContactMessage;
        message.created_at = new Date(message.created_at);
        onContactMessageRef.current(message);
      } catch {
        // ignore malformed event
      }
    };

    source.addEventListener("order", handleOrder);
    source.addEventListener("contact-message", handleContactMessage);

    return () => {
      source.removeEventListener("order", handleOrder);
      source.removeEventListener("contact-message", handleContactMessage);
      source.close();
    };
  }, []);
}
