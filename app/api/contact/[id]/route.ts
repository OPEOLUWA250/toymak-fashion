import { NextRequest, NextResponse } from "next/server";
import { updateContactMessageStatus } from "@/lib/server/contact-store";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { status?: "new" | "read" };

  if (body.status !== "new" && body.status !== "read") {
    return NextResponse.json({ error: "status must be 'new' or 'read'." }, { status: 400 });
  }

  try {
    const updated = await updateContactMessageStatus(id, body.status);
    if (!updated) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    return NextResponse.json({ message: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update this message." },
      { status: 500 },
    );
  }
}
