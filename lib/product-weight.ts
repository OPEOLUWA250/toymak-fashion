/** Product weights: typed by admins in grams or kilograms, stored in kilograms. */

export type WeightUnit = "g" | "kg";

/** Royal Mail's heaviest parcel, and what the products table accepts. */
export const MAX_WEIGHT_KG = 70;

export interface WeightDraft {
  value: string;
  unit: WeightUnit;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Light items read naturally in grams (350 g), heavier ones in kilograms (1.2 kg). */
export function weightDraftFromKg(kg: number): WeightDraft {
  return kg < 1 ? { value: String(Math.round(kg * 1000)), unit: "g" } : { value: String(round3(kg)), unit: "kg" };
}

/** The weight in kilograms, or an error to show. Accepts "0,5" as well as "0.5". */
export function parseWeight(draft: WeightDraft): { kg: number; error: null } | { kg: null; error: string } {
  const text = draft.value.trim().replace(",", ".");
  const n = text === "" ? NaN : Number(text);
  if (!Number.isFinite(n) || n <= 0) {
    return { kg: null, error: "Enter the weight of one item, for example 350 g or 1.2 kg." };
  }
  const kg = round3(draft.unit === "g" ? n / 1000 : n);
  if (kg <= 0) return { kg: null, error: "That's lighter than 1 g. Enter at least 1 g." };
  if (kg > MAX_WEIGHT_KG) return { kg: null, error: `An item can weigh at most ${MAX_WEIGHT_KG} kg.` };
  return { kg, error: null };
}

/** Switching unit keeps the same weight: 500 g becomes 0.5 kg. */
export function switchWeightUnit(draft: WeightDraft, unit: WeightUnit): WeightDraft {
  if (unit === draft.unit) return draft;
  const { kg } = parseWeight(draft);
  if (kg === null) return { ...draft, unit };
  return { value: unit === "g" ? String(Math.round(kg * 1000)) : String(kg), unit };
}

export function formatOtherUnit({ kg }: { kg: number }, unit: WeightUnit) {
  return unit === "g" ? `${kg} kg` : `${Math.round(kg * 1000).toLocaleString("en-GB")} g`;
}
