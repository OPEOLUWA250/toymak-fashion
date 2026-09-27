"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Loader2, MailX } from "lucide-react";

type Status = "idle" | "working" | "done" | "error";

function UnsubscribeContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleUnsubscribe = async () => {
    setStatus("working");
    setError(null);
    try {
      const response = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not unsubscribe you.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unsubscribe you.");
      setStatus("error");
    }
  };

  return (
    <main className="bg-white">
      <Header />
      <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailX size={26} />
        </span>
        {status === "done" ? (
          <>
            <h1 className="mt-6 text-3xl font-bold text-neutral">You&apos;re unsubscribed</h1>
            <p className="mt-3 text-sm leading-6 text-neutral/60">
              You won&apos;t get any more bag reminder emails from us. Order confirmations will still arrive as
              normal.
            </p>
            <Link href="/shop" className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white">
              Continue shopping
            </Link>
          </>
        ) : !token ? (
          <>
            <h1 className="mt-6 text-3xl font-bold text-neutral">Link incomplete</h1>
            <p className="mt-3 text-sm leading-6 text-neutral/60">
              Please use the unsubscribe link from your email, or write to hello@toymak.com.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-bold text-neutral">Stop bag reminders?</h1>
            <p className="mt-3 text-sm leading-6 text-neutral/60">
              We&apos;ll stop emailing you about items left in your bag. Order confirmations aren&apos;t affected.
            </p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={status === "working"}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {status === "working" && <Loader2 size={16} className="animate-spin" />}
              Unsubscribe
            </button>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeContent />
    </Suspense>
  );
}
