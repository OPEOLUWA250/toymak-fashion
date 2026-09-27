"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { CartItem } from "@/lib/types";

/**
 * Handles /cart?restore=<token> from a "you left something in your bag"
 * email, so the saved bag appears on whatever device the email is opened on.
 */
export function CartRestorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { restoreItems } = useCart();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const started = useRef(false);
  const token = searchParams.get("restore");

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    fetch(`/api/cart/restore?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = (await response.json()) as { items?: CartItem[]; error?: string };
        if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error);
        if (data.items.length > 0) {
          restoreItems(data.items);
          setNotice({ tone: "ok", text: "Welcome back — we've restored your bag." });
        } else {
          setNotice({ tone: "ok", text: "Those items are no longer saved, but everything's still in the shop." });
        }
      })
      .catch(() => setNotice({ tone: "error", text: "We couldn't restore your bag from that link." }))
      // Drop the token from the address bar so it isn't shared or bookmarked.
      .finally(() => router.replace(pathname, { scroll: false }));
  }, [token, restoreItems, router, pathname]);

  if (!notice) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm shadow-lg ${
        notice.tone === "ok" ? "bg-neutral text-white" : "bg-red-50 text-red-700"
      }`}
    >
      {notice.text}
      <button type="button" onClick={() => setNotice(null)} className="ml-3 font-semibold underline underline-offset-4">
        OK
      </button>
    </div>
  );
}
