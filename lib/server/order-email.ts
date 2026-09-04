import { Resend } from "resend";
import { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/pricing";
import { generateReceiptPdf } from "./receipt-pdf";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderEmailHtml(order: Order, origin: string): string {
  const firstName = escapeHtml(order.customer_name.split(" ")[0] || "there");

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(16,24,32,0.08);font-size:13px;color:#101820;">
          ${escapeHtml(item.product_name)}<br />
          <span style="color:rgba(16,24,32,0.5);font-size:12px;">Size ${escapeHtml(item.size)} · ${escapeHtml(item.color)} · Qty ${item.quantity}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(16,24,32,0.08);font-size:13px;color:#101820;text-align:right;white-space:nowrap;">
          ${escapeHtml(formatCurrency(item.subtotal, order.currency))}
        </td>
      </tr>`,
    )
    .join("");

  const totalsRow = (label: string, value: string, accent = false) => `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:${accent ? "#101820;font-weight:600" : "rgba(16,24,32,0.6)"};">${label}</td>
      <td style="padding:4px 0;font-size:13px;color:${accent ? "#101820;font-weight:600" : "rgba(16,24,32,0.6)"};text-align:right;">${value}</td>
    </tr>`;

  return `
  <div style="background:#f3f3f3;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;text-align:center;">
          <span style="font-size:20px;font-weight:800;letter-spacing:0.02em;color:#101820;">TOYMAK</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#101820;">Order Confirmed</p>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#101820;">
            Thanks, ${firstName}!
          </h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:rgba(16,24,32,0.65);">
            We&#39;ve got your order and we&#39;re getting it ready to ship.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(16,24,32,0.04);padding:14px 16px;">
            <tr>
              <td style="font-size:12px;color:rgba(16,24,32,0.5);">Order ID</td>
              <td style="font-size:12px;color:#101820;text-align:right;font-weight:600;">${escapeHtml(order.id)}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:rgba(16,24,32,0.5);padding-top:4px;">Tracking ID</td>
              <td style="font-size:12px;color:#101820;text-align:right;font-weight:600;padding-top:4px;">${escapeHtml(order.tracking_id)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemsRows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${totalsRow("Subtotal", escapeHtml(formatCurrency(order.subtotal + order.discount_applied, order.currency)))}
            ${order.discount_applied > 0 ? totalsRow("Discount", `-${escapeHtml(formatCurrency(order.discount_applied, order.currency))}`) : ""}
            ${totalsRow("Shipping", order.shipping_cost === 0 ? "FREE" : escapeHtml(formatCurrency(order.shipping_cost, order.currency)))}
            ${totalsRow("Tax", escapeHtml(formatCurrency(order.tax, order.currency)))}
            ${totalsRow("Total", escapeHtml(formatCurrency(order.total_amount, order.currency)), true)}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px;text-align:center;">
          <a href="${origin}/account?email=${encodeURIComponent(order.customer_email)}&auto=1" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">
            Track My Order
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(16,24,32,0.4);">
            Questions? Reach us at hello@toymak.com — Toymak, premium shapewear for the modern woman.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

function buildAdminNotificationHtml(order: Order, origin: string): string {
  const itemsList = order.items
    .map(
      (item) =>
        `<li style="margin:4px 0;">${item.quantity} × ${escapeHtml(item.product_name)} (${escapeHtml(item.size)}, ${escapeHtml(item.color)})</li>`,
    )
    .join("");

  return `
  <div style="background:#f3f3f3;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;text-align:center;">
          <span style="font-size:20px;font-weight:800;letter-spacing:0.02em;color:#101820;">TOYMAK</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#101820;">New Order</p>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#101820;">
            ${escapeHtml(formatCurrency(order.total_amount, order.currency))}
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;font-size:13px;color:#101820;">
          <p style="margin:0 0 8px;"><strong>${escapeHtml(order.customer_name)}</strong> — ${escapeHtml(order.customer_email)}</p>
          <p style="margin:0 0 12px;color:rgba(16,24,32,0.6);">Order ${escapeHtml(order.id)} · Tracking ${escapeHtml(order.tracking_id)} · ${escapeHtml(order.payment_gateway)}</p>
          <ul style="margin:0;padding-left:18px;color:rgba(16,24,32,0.75);">
            ${itemsList}
          </ul>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px;text-align:center;">
          <a href="${origin}/admin" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">
            Open Admin Dashboard
          </a>
        </td>
      </tr>
    </table>
  </div>`;
}

/**
 * Best-effort — a failed or unconfigured email must never break order
 * recording, so this catches everything itself instead of throwing back
 * into appendServerOrder's critical path.
 */
export async function sendOrderConfirmationEmail(order: Order, origin: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`Skipped order confirmation email for ${order.id}: RESEND_API_KEY not configured.`);
    return;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Toymak <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  // A PDF rendering failure shouldn't cost the customer their confirmation
  // email entirely — worst case, it sends without the attachment.
  let receiptBuffer: Buffer | null = null;
  try {
    receiptBuffer = await generateReceiptPdf(order);
  } catch (error) {
    console.error(`Receipt PDF generation failed for ${order.id}:`, error);
  }

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: order.customer_email,
      subject: `Your Toymak order ${order.tracking_id} is confirmed`,
      html: buildOrderEmailHtml(order, origin),
      attachments: receiptBuffer
        ? [{ filename: `toymak-receipt-${order.tracking_id}.pdf`, content: receiptBuffer, contentType: "application/pdf" }]
        : undefined,
    });
    if (error) {
      console.error(`Order confirmation email failed for ${order.id}:`, error.message);
    }
  } catch (error) {
    console.error(`Order confirmation email failed for ${order.id}:`, error);
  }
}

/**
 * Notifies the admin inbox configured in Settings whenever a new order
 * lands — separate from the customer confirmation above so one failing
 * never affects the other. No-ops silently if no address is configured
 * (the default, until an admin sets one) or Resend isn't set up.
 */
export async function sendAdminOrderNotificationEmail(order: Order, origin: string, notifyEmail: string): Promise<void> {
  if (!notifyEmail.trim()) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`Skipped admin order notification for ${order.id}: RESEND_API_KEY not configured.`);
    return;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Toymak <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: notifyEmail.trim(),
      subject: `New order ${order.tracking_id} — ${formatCurrency(order.total_amount, order.currency)}`,
      html: buildAdminNotificationHtml(order, origin),
    });
    if (error) {
      console.error(`Admin order notification failed for ${order.id}:`, error.message);
    }
  } catch (error) {
    console.error(`Admin order notification failed for ${order.id}:`, error);
  }
}
