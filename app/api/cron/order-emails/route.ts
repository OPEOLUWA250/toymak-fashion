import { NextRequest, NextResponse } from 'next/server';
import { dispatchOrderEmails } from '@/lib/server/order-outbox';
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await dispatchOrderEmails()); }
  catch { return NextResponse.json({ error: 'Email retry failed.' }, { status: 500 }); }
}
