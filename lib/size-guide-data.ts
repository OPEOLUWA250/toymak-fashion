export type SizeCategory = "shapewear" | "waist-trainer" | "bra" | "tops";

export interface SizeRow {
  size: string;
  bust: [number, number] | null;
  waist: [number, number] | null;
  hips: [number, number] | null;
  bustLabel: string;
  waistLabel: string;
  hipsLabel: string;
}

const shapewearRows: SizeRow[] = [
  { size: "XS", bust: [76, 81], waist: [61, 66], hips: [84, 89], bustLabel: '30–32" / 76–81cm', waistLabel: '24–26" / 61–66cm', hipsLabel: '33–35" / 84–89cm' },
  { size: "S", bust: [81, 86], waist: [66, 71], hips: [89, 94], bustLabel: '32–34" / 81–86cm', waistLabel: '26–28" / 66–71cm', hipsLabel: '35–37" / 89–94cm' },
  { size: "M", bust: [86, 91], waist: [71, 76], hips: [94, 99], bustLabel: '34–36" / 86–91cm', waistLabel: '28–30" / 71–76cm', hipsLabel: '37–39" / 94–99cm' },
  { size: "L", bust: [91, 97], waist: [76, 81], hips: [99, 104], bustLabel: '36–38" / 91–97cm', waistLabel: '30–32" / 76–81cm', hipsLabel: '39–41" / 99–104cm' },
  { size: "XL", bust: [97, 102], waist: [81, 86], hips: [104, 109], bustLabel: '38–40" / 97–102cm', waistLabel: '32–34" / 81–86cm', hipsLabel: '41–43" / 104–109cm' },
  { size: "XXL", bust: [102, 107], waist: [86, 91], hips: [109, 114], bustLabel: '40–42" / 102–107cm', waistLabel: '34–36" / 86–91cm', hipsLabel: '43–45" / 109–114cm' },
];

const waistTrainerRows: SizeRow[] = [
  { size: "XS", bust: null, waist: [56, 61], hips: null, bustLabel: "—", waistLabel: '22–24" / 56–61cm', hipsLabel: "—" },
  { size: "S", bust: null, waist: [61, 66], hips: null, bustLabel: "—", waistLabel: '24–26" / 61–66cm', hipsLabel: "—" },
  { size: "M", bust: null, waist: [66, 71], hips: null, bustLabel: "—", waistLabel: '26–28" / 66–71cm', hipsLabel: "—" },
  { size: "L", bust: null, waist: [71, 76], hips: null, bustLabel: "—", waistLabel: '28–30" / 71–76cm', hipsLabel: "—" },
  { size: "XL", bust: null, waist: [76, 81], hips: null, bustLabel: "—", waistLabel: '30–32" / 76–81cm', hipsLabel: "—" },
  { size: "XXL", bust: null, waist: [81, 86], hips: null, bustLabel: "—", waistLabel: '32–34" / 81–86cm', hipsLabel: "—" },
];

const braRows: SizeRow[] = [
  { size: "XS", bust: [76, 81], waist: null, hips: null, bustLabel: '30–32" / 76–81cm', waistLabel: "—", hipsLabel: "—" },
  { size: "S", bust: [81, 86], waist: null, hips: null, bustLabel: '32–34" / 81–86cm', waistLabel: "—", hipsLabel: "—" },
  { size: "M", bust: [86, 91], waist: null, hips: null, bustLabel: '34–36" / 86–91cm', waistLabel: "—", hipsLabel: "—" },
  { size: "L", bust: [91, 97], waist: null, hips: null, bustLabel: '36–38" / 91–97cm', waistLabel: "—", hipsLabel: "—" },
  { size: "XL", bust: [97, 102], waist: null, hips: null, bustLabel: '38–40" / 97–102cm', waistLabel: "—", hipsLabel: "—" },
  { size: "XXL", bust: [102, 107], waist: null, hips: null, bustLabel: '40–42" / 102–107cm', waistLabel: "—", hipsLabel: "—" },
];

export const sizeChart: Record<SizeCategory, SizeRow[]> = {
  shapewear: shapewearRows,
  "waist-trainer": waistTrainerRows,
  bra: braRows,
  // Tops are bust-driven like shapewear, so the same chart applies.
  tops: shapewearRows,
};

export const categoryLabels: Record<SizeCategory, string> = {
  shapewear: "Shapewear",
  "waist-trainer": "Waist Trainers",
  bra: "Bras",
  tops: "Tops",
};

export const measurementSteps = [
  {
    step: 1,
    title: "Bust",
    instruction:
      "Measure around the fullest part of your bust, keeping the tape level and snug but not tight.",
  },
  {
    step: 2,
    title: "Waist",
    instruction:
      "Measure around your natural waistline — the narrowest part of your torso, usually just above the navel.",
  },
  {
    step: 3,
    title: "Hips",
    instruction:
      "Measure around the widest part of your hips and buttocks, keeping the tape parallel to the floor.",
  },
];

export const fitTips = [
  {
    title: "Size up for comfort",
    description:
      "Shapewear is designed for compression, so if you're between sizes, going up will give you a more comfortable fit without sacrificing support.",
  },
  {
    title: "Measure over undergarments",
    description:
      "For the most accurate results, take measurements wearing the undergarments you'd normally wear — no padding or push-up.",
  },
  {
    title: "Check product-specific notes",
    description:
      "Some styles run slightly different from our standard chart. Always check the fit notes on individual product pages for the best guidance.",
  },
];

/**
 * Recommends a size from a category's chart given one or more measurements in cm.
 * When a measurement falls between two rows it favors the larger size (comfort
 * over tightness); when it's outside every range it clamps to the nearest end.
 */
export function recommendSize(
  category: SizeCategory,
  measurements: { bust?: number; waist?: number; hips?: number },
): string | null {
  const rows = sizeChart[category];
  const matchedIndexes: number[] = [];

  (["bust", "waist", "hips"] as const).forEach((key) => {
    const value = measurements[key];
    if (value === undefined) return;

    const relevantRows = rows
      .map((row, idx) => ({ idx, range: row[key] }))
      .filter((entry): entry is { idx: number; range: [number, number] } => entry.range !== null);

    if (relevantRows.length === 0) return;

    const withinRange = relevantRows.find(
      (entry) => value >= entry.range[0] && value <= entry.range[1],
    );

    if (withinRange) {
      matchedIndexes.push(withinRange.idx);
      return;
    }

    // Outside every range: clamp to the nearest end.
    const smallest = relevantRows[0];
    const largest = relevantRows[relevantRows.length - 1];
    matchedIndexes.push(value < smallest.range[0] ? smallest.idx : largest.idx);
  });

  if (matchedIndexes.length === 0) return null;

  return rows[Math.max(...matchedIndexes)].size;
}
