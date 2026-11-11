import type { Order } from "@/lib/types";
import { siteUrl } from "@/lib/site-url";
import { contactEmail } from "@/lib/site-info";
import { normalizeExternalUrl } from "@/lib/utils";
import { royalMailTrackingUrl } from "@/lib/royal-mail";
import { sendEmail } from "./email-sender";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Your order is on its way", with the Royal Mail tracking number (or the courier's link). */
export function buildShippedEmail(order: Order, origin = siteUrl) {
  const firstName = escapeHtml(order.customer_name.split(" ")[0] || "there");
  const trackOrderUrl = `${origin}/track-order?email=${encodeURIComponent(order.customer_email)}&order=${encodeURIComponent(order.tracking_id)}`;
  const courierUrl = order.tracking_number
    ? royalMailTrackingUrl(order.tracking_number)
    : order.tracking_link ? normalizeExternalUrl(order.tracking_link) : trackOrderUrl;
  const service = order.royal_mail?.serviceName;
  const items = order.items
    .map((item) => `<li style="margin:4px 0;">${item.quantity} × ${escapeHtml(item.product_name)} (${escapeHtml(item.size)}, ${escapeHtml(item.color)})</li>`)
    .join("");

  const trackingRow = order.tracking_number
    ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(16,24,32,0.04);padding:14px 16px;margin:0 0 16px;">
            <tr>
              <td style="font-size:12px;color:rgba(16,24,32,0.5);">Royal Mail tracking number</td>
              <td style="font-size:12px;text-align:right;font-weight:600;"><a href="${escapeHtml(courierUrl)}" style="color:#101820;">${escapeHtml(order.tracking_number)}</a></td>
            </tr>${service ? `
            <tr>
              <td style="font-size:12px;color:rgba(16,24,32,0.5);padding-top:4px;">Service</td>
              <td style="font-size:12px;text-align:right;color:#101820;padding-top:4px;">${escapeHtml(service)}</td>
            </tr>` : ""}
          </table>`
    : "";

  const html = `
  <div style="background:#f3f3f3;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;text-align:center;">
          <img src="${siteUrl}/brand/logo-black.png" alt="TOYMAK" width="180" height="40" style="display:inline-block;border:0;outline:none;height:40px;width:180px;font-size:20px;font-weight:800;letter-spacing:0.02em;color:#101820;" />
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#101820;">Shipped</p>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#101820;">Your order is on its way, ${firstName}</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:rgba(16,24,32,0.65);">
            ${order.tracking_number
              ? "We&#39;ve sent your parcel with Royal Mail. Royal Mail will let you know when it&#39;s out for delivery."
              : "We&#39;ve sent your parcel. Follow it with the courier using the button below."}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;font-size:13px;color:#101820;">${trackingRow}
          <p style="margin:0 0 8px;color:rgba(16,24,32,0.5);">Order ${escapeHtml(order.tracking_id)}</p>
          <ul style="margin:0;padding-left:18px;color:rgba(16,24,32,0.75);">${items}</ul>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px;text-align:center;">
          <a href="${escapeHtml(courierUrl)}" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">
            ${order.tracking_number ? "Track with Royal Mail" : "Track My Parcel"}
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(16,24,32,0.4);">
            <a href="${trackOrderUrl}" style="color:rgba(16,24,32,0.6);">View your order</a> · Questions? Reach us at ${contactEmail}
          </p>
        </td>
      </tr>
    </table>
  </div>`;

  return { to: order.customer_email, subject: `Your Toymak order ${order.tracking_id} has shipped`, html };
}

export async function sendShippedEmail(order: Order): Promise<boolean> {
  const { error } = await sendEmail(buildShippedEmail(order), { idempotencyKey: `shipped/${order.id}/${order.tracking_number ?? "link"}` });
  if (error) console.error(`Shipped email for order ${order.id} failed:`, error);
  return !error;
}
