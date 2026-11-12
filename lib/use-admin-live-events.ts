"use client";

import { useEffect, useRef } from "react";
import { ContactMessage, Order } from "./types";

const RESYNC_INTERVAL_MS = 60_000;

/**
 * Keeps the admin dashboard current: a full reload of orders and messages every
 * minute while the tab is visible, and straight away when the admin returns to it.
 *
 * This used to hold a Server-Sent Events stream open as well. On Vercel that kept a
 * function running for as long as any admin tab was open (heartbeats every 25s,
 * reconnecting on every timeout), and its in-memory event bus rarely saw events,
 * because webhooks run on other instances. Removed on 2026-11-12 to cut Fluid CPU;
 * onOrder and onContactMessage are kept so callers don't change.
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
}
