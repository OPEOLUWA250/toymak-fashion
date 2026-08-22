import { promises as fs } from "fs";
import path from "path";
import { Order } from "@/lib/types";
import { eventBus } from "./event-bus";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "server-orders.json");

/**
 * Durable, browser-independent record of confirmed payments — written by
 * the Stripe/Paystack webhook routes so an order exists even if the
 * customer's browser never makes it back to /checkout/success. Client
 * pages (useOrders) pull from GET /api/orders and merge these in.
 *
 * This is a flat JSON file, which is honest-but-limited: it's durable for
 * local dev and a single always-on Node server, but on serverless hosting
 * (e.g. Vercel) the filesystem is ephemeral between invocations — a real
 * production deployment needs a database here, same as everywhere else in
 * this project marked "swap for a real backend later."
 */
async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

export async function getServerOrders(): Promise<Order[]> {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

// Serializes writes within this process. Without it, two webhooks landing
// close together (Stripe and Paystack can both retry, or two customers
// checking out around the same moment) could each read the file before the
// other's write lands, and the second write would silently clobber the
// first — a classic lost-update race on a plain read-modify-write file.
let writeQueue: Promise<void> = Promise.resolve();

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/**
 * Idempotent on payment_reference — Stripe and Paystack both retry webhook
 * delivery, so the same event can arrive more than once.
 */
export async function appendServerOrder(order: Order): Promise<{ added: boolean }> {
  return withWriteLock(async () => {
    await ensureFile();
    const orders = await getServerOrders();
    if (orders.some((existing) => existing.payment_reference === order.payment_reference)) {
      return { added: false };
    }
    orders.unshift(order);
    await fs.writeFile(FILE_PATH, JSON.stringify(orders, null, 2), "utf-8");
    eventBus.emit("order", order);
    return { added: true };
  });
}
