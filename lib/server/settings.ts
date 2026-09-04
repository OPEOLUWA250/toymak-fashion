import { getSupabaseAdmin } from "./supabase";
import { Currency } from "../types";

export interface StoreSettings {
  tax: Record<Currency, number>; // percent — 20 means 20%
  shippingThreshold: Record<Currency, number>; // free shipping above this subtotal
  shippingCost: Record<Currency, number>;
  exchangeRates: {
    gbpToNgn: number;
    gbpToUsd: number;
  };
  welcomeDiscountPercent: number; // applied to the WELCOME-XXXXXX coupon codes
  announcementEnabled: boolean;
  announcementText: string;
  announcementLink: string;
  orderNotificationEmail: string; // notified on every new order; blank disables it
}

interface SettingsRow {
  tax_gbp_percent: number;
  tax_ngn_percent: number;
  tax_usd_percent: number;
  shipping_threshold_gbp: number;
  shipping_cost_gbp: number;
  shipping_threshold_ngn: number;
  shipping_cost_ngn: number;
  shipping_threshold_usd: number;
  shipping_cost_usd: number;
  exchange_rate_gbp_to_ngn: number;
  exchange_rate_gbp_to_usd: number;
  welcome_discount_percent: number;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  order_notification_email: string;
}

function rowToSettings(row: SettingsRow): StoreSettings {
  return {
    tax: {
      GBP: Number(row.tax_gbp_percent),
      NGN: Number(row.tax_ngn_percent),
      USD: Number(row.tax_usd_percent),
    },
    shippingThreshold: {
      GBP: Number(row.shipping_threshold_gbp),
      NGN: Number(row.shipping_threshold_ngn),
      USD: Number(row.shipping_threshold_usd),
    },
    shippingCost: {
      GBP: Number(row.shipping_cost_gbp),
      NGN: Number(row.shipping_cost_ngn),
      USD: Number(row.shipping_cost_usd),
    },
    exchangeRates: {
      gbpToNgn: Number(row.exchange_rate_gbp_to_ngn),
      gbpToUsd: Number(row.exchange_rate_gbp_to_usd),
    },
    welcomeDiscountPercent: Number(row.welcome_discount_percent),
    announcementEnabled: row.announcement_enabled,
    announcementText: row.announcement_text,
    announcementLink: row.announcement_link,
    orderNotificationEmail: row.order_notification_email,
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("store_settings")
    .select("*")
    .eq("id", "default")
    .single();

  if (error) throw new Error(`Failed to load store settings: ${error.message}`);
  return rowToSettings(data as SettingsRow);
}

export async function updateStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("store_settings")
    .update({
      tax_gbp_percent: settings.tax.GBP,
      tax_ngn_percent: settings.tax.NGN,
      tax_usd_percent: settings.tax.USD,
      shipping_threshold_gbp: settings.shippingThreshold.GBP,
      shipping_cost_gbp: settings.shippingCost.GBP,
      shipping_threshold_ngn: settings.shippingThreshold.NGN,
      shipping_cost_ngn: settings.shippingCost.NGN,
      shipping_threshold_usd: settings.shippingThreshold.USD,
      shipping_cost_usd: settings.shippingCost.USD,
      exchange_rate_gbp_to_ngn: settings.exchangeRates.gbpToNgn,
      exchange_rate_gbp_to_usd: settings.exchangeRates.gbpToUsd,
      welcome_discount_percent: settings.welcomeDiscountPercent,
      announcement_enabled: settings.announcementEnabled,
      announcement_text: settings.announcementText,
      announcement_link: settings.announcementLink,
      order_notification_email: settings.orderNotificationEmail,
    })
    .eq("id", "default")
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update store settings: ${error.message}`);
  return rowToSettings(data as SettingsRow);
}
