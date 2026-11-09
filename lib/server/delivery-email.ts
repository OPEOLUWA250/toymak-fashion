import type { DeliveryNoticeStage } from "@/lib/delivery";
import type { Order } from "@/lib/types";
import { siteUrl } from "@/lib/site-url";
import { contactEmail } from "@/lib/site-info";
import { sendEmail } from "./email-sender";
import { parcel2GoTrackingUrl } from "@/lib/parcel2go-booking";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const copy: Record<DeliveryNoticeStage, { eyebrow: string; subject: (orderNumber: string) => string; heading: string; body: string }> = {
  out_for_delivery: {
    eyebrow: "Out for Delivery",
    subject: (orderNumber) => `Your Toymak order ${orderNumber} is out for delivery`,
    heading: "Your order arrives today",
    body: "Your parcel is with the driver and on its way to you. Keep an eye out for the courier.",
  },
  delivered: {
    eyebrow: "Delivered",
    subject: (orderNumber) => `Your Toymak order ${orderNumber} has been delivered`,
    heading: "Your order has arrived",
    body: "The courier has marked your parcel as delivered. We hope you love it. If anything isn't right, reply to this email and we'll help.",
  },
};

export function buildDeliveryEmail(order: Order, stage: DeliveryNoticeStage, origin = siteUrl) {
  const text = copy[stage];
  const firstName = escapeHtml(order.customer_name.split(" ")[0] || "there");
  const trackUrl = `${origin}/track-order?email=${encodeURIComponent(order.customer_email)}&order=${encodeURIComponent(order.tracking_id)}`;
  const items = order.items
    .map((item) => `<li style="margin:4px 0;">${item.quantity} × ${escapeHtml(item.product_name)} (${escapeHtml(item.size)}, ${escapeHtml(item.color)})</li>`)
    .join("");

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
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#101820;">${text.eyebrow}</p>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#101820;">${escapeHtml(text.heading)}, ${firstName}</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:rgba(16,24,32,0.65);">${escapeHtml(text.body)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;font-size:13px;color:#101820;">
          <p style="margin:0 0 8px;color:rgba(16,24,32,0.5);">Order ${escapeHtml(order.tracking_id)}${order.parcel2go_reference ? ` · Parcel2Go tracking <a href="${parcel2GoTrackingUrl(order.parcel2go_reference)}" style="color:#101820;">${escapeHtml(order.parcel2go_reference)}</a>` : ""}</p>
          <ul style="margin:0;padding-left:18px;color:rgba(16,24,32,0.75);">${items}</ul>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px;text-align:center;">
          <a href="${trackUrl}" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">Track My Order</a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(16,24,32,0.4);">Questions? Reach us at ${contactEmail}</p>
        </td>
      </tr>
    </table>
  </div>`;

  return { to: order.customer_email, subject: text.subject(order.tracking_id), html };
}

export async function sendDeliveryEmail(order: Order, stage: DeliveryNoticeStage): Promise<boolean> {
  const { error } = await sendEmail(buildDeliveryEmail(order, stage), { idempotencyKey: `delivery/${order.id}/${stage}` });
  if (error) console.error(`Delivery email (${stage}) for order ${order.id} failed:`, error);
  return !error;
}
