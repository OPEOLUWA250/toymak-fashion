# Store reliability release

The application changes require `supabase/migrations/0012_store_reliability.sql` **before deployment**. This migration adds product visibility/variant inventory, checkout snapshots, atomic paid-order recording, return requests, audit history, and an email outbox. Existing products default to published; existing stock and orders are retained.

## Database setup

1. Open the Supabase project used by this store (the project URL in your environment), not another CLI-linked project.
2. Run the entire `0012_store_reliability.sql` file in the SQL Editor. It runs in a transaction; an error rolls the migration back.
3. Deploy the application only after the migration succeeds. Product saves, checkout, and activity depend on the new schema. Do not fall back to the old nontransactional order write.

The CLI available during implementation was authenticated to a different account/project. No live migration was applied. The migration was executed successfully in an isolated PostgreSQL engine for regression testing.

## Guest-only customers (no accounts)

Customers never sign up or log in. Checkout is guest-only, and afterwards a customer proves an order with **their checkout email plus the order number** (tracking ID, e.g. `TMK-AB12CD`), shown on the success page and in the confirmation email:

- `/track-order` — order status, courier link and receipt download (`POST /api/orders/lookup`, `POST /api/orders/[id]/receipt`). Email alone is never enough.
- Returns are handled by email, as the `/returns` policy page explains (hello@toymak.com with the order number); there is no in-app return request.
- `/account` permanently redirects to `/track-order`, so links in already-sent emails keep working.
- Wishlists are stored only in the browser (`localStorage`).
- No Supabase Auth setup (SMTP, magic-link templates, redirect URLs) is needed. The `customer_profiles` table created by migration 0012 is now unused and can be left in place or dropped.
- Set `NEXT_PUBLIC_SITE_URL` to the production origin for sitemap, canonical links, and emails.

## Admin sign-in and roles

The dashboard at `/admin` and every admin API route require a signed-in Supabase Auth user (email + password) who is one of:

| Role | Where it's set | Can |
| --- | --- | --- |
| **Owner** (a super admin) | `ADMIN_EMAILS` environment variable | Everything; can't be removed or demoted from the dashboard |
| **Super admin** | Dashboard → Admins | Everything, including adding, promoting, resetting and removing people |
| **Admin** | Dashboard → Admins | Everything except the Admins page |

All checks run on the server. Nobody can demote or remove themselves, so a super admin always remains. An empty `ADMIN_EMAILS` means there are no owners (the dashboard still works for super admins stored in the database).

Set up, in this order:

1. Run `supabase/migrations/0012_store_reliability.sql`, `0013_admin_users.sql` and `0014_attribution_and_email_opt_outs.sql`, in that order, in the Supabase SQL Editor. 0013 and 0014 are safe to re-run.
2. Supabase → Authentication → Sign In / Providers: keep **Email** enabled and turn **off** "Allow new users to sign up".
3. Authentication → Users → **Add user → Create new user** for the owner: email, strong password, **Auto Confirm User** ticked.
4. Set `ADMIN_EMAILS=owner@example.com` in `.env.local` and in Vercel (Production and Preview), then redeploy.
5. For password-reset emails: Authentication → URL Configuration → set the Site URL to the production origin and add `https://<your-domain>/api/auth/callback` (plus `http://localhost:3000/api/auth/callback` for development) to Redirect URLs. Configure custom SMTP for production; Supabase's built-in sender is heavily rate-limited. Reset links must be opened in the browser that requested them.

Everyone else is added from **Admins** in the dashboard sidebar (super admins only). A new person gets a temporary password to pass on privately; they must choose their own password before they can do anything else. Removing someone deletes their login, which ends their access immediately.

**Handover:** add the new person as a super admin. To hand over ownership as well, replace your email with theirs in `ADMIN_EMAILS` in Vercel and redeploy.

Public (by design): checkout, payment webhooks, guest order lookup and receipt, product/review/settings reads, the contact form, and first-order signups. `GET /api/settings` returns the order-notification email only to a signed-in admin.

The activity log still records `Unverified admin or system`: the server writes to the database with the service-role key, so database triggers can't see which admin made a change. Attributing changes to individual admins is a separate follow-up.

## Payment and email operations

- Configure Stripe to deliver `checkout.session.completed` and `checkout.session.async_payment_succeeded` to `/api/stripe/webhook` with `STRIPE_WEBHOOK_SECRET`.
- Configure Paystack's webhook to `/api/paystack/webhook`.
- Set a verified `RESEND_FROM_EMAIL`, `RESEND_API_KEY`, and `CRON_SECRET`. The sending domain is `toymakenterprise.co.uk` (Resend, EU region); its DNS is on Namecheap hosting, so Resend's records live in cPanel → Zone Editor. The From address (e.g. `orders@toymakenterprise.co.uk`) doesn't need a real mailbox. Until the domain is verified, Resend only delivers to the Resend account owner.
- **Until the domain is verified in Resend**, email is sent through the `admin@toymakenterprise.co.uk` mailbox instead: set `SMTP_USER` and `SMTP_PASSWORD` (the mailbox password) and leave `RESEND_FROM_EMAIL` empty. It uses Namecheap's `server112.web-hosting.com`, port 465 (override with `SMTP_HOST`/`SMTP_PORT`). No DNS changes are needed, but shared hosting limits emails per hour. Once the domain is verified, set `RESEND_FROM_EMAIL` and Resend takes over automatically; queued emails switch too.
- Optional `EMAIL_REPLY_TO` sets where customer replies go. Shop new-order alerts reply to the customer.
- Orders queue confirmation/admin emails transactionally. The immediate worker runs after the response; `/api/cron/order-emails` retries failed or interrupted delivery. The supplied Vercel schedule retries daily at 13:00 UTC; use a more frequent scheduler if the hosting plan supports it. The cron requires `Authorization: Bearer <CRON_SECRET>`.
- Email payloads, including PDF attachment bytes, are saved before sending so retries reuse the same provider idempotency key and content. Inspect `order_email_outbox.last_error`, `attempts`, and `sent_at` when diagnosing delivery.
- New checkouts save immutable prices/totals before contacting the gateway. Payment verification rejects a mismatched amount/currency. Pre-release Stripe sessions use Stripe's actual line items; original discount breakdown is unavailable for those legacy sessions.
- Stock deductions and order insertion commit together. A concurrent purchase that exhausts stock is retained as a paid order with a fulfillment warning for manual resolution. Stock is not reserved while a payment page is open.

## Abandoned-cart reminders

When a shopper types a valid email at checkout, the cart is saved in the background. `/api/cron/abandoned-carts` (daily, 12:00 UTC on Vercel's plan) emails carts left 1 hour to 7 days ago; placing an order deletes that person's saved cart.

- Only product ids, sizes, colours and quantities come from the browser. Names, images, prices and the subtotal in the email are rebuilt from the live catalogue, so the endpoint can't be used to send made-up content.
- "Return to my bag" is a signed link (`/cart?restore=…`) that restores the bag on any device. It reveals only the items, never the address.
- Every reminder has an unsubscribe link (`/unsubscribe`, which asks for confirmation) and one-click `List-Unsubscribe` headers for mail apps. Unsubscribing records the address in `email_opt_outs`, deletes its saved cart, and stops future saves and reminders. Order confirmations are unaffected.
- Links are signed with `EMAIL_LINK_SECRET`, or the service-role key if that isn't set. Changing the secret invalidates links in reminders already sent.

## First-order coupon emails

The popup's signup response never contains the coupon code. `/api/signups/send-coupon` accepts only a signup id and sends that record's own code to its own address, at most once every 5 minutes (`signups.email_last_sent_at`, migration 0014).

## Products and audit history

The in-app returns and refunds section has been removed: returns are arranged by email and refunds are made directly in Stripe/Paystack. The `return_requests` table and `update_return_request` function from 0012 are no longer used by the app; they can stay in place. Orders keep their `refunded_amount` column (always 0 unless set directly in the database).

Products can be Published, Draft, or Archived. Optional size/colour inventory sums to total stock; newly enabled combinations start at zero and must be filled in. Draft/archived products are excluded from public listings, direct product pages, and the sitemap.

Database triggers record product, order, settings, and admin changes. Changes made through the dashboard record the signed-in admin's email (every admin API route runs inside `adminRoute`, which sends it to the database in the `x-toymak-actor` header). Changes from checkout, payment webhooks and scheduled jobs show `System or customer`. Entries made before migration 0014 show `Unverified admin or system`.

## Validation

Run `npx tsc --noEmit --incremental false` and `node --test tests/*.test.cjs`.

For database tests, install `@electric-sql/pglite` in a temporary directory and set `PGLITE_MODULE` to its module path before running the tests. Without that variable the database suite is explicitly skipped. Tests execute the real migration and transaction functions against an isolated database, never the live store.

Automated tests mock payment and email services. Before launch, finish a Stripe and Paystack sandbox payment, cancellation, repeated webhook delivery, confirmation email, guest order tracking and receipt download, and admin sign-in/management using disposable test data. These external-service checks were not performed against the live store.

References: [Supabase SSR authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
