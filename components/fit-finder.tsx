"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler, ChevronDown } from "lucide-react";
import { recommendSize, type SizeCategory } from "@/lib/size-guide-data";

const fieldsByCategory: Record<SizeCategory, ("bust" | "waist" | "hips")[]> = {
  shapewear: ["bust", "waist", "hips"],
  tops: ["bust", "waist", "hips"],
  "waist-trainer": ["waist"],
  bra: ["bust"],
};

const fieldLabels: Record<"bust" | "waist" | "hips", string> = {
  bust: "Bust (cm)",
  waist: "Waist (cm)",
  hips: "Hips (cm)",
};

export function FitFinder({
  category,
  onRecommend,
}: {
  category: SizeCategory;
  onRecommend: (size: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  const fields = fieldsByCategory[category];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const measurements: { bust?: number; waist?: number; hips?: number } = {};
    fields.forEach((field) => {
      const raw = values[field];
      const parsed = raw ? Number(raw) : NaN;
      if (!Number.isNaN(parsed) && parsed > 0) {
        measurements[field] = parsed;
      }
    });

    const size = recommendSize(category, measurements);
    setResult(size);
  };

  const handleUseSize = () => {
    if (result) {
      onRecommend(result);
      setOpen(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setValues({});
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4 hover:opacity-80"
      >
        <Ruler size={14} />
        Need help finding your fit?
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/10 bg-[#fbf6f9] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-neutral">Fit Finder</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close fit finder"
          className="text-neutral/40 hover:text-neutral"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {result === null ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-neutral/60">
            Enter your measurements and we&apos;ll recommend a size from this product&apos;s
            chart.
          </p>
          <div className={`grid gap-3 ${fields.length > 1 ? "sm:grid-cols-3" : ""}`}>
            {fields.map((field) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-[0.1em] text-neutral/50">
                  {fieldLabels[field]}
                </label>
                <input
                  type="number"
                  min={1}
                  inputMode="decimal"
                  value={values[field] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder="e.g. 86"
                  required
                  className="w-full rounded-lg border border-neutral/15 bg-white px-3 py-2.5 text-sm text-neutral outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Find My Size
            </button>
            <Link
              href={`/size-guide?category=${category}#size-chart`}
              className="text-xs text-neutral/50 underline underline-offset-4 hover:text-primary"
            >
              How to measure
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {result ? (
            <p className="text-sm text-neutral/70">
              Based on your measurements, we recommend size{" "}
              <span className="text-lg font-bold text-primary">{result}</span>.
            </p>
          ) : (
            <p className="text-sm text-neutral/70">
              We couldn&apos;t match those measurements to a size on this product&apos;s
              chart — double-check the numbers, or see the{" "}
              <Link
                href={`/size-guide?category=${category}#size-chart`}
                className="text-primary underline underline-offset-4"
              >
                full size guide
              </Link>
              .
            </p>
          )}
          <div className="flex items-center gap-3">
            {result && (
              <button
                type="button"
                onClick={handleUseSize}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Use Size {result}
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-neutral/60 hover:text-primary"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
