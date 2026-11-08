/**
 * Delivery tracking read from Parcel2Go once an order has shipped. Shared by
 * the server (lib/server/parcel2go.ts, lib/server/delivery-tracking.ts), the
 * admin orders list and the customer's Track Order page.
 */

/** In the order a parcel moves through them. */
export const deliveryStages = [
  "awaiting",
  "dropped_off",
  "collected",
  "in_transit",
  "at_depot",
  "out_for_delivery",
  "delivered",
] as const;

export type DeliveryStage = (typeof deliveryStages)[number];

/** The stages that send the customer an email. */
export type DeliveryNoticeStage = Extract<DeliveryStage, "out_for_delivery" | "delivered">;

export interface DeliveryTracking {
  stage: DeliveryStage;
  /** When the parcel reached its current stage, if the courier says. */
  stageAt: string | null;
  /** The courier's estimated delivery date, if any. */
  estimatedDelivery: string | null;
  /** The courier's most recent scan, e.g. "Parcel at Birmingham depot". */
  latestEvent: string | null;
  latestEventAt: string | null;
  /** The courier reported a problem, such as a failed delivery attempt. */
  problem: boolean;
  /** When this status was read from Parcel2Go. */
  updatedAt: string;
}

export const deliveryStageLabels: Record<DeliveryStage, string> = {
  awaiting: "Waiting for the courier",
  dropped_off: "Dropped off with the courier",
  collected: "Collected by the courier",
  in_transit: "In transit",
  at_depot: "At the local delivery depot",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export function deliveryStageRank(stage: DeliveryStage): number {
  return deliveryStages.indexOf(stage);
}

/**
 * Parcel2Go order numbers ("P2G12345678") and courier tracking numbers are
 * letters and digits; spaces and dashes people copy along are dropped.
 * Returns null for anything else.
 */
export function normalizeParcel2GoReference(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, "");
  return /^[A-Z0-9]{4,60}$/.test(compact) ? compact : null;
}
