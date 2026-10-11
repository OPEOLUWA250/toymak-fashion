"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { StoreImage } from "@/components/store-image";
import { cn } from "@/lib/utils";
import { categoryLabels, howToMeasureImage, type SizeCategory } from "@/lib/size-guide-data";

/** The general measuring guide; tapping it opens the full-resolution image. */
export function HowToMeasureImage({ className }: { className?: string }) {
  return (
    <a
      href={howToMeasureImage.src}
      target="_blank"
      rel="noreferrer"
      className={cn("block overflow-hidden border border-neutral/10 bg-white", className)}
    >
      <Image
        src={howToMeasureImage.src}
        alt={howToMeasureImage.alt}
        width={howToMeasureImage.width}
        height={howToMeasureImage.height}
        quality={90}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto w-full"
      />
    </a>
  );
}

/**
 * Product page size guide: this product's own chart (if an admin uploaded
 * one), then the general how-to-measure guide. A bottom sheet on phones, a
 * centred dialog on larger screens.
 */
export function SizeGuideDialog({
  open,
  onClose,
  productName,
  sizeGuideImage,
  sizeCategory,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  sizeGuideImage?: string | null;
  sizeCategory: SizeCategory | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="size-guide-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden bg-white p-0 text-neutral shadow-2xl backdrop:bg-black/50 sm:m-auto sm:max-h-[90vh] sm:max-w-2xl"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between border-b border-neutral/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral/50">Size Guide</p>
            <h2 id="size-guide-title" className="text-lg font-bold leading-tight">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            autoFocus
            className="p-2 text-neutral transition hover:bg-neutral/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 py-5">
          {sizeGuideImage && (
            <section className="mb-8">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em]">Size chart</h3>
              <a
                href={sizeGuideImage}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden border border-neutral/10 bg-white"
              >
                <StoreImage
                  src={sizeGuideImage}
                  alt={`${productName} size chart`}
                  width={1200}
                  height={1200}
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="h-auto w-full object-contain"
                />
              </a>
            </section>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-[0.16em]">How to measure</h3>
            <p className="mb-3 text-sm text-neutral/60">
              Take your measurements, then match them to the size chart{sizeGuideImage ? " above" : ""}.
            </p>
            <HowToMeasureImage />
          </section>

          {/* The general category chart, only when this product has no chart of its own. */}
          {sizeCategory && !sizeGuideImage && (
            <Link
              href={`/size-guide?category=${sizeCategory}#size-chart`}
              className="mt-6 inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-sm font-semibold transition hover:opacity-70"
            >
              See our {categoryLabels[sizeCategory].toLowerCase()} size chart
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </dialog>
  );
}
