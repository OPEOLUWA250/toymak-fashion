import { AbandonedCart } from "./abandoned-carts";
import { formatCurrency } from "@/lib/pricing";
import { createEmailLinkToken } from "./email-links";
import { isEmailConfigured, sendEmail } from "./email-sender";

/** Links that work on any device: restore the bag, or stop these emails. */
function cartEmailLinks(cart: AbandonedCart, origin: string) {
  const restoreToken = createEmailLinkToken("restore-cart", cart.email);
  const unsubscribeToken = encodeURIComponent(createEmailLinkToken("unsubscribe", cart.email));
  return {
    restore: `${origin}/cart?restore=${encodeURIComponent(restoreToken)}`,
    unsubscribePage: `${origin}/unsubscribe?token=${unsubscribeToken}`,
    unsubscribeOneClick: `${origin}/api/email/unsubscribe?token=${unsubscribeToken}`,
  };
}

// Product images are normally full URLs already; make any relative one absolute for email.
function absoluteUrl(url: string, origin: string): string {
  return /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAbandonedCartEmailHtml(cart: AbandonedCart, origin: string): string {
  const links = cartEmailLinks(cart, origin);
  const firstName = escapeHtml((cart.customerName ?? "").split(" ")[0] || "there");

  const itemsRows = cart.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px;width:64px;">
          <img src="${escapeHtml(absoluteUrl(item.image_url, origin))}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;" />
        </td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(16,24,32,0.08);font-size:13px;color:#101820;">
          ${escapeHtml(item.product_name)}<br />
          <span style="color:rgba(16,24,32,0.5);font-size:12px;">Size ${escapeHtml(item.size)} · ${escapeHtml(item.color)} · Qty ${item.quantity}</span>
        </td>
      </tr>`,
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
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#101820;">Still thinking it over?</p>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#101820;">
            You left something behind, ${firstName}
          </h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:rgba(16,24,32,0.65);">
            Your bag is still saved — here's what's waiting for you.
          </p>
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
        <td style="padding:16px 32px 0;text-align:right;font-size:13px;color:rgba(16,24,32,0.6);">
          Subtotal: <strong style="color:#101820;">${escapeHtml(formatCurrency(cart.subtotal, cart.currency))}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px;text-align:center;">
          <a href="${escapeHtml(links.restore)}" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">
            Return To My Bag
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(16,24,32,0.4);">
            Questions? Reach us at hello@toymak.com — Toymak, premium shapewear for the modern woman.
          </p>
          <p style="margin:12px 0 0;font-size:11px;color:rgba(16,24,32,0.4);">
            Don&#39;t want bag reminders?
            <a href="${escapeHtml(links.unsubscribePage)}" style="color:rgba(16,24,32,0.55);">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

/**
 * Best-effort, same pattern as the other order emails — failures here must
 * never break the cron run that's sending several of these in a loop.
 */
export async function sendAbandonedCartRecoveryEmail(cart: AbandonedCart, origin: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn(`Skipped abandoned cart email for ${cart.id}: email isn't configured.`);
    return false;
  }

  const { error } = await sendEmail({
      to: cart.email,
      subject: "You left something in your bag",
      html: buildAbandonedCartEmailHtml(cart, origin),
      // One-click unsubscribe shown by Gmail, Apple Mail, etc. (RFC 8058).
      headers: {
        "List-Unsubscribe": `<${cartEmailLinks(cart, origin).unsubscribeOneClick}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
  });
  if (error) {
    console.error(`Abandoned cart email failed for ${cart.id}:`, error);
    return false;
  }
  return true;
}
