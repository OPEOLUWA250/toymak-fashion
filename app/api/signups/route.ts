import { NextRequest, NextResponse } from "next/server";
import { createOrGetSignup, getAllSignups } from "@/lib/server/signups";
import { adminRoute } from "@/lib/server/admin-auth";
import { isDisposableEmail } from "@/lib/server/disposable-email";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  try {
    const signups = await getAllSignups();
    return NextResponse.json({ signups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load signups" },
      { status: 500 },
    );
  }
});

interface CreateSignupBody {
  firstName: string;
  lastName: string;
  email: string;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<CreateSignupBody>;
  const firstName = typeof body.firstName === "string" ? body.firstName.slice(0, 100) : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.slice(0, 100) : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  // Throwaway inboxes are the cheapest way to collect many welcome codes.
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: "Please use a permanent email address. Temporary inboxes can't receive the welcome code." },
      { status: 400 },
    );
  }

  try {
    const { signup, isNew } = await createOrGetSignup(firstName, lastName, email);
    // Never return the coupon code: it's only ever delivered by email, so
    // the popup can't be scripted to mint unlimited codes for fake addresses.
    return NextResponse.json({ signup: { id: signup.id, email: signup.email }, isNew });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create signup" },
      { status: 500 },
    );
  }
}
