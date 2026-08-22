import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

interface SendCouponRequestBody {
  firstName: string;
  email: string;
  couponCode: string;
  discountLabel: string;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const COUPON_CODE_PATTERN = /^WELCOME-[A-Z0-9]{6}$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCouponEmailHtml({
  firstName,
  couponCode,
  discountLabel,
  origin,
}: {
  firstName: string;
  couponCode: string;
  discountLabel: string;
  origin: string;
}) {
  const firstNameSafe = escapeHtml(firstName.trim() || "there");
  const discountLabelSafe = escapeHtml(discountLabel);
  const couponCodeSafe = escapeHtml(couponCode);

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
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#101820;">Just For You</p>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:700;color:#101820;">
            ${discountLabelSafe} your first order
          </h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:rgba(16,24,32,0.65);">
            Hi ${firstNameSafe}, thanks for joining the list. Here's your code — enter it at checkout
            to claim your discount.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 8px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;border:2px dashed rgba(16,24,32,0.35);background:rgba(16,24,32,0.04);">
            <tr>
              <td style="padding:18px 32px;">
                <span style="font-size:22px;font-weight:700;letter-spacing:0.1em;color:#101820;user-select:all;">${couponCodeSafe}</span>
              </td>
            </tr>
          </table>
          <p style="margin:8px 0 0;font-size:11px;color:rgba(16,24,32,0.4);">
            Tap and hold (or double-click) the code to select and copy it
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 32px;text-align:center;">
          <a href="${origin}/shop" style="display:inline-block;background:#101820;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;">
            Shop Now
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(16,24,32,0.4);">
            One use per customer. Toymak — premium shapewear for the modern woman.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email isn't configured yet. Add RESEND_API_KEY to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as SendCouponRequestBody;
  const { firstName, email, couponCode, discountLabel } = body;

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!couponCode || !COUPON_CODE_PATTERN.test(couponCode)) {
    return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });
  }

  // The link back to the site is derived from the request itself, never
  // from client-supplied input — otherwise anyone could POST here directly
  // and use our Resend account to send a branded email pointing anywhere,
  // to any address.
  const origin = request.nextUrl.origin;
  const safeDiscountLabel = (discountLabel || "").replace(/[\r\n]/g, "").slice(0, 60) || "your";
  const safeFirstName = (firstName || "").replace(/[\r\n]/g, "").slice(0, 100);

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Toymak <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `Your ${safeDiscountLabel} Toymak code is here`,
      html: buildCouponEmailHtml({
        firstName: safeFirstName,
        couponCode,
        discountLabel: safeDiscountLabel,
        origin,
      }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send the coupon email." },
      { status: 500 },
    );
  }
}
