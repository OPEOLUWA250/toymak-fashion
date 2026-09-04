import { NextRequest, NextResponse } from "next/server";
import { createOrGetSignup, getAllSignups } from "@/lib/server/signups";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const signups = await getAllSignups();
    return NextResponse.json({ signups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load signups" },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json({ signup, isNew });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create signup" },
      { status: 500 },
    );
  }
}
