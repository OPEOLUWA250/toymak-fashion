import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Every store email (order confirmations, shop alerts, coupons, bag
 * reminders) goes through sendEmail, which picks the provider:
 *
 * 1. RESEND_FROM_EMAIL set — Resend, from that address. It must be on a
 *    domain verified in Resend (e.g. "Toymak <orders@toymakenterprise.co.uk>").
 * 2. Otherwise SMTP_USER + SMTP_PASSWORD set — sent through that mailbox's
 *    own mail server (SMTP_HOST, SMTP_PORT; defaults suit the
 *    admin@toymakenterprise.co.uk mailbox on Namecheap hosting). Works
 *    without any DNS changes; shared hosting limits volume per hour.
 * 3. Otherwise — Resend's test sender, which only delivers to the Resend
 *    account owner.
 *
 * EMAIL_REPLY_TO (optional) is where customer replies go.
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** content is base64. */
  attachments?: { filename: string; content: string; contentType: string }[];
}

type Provider = "resend" | "smtp";

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
}

// server112.web-hosting.com is the Namecheap server behind
// mail.toymakenterprise.co.uk; its TLS certificate is issued to that name,
// so connecting to it keeps certificate checking on.
const DEFAULT_SMTP_HOST = "server112.web-hosting.com";

function smtpSettings(): SmtpSettings | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 465;
  return { host: process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST, port, user, pass };
}

function provider(): Provider {
  return !process.env.RESEND_FROM_EMAIL?.trim() && smtpSettings() ? "smtp" : "resend";
}

/** The From address and default reply-to for the active provider. */
export function emailSender(): { from: string; replyTo?: string } {
  const smtp = smtpSettings();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    (smtp ? `Toymak <${smtp.user}>` : "Toymak <onboarding@resend.dev>");
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  return replyTo ? { from, replyTo } : { from };
}

export function isEmailConfigured(): boolean {
  return provider() === "smtp" || !!process.env.RESEND_API_KEY;
}

declare global {
  // eslint-disable-next-line no-var
  var __toymakSmtpTransport: { key: string; transport: Transporter } | undefined;
}

function smtpTransport(settings: SmtpSettings): Transporter {
  const key = `${settings.host}:${settings.port}:${settings.user}:${settings.pass}`;
  if (globalThis.__toymakSmtpTransport?.key !== key) {
    globalThis.__toymakSmtpTransport = {
      key,
      transport: nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: { user: settings.user, pass: settings.pass },
      }),
    };
  }
  return globalThis.__toymakSmtpTransport.transport;
}

/**
 * Sends one email. Never throws: returns an error message on failure. The
 * From address always comes from the current settings (not the caller), so
 * emails queued before a provider switch still send correctly.
 */
export async function sendEmail(
  email: OutgoingEmail,
  options: { idempotencyKey?: string } = {},
): Promise<{ error: string | null }> {
  const sender = emailSender();
  const replyTo = email.replyTo ?? sender.replyTo;
  try {
    if (provider() === "smtp") {
      await smtpTransport(smtpSettings()!).sendMail({
        from: sender.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        replyTo,
        headers: email.headers,
        attachments: email.attachments?.map((file) => ({
          filename: file.filename,
          content: Buffer.from(file.content, "base64"),
          contentType: file.contentType,
        })),
      });
      return { error: null };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { error: "Email isn't configured (no RESEND_API_KEY or Gmail settings)." };
    const { error } = await new Resend(apiKey).emails.send(
      {
        from: sender.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        ...(replyTo ? { replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
        ...(email.attachments ? { attachments: email.attachments } : {}),
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Email could not be sent." };
  }
}
