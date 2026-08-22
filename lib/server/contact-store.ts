import { promises as fs } from "fs";
import path from "path";
import { ContactMessage } from "@/lib/types";
import { eventBus } from "./event-bus";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "contact-messages.json");

/**
 * Contact-form submissions, written by POST /api/contact and read by the
 * admin dashboard's Messages view. Unlike signups (localStorage, same-browser
 * only), this has to be a real server-side store — the person submitting the
 * form and the admin reading it are never the same browser.
 *
 * Flat JSON file: durable for local dev and a single always-on Node server,
 * but ephemeral on serverless hosting (Vercel) — same "swap for a real
 * database" ceiling as the order store.
 */
async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  try {
    return JSON.parse(raw) as ContactMessage[];
  } catch {
    return [];
  }
}

// Serializes writes within this process — same lost-update race as the
// order store if two submissions land close together without it.
let writeQueue: Promise<void> = Promise.resolve();

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function appendContactMessage(message: ContactMessage): Promise<void> {
  await withWriteLock(async () => {
    await ensureFile();
    const messages = await getContactMessages();
    messages.unshift(message);
    await fs.writeFile(FILE_PATH, JSON.stringify(messages, null, 2), "utf-8");
    eventBus.emit("contact-message", message);
  });
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessage["status"],
): Promise<ContactMessage | null> {
  return withWriteLock(async () => {
    await ensureFile();
    const messages = await getContactMessages();
    const index = messages.findIndex((m) => m.id === id);
    if (index === -1) return null;

    messages[index] = { ...messages[index], status };
    await fs.writeFile(FILE_PATH, JSON.stringify(messages, null, 2), "utf-8");
    return messages[index];
  });
}
