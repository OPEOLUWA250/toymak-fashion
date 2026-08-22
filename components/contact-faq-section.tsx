"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Mail, ArrowRight, Loader2, Send } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export function ContactFaqSection({ faqs }: { faqs: FaqItem[] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          subject: data.get("subject"),
          message: data.get("message"),
        }),
      });
      if (!response.ok) throw new Error("Failed to send");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-tertiary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2">
          {/* Contact */}
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Contact Us
            </span>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-neutral">
              Get in <span className="text-primary">Touch</span> with us
            </h2>
            <p className="mt-4 max-w-md text-neutral/60">
              Questions about sizing, an order, or just want to say hello? Send us a message
              and our team will get back to you.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral/50">Email Us</p>
                <a
                  href="mailto:hello@toymak.com"
                  className="font-medium text-neutral hover:text-primary transition"
                >
                  hello@toymak.com
                </a>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  required
                  className="w-full rounded-lg border-0 bg-white px-4 py-3 text-sm text-neutral placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  required
                  className="w-full rounded-lg border-0 bg-white px-4 py-3 text-sm text-neutral placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                className="w-full rounded-lg border-0 bg-white px-4 py-3 text-sm text-neutral placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                required
                className="w-full rounded-lg border-0 bg-white px-4 py-3 text-sm text-neutral placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <textarea
                name="message"
                placeholder="Your Message..."
                rows={4}
                required
                className="w-full resize-none rounded-lg border-0 bg-white px-4 py-3 text-sm text-neutral placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {status === "sending" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {status === "sending" ? "Sending…" : "Send Message"}
              </button>
              {status === "sent" && (
                <p className="text-sm text-primary" role="status">
                  Thanks — we&apos;ve got your message and will reply soon.
                </p>
              )}
              {status === "failed" && (
                <p className="text-sm text-red-600" role="status">
                  Something went wrong sending that — please try again, or email us directly
                  at hello@toymak.com.
                </p>
              )}
            </form>
          </div>

          {/* FAQ */}
          <div>
            <h3 className="text-2xl font-bold text-neutral mb-2">Frequently Asked Questions</h3>
            <p className="text-neutral/60 mb-8">Everything you need to know before you shop</p>

            <div className="space-y-3">
              {faqs.map((item, idx) => (
                <details
                  key={idx}
                  className="group rounded-2xl border border-neutral/10 bg-white hover:shadow-sm transition-shadow"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-sm font-semibold text-neutral list-none [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      size={16}
                      className="shrink-0 ml-4 text-neutral/40 transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <div className="px-6 pb-5">
                    <div className="border-t border-neutral/10 pt-4">
                      <p className="text-sm leading-7 text-neutral/65">{item.a}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                View all FAQs
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
