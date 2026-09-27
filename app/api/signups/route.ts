import { NextRequest, NextResponse } from "next/server";
import { createOrGetSignup, getAllSignups } from "@/lib/server/signups";
import { adminRoute } from "@/lib/server/admin-auth";

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
  const body = (await request.json()) as CreateSignupBody;
  const { firstName, lastName, email } = body;

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    const { signup, isNew } = await createOrGetSignup(firstName ?? "", lastName ?? "", email);
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
