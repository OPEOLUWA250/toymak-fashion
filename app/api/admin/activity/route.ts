import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase';
import { adminRoute } from '@/lib/server/admin-auth';
export const GET = adminRoute(async () => {
  const { data, error } = await getSupabaseAdmin().from('admin_activity').select('*').order('created_at', { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: 'Could not load activity.' }, { status: 500 }) : NextResponse.json({ activity: data }, { headers: { 'Cache-Control': 'private, no-store' } });
});
