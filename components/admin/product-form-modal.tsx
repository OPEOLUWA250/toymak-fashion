"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Product, ProductCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const categoryOptions: { value: ProductCategory; label: string }[] = [
  { value: "shapewear", label: "Shapewear" },
  { value: "waist-trainer", label: "Waist Trainer" },
  { value: "bra", label: "Bra" },
  { value: "tops", label: "Tops" },
  { value: "accessories", label: "Accessories" },
];

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}

export function ProductFormModal({ product, onClose, onSave }: ProductFormModalProps) {
  const isEditing = product !== null;

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "shapewear");
  const [description, setDescription] = useState(product?.description ?? "");
  const [priceGbp, setPriceGbp] = useState(product ? String(product.price_gbp) : "");
  const [priceNgn, setPriceNgn] = useState(product ? String(product.price_ngn) : "");
  const [priceUsd, setPriceUsd] = useState(product?.price_usd ? String(product.price_usd) : "");
  const [stockQty, setStockQty] = useState(product ? String(product.stock_qty) : "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product ? String(product.low_stock_threshold) : "10",
  );
  const [sizes, setSizes] = useState(product?.sizes.join(", ") ?? "");
  const [images, setImages] = useState(product?.images.join("\n") ?? "");
  const [colorsText, setColorsText] = useState(
    product?.colors.map((c) => `${c.name}, ${c.hex}`).join("\n") ?? "",
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date();

    const parsedColors = colorsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [colorName, hex] = line.split(",").map((part) => part.trim());
        return { name: colorName, hex: hex || "#000000", inventory: Number(stockQty) || 0 };
      });

    const nextProduct: Product = {
      id: product?.id ?? `prod-${Date.now()}`,
      created_at: product?.created_at ?? now,
      updated_at: now,
      longDescription: product?.longDescription,
      compare_at_price_gbp: product?.compare_at_price_gbp,
      name: name.trim(),
      sku: sku.trim(),
      category,
      description: description.trim(),
      price_gbp: Number(priceGbp) || 0,
      price_ngn: Number(priceNgn) || 0,
      price_usd: priceUsd ? Number(priceUsd) : undefined,
      stock_qty: Number(stockQty) || 0,
      low_stock_threshold: Number(lowStockThreshold) || 0,
      sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      images: images.split("\n").map((s) => s.trim()).filter(Boolean),
      colors: parsedColors,
      featured,
    };

    onSave(nextProduct);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">
            {isEditing ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="product-name" label="Product name" value={name} onChange={setName} required />
            <Field id="product-sku" label="SKU" value={sku} onChange={setSku} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="product-category" className="text-sm font-medium text-neutral-700">
                Category
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              Featured product
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="product-description" className="text-sm font-medium text-neutral-700">
              Description
            </label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              id="product-price-gbp"
              label="Price (£)"
              value={priceGbp}
              onChange={setPriceGbp}
              type="number"
              required
            />
            <Field
              id="product-price-ngn"
              label="Price (₦)"
              value={priceNgn}
              onChange={setPriceNgn}
              type="number"
              required
            />
            <Field
              id="product-price-usd"
              label="Price ($, optional)"
              value={priceUsd}
              onChange={setPriceUsd}
              type="number"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="product-stock-qty"
              label="Stock quantity"
              value={stockQty}
              onChange={setStockQty}
              type="number"
              required
            />
            <Field
              id="product-low-stock-threshold"
              label="Low stock threshold"
              value={lowStockThreshold}
              onChange={setLowStockThreshold}
              type="number"
              required
            />
          </div>

          <Field
            id="product-sizes"
            label="Sizes (comma-separated)"
            value={sizes}
            onChange={setSizes}
            placeholder="XS, S, M, L"
          />

          <div className="space-y-1.5">
            <label htmlFor="product-images" className="text-sm font-medium text-neutral-700">
              Image URLs (one per line)
            </label>
            <textarea
              id="product-images"
              value={images}
              onChange={(e) => setImages(e.target.value)}
              rows={2}
              placeholder="/shop-img/example.png"
              className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="product-colors" className="text-sm font-medium text-neutral-700">
              Colors — one per line, as &quot;Name, Hex&quot;
            </label>
            <textarea
              id="product-colors"
              value={colorsText}
              onChange={(e) => setColorsText(e.target.value)}
              rows={2}
              placeholder="Black, #000000"
              className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {isEditing ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(
          "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary",
          type === "number" &&
            "[appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
    </div>
  );
}
