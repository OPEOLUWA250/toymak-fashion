import Image from "next/image";
import { cn } from "@/lib/utils";

/** The TOYMAK Fashion lockup. `tone="light"` is the white version for dark backgrounds. */
export function Logo({
  tone = "dark",
  className,
  priority,
}: {
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={tone === "light" ? "/brand/logo-white.png" : "/brand/logo-black.png"}
      alt="Toymak Fashion"
      width={638}
      height={142}
      priority={priority}
      className={cn("h-8 w-auto", className)}
    />
  );
}
