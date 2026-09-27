import { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/pricing";
import { generateReceiptPdf } from "./receipt-pdf";
import { emailSender, sendEmail } from "./email-sender";

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
          <a href="${origin}/track-order?email=${encodeURIComponent(order.customer_email)}&order=${encodeURIComponent(order.tracking_id)}" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">
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

export interface PreparedOrderEmail {
  from: string; to: string; subject: string; html: string; replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function prepareOrderEmail(order: Order, origin: string, kind: 'customer' | 'admin', notifyEmail = ''): Promise<PreparedOrderEmail | null> {
  if (kind === 'admin' && !notifyEmail.trim()) return null;
  const base = emailSender();
  // Replying to the shop's new-order alert goes straight to the customer.
  if (kind === 'admin') return { ...base, replyTo: order.customer_email, to: notifyEmail.trim(), subject: `New order ${order.tracking_id} — ${formatCurrency(order.total_amount, order.currency)}`, html: buildAdminNotificationHtml(order, origin) };
  const receipt = await generateReceiptPdf(order);
  return { ...base, to: order.customer_email, subject: `Your Toymak order ${order.tracking_id} is confirmed`, html: buildOrderEmailHtml(order, origin), attachments: [{ filename: `toymak-receipt-${order.tracking_id}.pdf`, content: receipt.toString('base64'), contentType: 'application/pdf' }] };
}

export async function sendPreparedOrderEmail(payload: PreparedOrderEmail, idempotencyKey: string): Promise<boolean> {
  const { error } = await sendEmail(payload, { idempotencyKey });
  if (error) console.error(`Order email to ${payload.to} failed:`, error);
  return !error;
}
