"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Color } from "@/lib/types";
import { cn } from "@/lib/utils";

const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "One Size"];
const presetColors = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Nude", hex: "#E8C9A0" },
  { name: "Tan", hex: "#D4A574" },
  { name: "Caramel", hex: "#C9956F" },
  { name: "Brown", hex: "#6F4E37" },
  { name: "Grey", hex: "#808080" },
  { name: "Navy", hex: "#1B2A4A" },
  { name: "Red", hex: "#C62828" },
  { name: "Pink", hex: "#E8A0BF" },
];
const inputClass = "w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary";

export type ColorDraft = Omit<Color, "inventory"> & { key: string; inventory?: number };

export function ProductSizesField({ value, onChange }: {
  value: string[];
  onChange: (sizes: string[]) => void;
}) {
  const [customSize, setCustomSize] = useState("");
  const [extraSizes, setExtraSizes] = useState<string[]>(() => value.filter((size) => !standardSizes.includes(size)));
  const options = [...new Set([...standardSizes, ...extraSizes, ...value])];

  const addSize = () => {
    const entered = customSize.trim().replace(/\s+/g, " ");
    if (!entered) return;
    const size = options.find((option) => option.toLowerCase() === entered.toLowerCase()) ?? entered.toUpperCase();
    if (!options.includes(size)) setExtraSizes((current) => [...current, size]);
    if (!value.includes(size)) onChange([...value, size]);
    setCustomSize("");
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-neutral-700">Sizes</legend>
      <p className="text-xs text-neutral-500">Check every size available for this product.</p>
      <div className="flex flex-wrap gap-2">
        {options.map((size) => (
          <label key={size} className={cn(
            "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
            value.includes(size) ? "border-primary bg-primary/5 font-medium text-primary" : "border-neutral-200 text-neutral-700 hover:border-neutral-400",
          )}>
            <input
              type="checkbox"
              checked={value.includes(size)}
              onChange={(event) => onChange(event.target.checked ? [...value, size] : value.filter((item) => item !== size))}
              className="h-4 w-4 accent-primary"
            />
            {size}
          </label>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="custom-product-size" className="mb-1.5 block text-xs text-neutral-500">Need another size?</label>
          <input
            id="custom-product-size"
            value={customSize}
            onChange={(event) => setCustomSize(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); addSize(); }
            }}
            placeholder="e.g. 32B or UK 12"
            maxLength={30}
            className={inputClass}
          />
        </div>
        <button type="button" onClick={addSize} disabled={!customSize.trim()} className="min-h-11 shrink-0 rounded-xl border border-neutral-200 px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-40">
          Add size
        </button>
      </div>
    </fieldset>
  );
}

export function ProductColorsField({ value, onChange }: {
  value: ColorDraft[];
  onChange: (colors: ColorDraft[]) => void;
}) {
  const updateColor = (key: string, patch: Partial<ColorDraft>) => {
    onChange(value.map((color) => color.key === key ? { ...color, ...patch } : color));
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-neutral-700">Colors</legend>
      <p className="text-xs text-neutral-500">Choose common colors or add your own. Adjust each shade to match your product.</p>
      <div className="flex flex-wrap gap-2">
        {presetColors.map((preset) => {
          const selected = value.find((color) => color.name.trim().toLowerCase() === preset.name.toLowerCase());
          return (
            <button
              key={preset.name}
              type="button"
              aria-pressed={Boolean(selected)}
              onClick={() => onChange(selected
                ? value.filter((color) => color.key !== selected.key)
                : [...value, { ...preset, key: crypto.randomUUID() }])}
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition", selected ? "border-primary bg-primary/5 text-primary" : "border-neutral-200 text-neutral-700 hover:border-neutral-400")}
            >
              <span aria-hidden="true" className="h-5 w-5 rounded-full border border-black/15" style={{ backgroundColor: selected?.hex || preset.hex }} />
              {preset.name}
              {selected && <Check size={14} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {value.length > 0 ? (
        <div className="space-y-3">
          {value.map((color, index) => (
            <div key={color.key} className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_150px]">
                <div>
                  <label htmlFor={`color-name-${color.key}`} className="mb-1.5 block text-xs font-medium text-neutral-600">Color name</label>
                  <input
                    id={`color-name-${color.key}`}
                    value={color.name}
                    onChange={(event) => updateColor(color.key, { name: event.target.value })}
                    ref={(input) => {
                      const duplicate = value.some((other) => other.key !== color.key && other.name.trim().toLowerCase() === color.name.trim().toLowerCase());
                      input?.setCustomValidity(color.name.trim() && duplicate ? "Each color needs a different name." : "");
                    }}
                    required
                    pattern=".*\S.*"
                    title="Enter a color name."
                    placeholder="e.g. Chocolate"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`color-hex-${color.key}`} className="mb-1.5 block text-xs font-medium text-neutral-600">Shade</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`Pick shade for ${color.name || `color ${index + 1}`}`}
                      value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#000000"}
                      onChange={(event) => updateColor(color.key, { hex: event.target.value.toUpperCase() })}
                      className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
                    />
                    <input
                      id={`color-hex-${color.key}`}
                      value={color.hex}
                      onChange={(event) => updateColor(color.key, { hex: event.target.value })}
                      required
                      pattern="#[0-9a-fA-F]{6}"
                      title="Use a six-digit hex color, such as #E8C9A0."
                      maxLength={7}
                      className={cn(inputClass, "px-2 font-mono text-xs")}
                    />
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => onChange(value.filter((item) => item.key !== color.key))} aria-label={`Remove ${color.name || `color ${index + 1}`}`} className="mt-5 flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-500">No colors selected yet.</p>}

      <button type="button" onClick={() => onChange([...value, { key: crypto.randomUUID(), name: "", hex: "#000000" }])} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        <Plus size={15} aria-hidden="true" /> Add custom color
      </button>
    </fieldset>
  );
}
