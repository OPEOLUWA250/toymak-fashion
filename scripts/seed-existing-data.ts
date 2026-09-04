/**
 * One-time migration: copies whatever real contact messages and orders are
 * still sitting in the local JSON files (data/contact-messages.json,
 * data/server-orders.json) into Supabase, before those files stop being
 * read by the app. Safe to re-run — upserts on id / payment_reference.
 *
 * Run with: npx tsx scripts/seed-existing-data.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

function loadEnvLocal() {
  const raw = fs.readFileSync(".env.local", "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  });
}

function readJsonIfExists(path: string): any[] {
  if (!fs.existsSync(path)) return [];
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const supabase = createClient(url, serviceRoleKey);

  // --- Contact messages ---
  const messages = readJsonIfExists("data/contact-messages.json");
  if (messages.length > 0) {
    const rows = messages.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone ?? null,
      subject: m.subject,
      message: m.message,
      status: m.status,
      created_at: m.created_at,
    }));
    const { data, error } = await supabase.from("contact_messages").upsert(rows, { onConflict: "id" }).select("id");
    if (error) console.error("Contact messages seed FAILED:", error.message);
    else console.log(`Seeded ${data?.length ?? 0} contact message(s).`);
  } else {
    console.log("No contact messages to migrate.");
  }

  // --- Orders ---
  const orders = readJsonIfExists("data/server-orders.json");
  if (orders.length > 0) {
    const rows = orders.map((o) => ({
      id: o.id,
      tracking_id: o.tracking_id,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      customer_phone: o.customer_phone,
      shipping_address: o.shipping_address,
      status: o.status,
      tracking_link: o.tracking_link ?? null,
      currency: o.currency,
      payment_gateway: o.payment_gateway,
      payment_reference: o.payment_reference,
      items: o.items,
      subtotal: o.subtotal,
      shipping_cost: o.shipping_cost,
      tax: o.tax,
      discount_applied: o.discount_applied,
      total_amount: o.total_amount,
      created_at: o.created_at,
      updated_at: o.updated_at,
    }));
    const { data, error } = await supabase
      .from("orders")
      .upsert(rows, { onConflict: "payment_reference" })
      .select("id");
    if (error) console.error("Orders seed FAILED:", error.message);
    else console.log(`Seeded ${data?.length ?? 0} order(s).`);
  } else {
    console.log("No orders to migrate.");
  }
}

main();
