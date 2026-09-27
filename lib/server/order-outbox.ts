import { getSupabaseAdmin } from './supabase';
import { getServerOrderById } from './order-store';
import { prepareOrderEmail, sendPreparedOrderEmail } from './order-email';
import { getStoreSettings } from './settings';
import { siteUrl } from '../site-url';
export async function dispatchOrderEmails(orderId?: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc('claim_order_emails', { target_order: orderId ?? null });
  if (error) throw new Error('Could not claim pending order emails.');
  let sent = 0;
  for (const job of data ?? []) {
    try {
      const order = await getServerOrderById(job.order_id);
      if (!order) throw new Error('Order not found');
      let payload = job.email_payload;
      if (!payload) {
        payload = await prepareOrderEmail(order, siteUrl, job.kind, job.kind === 'admin' ? (await getStoreSettings()).orderNotificationEmail : '');
        if (payload) {
          const { error } = await db.from('order_email_outbox').update({ email_payload: payload }).eq('id', job.id);
          if (error) throw error;
        }
      }
      const success = payload ? await sendPreparedOrderEmail(payload, `order-email/${job.id}`) : true;
      if (!success) throw new Error('Email provider did not accept the message');
      const { error: saveError } = await db.from('order_email_outbox').update({ sent_at: new Date().toISOString(), last_error: null }).eq('id', job.id);
      if (saveError) throw saveError;
      sent++;
    } catch {
      await db.from('order_email_outbox').update({ last_error: 'Delivery failed; awaiting retry.' }).eq('id', job.id);
    }
  }
  return { checked: data?.length ?? 0, sent };
}
