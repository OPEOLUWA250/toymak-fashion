import { NextRequest, NextResponse } from "next/server";
import { appendContactMessage, getContactMessages } from "@/lib/server/contact-store";
import { ContactMessage } from "@/lib/types";

interface ContactRequestBody {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ContactRequestBody>;

  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const subject = clean(body.subject, 150);
  const message = clean(body.message, 4000);

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "Name, email, subject, and message are all required." },
      { status: 400 },
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const contactMessage: ContactMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    phone: phone || undefined,
    subject,
    message,
    status: "new",
    created_at: new Date(),
  };

  try {
    await appendContactMessage(contactMessage);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send your message." },
      { status: 500 },
    );
  }
}

// Read by the admin dashboard's Messages view.
export async function GET() {
  try {
    const messages = await getContactMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to read contact messages:", error);
    return NextResponse.json({ messages: [] });
  }
}
