import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './supabase';
import type { PaymentVerification } from '../order-builder';

export async function saveCheckoutSnapshot(gateway: 'stripe' | 'paystack', verification: PaymentVerification) {
  const id = randomUUID();
  const { error } = await getSupabaseAdmin().from('checkout_snapshots').insert({ id, gateway, verification });
  if (error) throw new Error('Checkout is temporarily unavailable. Please try again later.');
  return id;
}

export async function verifyCheckoutSnapshot(id: string, gateway: 'stripe' | 'paystack', amount: number, currency: string): Promise<PaymentVerification> {
  const { data, error } = await getSupabaseAdmin().from('checkout_snapshots').select('verification').eq('id', id).eq('gateway', gateway).single();
  if (error || !data) throw new Error('The saved checkout could not be found. Contact support with your payment reference.');
  const verification = data.verification as PaymentVerification;
  if (!Number.isSafeInteger(amount) || amount !== Math.round(verification.total * 100) || currency.toUpperCase() !== verification.currency) throw new Error('Payment amount or currency does not match checkout.');
  return verification;
}
