"use client";

import { useState } from "react";
import { Check, Copy, Ticket } from "lucide-react";
import { NewsletterSignup } from "@/lib/types";

export function SignupsView({ signups }: { signups: NewsletterSignup[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (signup: NewsletterSignup) => {
    navigator.clipboard.writeText(signup.coupon_code).then(() => {
      setCopiedId(signup.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Ticket size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              First-order signups
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{signups.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] lg:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-neutral-900">Signups</h2>
          <p className="text-sm text-neutral-500">
            Everyone who claimed a discount code from the homepage popup, with the code
            generated for each — the same one shown to them and (once email sending is wired
            up) sent to their inbox.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-left">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Coupon code
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {signups.map((signup) => (
                  <tr key={signup.id}>
                    <td className="px-4 py-4 align-middle text-sm font-medium text-neutral-900">
                      {signup.first_name} {signup.last_name}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-neutral-600">
                      {signup.email}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <button
                        type="button"
                        onClick={() => handleCopy(signup)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
                      >
                        {signup.coupon_code}
                        {copiedId === signup.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-neutral-600">
                      {signup.created_at.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {signups.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              No signups yet — they&apos;ll appear here as soon as someone claims a code from
              the homepage popup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
