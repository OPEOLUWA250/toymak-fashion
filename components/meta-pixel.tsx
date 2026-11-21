"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/lib/cookie-consent";
import { installMetaPixel, stopMetaPixel, trackPageView } from "@/lib/meta-pixel";

/**
 * Records a PageView per page. Pages change here without a full reload, so
 * this follows the route instead of relying on the initial page load. It also
 * reruns on accepting, which counts the page the visitor is already on.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const consent = useCookieConsent();

  useEffect(() => {
    if (consent === "granted") trackPageView();
    else if (consent === "denied") stopMetaPixel();
    else installMetaPixel();
  }, [pathname, consent]);

  return null;
}
