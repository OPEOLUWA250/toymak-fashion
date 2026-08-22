"use client";

import { useEffect, useRef } from "react";
import { ContactMessage, Order } from "./types";

/**
 * Subscribes to the admin SSE stream (app/api/admin/events) for real-time
 * order and contact-message push — no polling, no manual refresh. The
 * browser's native EventSource reconnects automatically if the connection
 * drops.
 */
export function useAdminLiveEvents({
  onOrder,
  onContactMessage,
}: {
  onOrder: (order: Order) => void;
  onContactMessage: (message: ContactMessage) => void;
}) {
  // Refs so the effect below only ever subscribes once, regardless of
  // whether the caller passes stable or freshly-created callback functions.
  const onOrderRef = useRef(onOrder);
  const onContactMessageRef = useRef(onContactMessage);
  onOrderRef.current = onOrder;
  onContactMessageRef.current = onContactMessage;

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
