import { getSupabaseAdmin } from "./supabase";
import { ContactMessage } from "@/lib/types";
import { eventBus } from "./event-bus";

interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactMessage["status"];
  created_at: string;
}

function rowToMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    subject: row.subject,
    message: row.message,
    status: row.status,
    created_at: new Date(row.created_at),
  };
}

/**
 * Contact-form submissions, written by POST /api/contact and read by the
 * admin dashboard's Messages view. Unlike signups (localStorage, same-browser
 * only), this has to be a real server-side store — the person submitting the
 * form and the admin reading it are never the same browser.
 */
export async function getContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load contact messages: ${error.message}`);
  return (data as ContactMessageRow[]).map(rowToMessage);
}

export async function appendContactMessage(message: ContactMessage): Promise<void> {
  const { error } = await getSupabaseAdmin().from("contact_messages").insert({
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone ?? null,
    subject: message.subject,
    message: message.message,
    status: message.status,
  });

  if (error) throw new Error(`Failed to save contact message: ${error.message}`);
  eventBus.emit("contact-message", message);
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessage["status"],
): Promise<ContactMessage | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Failed to update contact message ${id}: ${error.message}`);
  return data ? rowToMessage(data as ContactMessageRow) : null;
}
