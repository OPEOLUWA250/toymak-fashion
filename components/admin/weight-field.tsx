"use client";

import { cn } from "@/lib/utils";
import { formatOtherUnit, parseWeight, switchWeightUnit, type WeightDraft } from "@/lib/product-weight";

export function WeightField({ draft, onChange }: { draft: WeightDraft; onChange: (draft: WeightDraft) => void }) {
  const parsed = parseWeight(draft);
  const showError = draft.value.trim() !== "" && parsed.error;

  return (
    <div className="space-y-1.5">
      <label htmlFor="product-weight" className="text-sm font-medium text-neutral-700">
        Item weight
      </label>
      <div className="flex gap-2">
        <input
          id="product-weight"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft.value}
          onChange={(event) => onChange({ ...draft, value: event.target.value })}
          placeholder={draft.unit === "g" ? "e.g. 350" : "e.g. 1.2"}
          required
          aria-invalid={showError ? true : undefined}
          aria-describedby="product-weight-help"
          className={cn(
            "w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary",
            showError ? "border-red-400" : "border-neutral-200",
          )}
        />
        <div role="group" aria-label="Weight unit" className="flex shrink-0 rounded-xl border border-neutral-200 p-1">
          {(["g", "kg"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => onChange(switchWeightUnit(draft, unit))}
              aria-pressed={draft.unit === unit}
              className={cn(
                "rounded-lg px-3 text-sm font-semibold transition",
                draft.unit === unit ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900",
              )}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
      <p id="product-weight-help" className={cn("text-xs", showError ? "text-red-600" : "text-neutral-500")}>
        {showError
          ? parsed.error
          : `${parsed.kg !== null ? `= ${formatOtherUnit(parsed, draft.unit)}. ` : ""}Weight of one item. Royal Mail parcels are weighed as this times the quantity ordered.`}
      </p>
    </div>
  );
}
