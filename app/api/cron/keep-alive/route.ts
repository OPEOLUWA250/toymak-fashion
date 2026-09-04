import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

/**
 * Pinged on a schedule by Vercel Cron (see vercel.json) purely to stop
 * Supabase's free-tier project from auto-pausing after 7 days of zero API
 * activity — a real query against a real table, not just a HEAD request,
 * since it's actual database activity that resets that clock.
 *
 * Verifies the CRON_SECRET Vercel sends automatically once that env var is
 * set on the project, so this can't be triggered by anyone who finds the
 * URL. Falls open (no check) if CRON_SECRET isn't configured yet, so the
 * route still works before that's set up — add CRON_SECRET in Vercel's
 * project settings (any random string) to lock it down.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { error } = await getSupabaseAdmin().from("products").select("id").limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Keep-alive ping failed." },
      { status: 500 },
    );
  }
}
