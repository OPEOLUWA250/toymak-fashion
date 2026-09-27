"use client";
import { ProductInventoryFields } from "./product-inventory-fields";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Product, ProductCategory } from "@/lib/types";
import { useSettings } from "@/lib/use-settings";
import { cn } from "@/lib/utils";
import { ColorDraft, ProductColorsField, ProductSizesField } from "./product-options-fields";
import { StoreImage } from "@/components/store-image";

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
  onSave: (product: Product) => Promise<void>;
}

export function ProductFormModal({ product, onClose, onSave }: ProductFormModalProps) {
  const isEditing = product !== null;
  const { settings } = useSettings();

  const [status, setStatus] = useState<NonNullable<Product["status"]>>(product?.status ?? "active");
  const [variants, setVariants] = useState<NonNullable<Product["variants"]>>(product?.variants ?? []);
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "shapewear");
  const [description, setDescription] = useState(product?.description ?? "");
  const [priceGbp, setPriceGbp] = useState(product ? String(product.price_gbp) : "");
  const [priceNgn, setPriceNgn] = useState(product ? String(product.price_ngn) : "");
  const [priceUsd, setPriceUsd] = useState(product?.price_usd ? String(product.price_usd) : "");
  // Tracks whether NGN/USD were hand-edited, so the GBP-driven suggestion
  // below only ever fills an empty field — it never overwrites a price the
  // admin actually chose (e.g. her real NGN prices aren't FX conversions).
  const ngnTouched = useRef(isEditing);
  const usdTouched = useRef(isEditing);
  const [stockQty, setStockQty] = useState(product ? String(product.stock_qty) : "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product ? String(product.low_stock_threshold) : "10",
  );
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? []);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [colors, setColors] = useState<ColorDraft[]>(
    () => product?.colors.map((color, index) => ({ ...color, key: `existing-${index}` })) ?? [],
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const isUploading = pendingUploads > 0;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSaving]);

  const handleGbpChange = (value: string) => {
    setPriceGbp(value);
    const gbp = Number(value);
    if (!gbp) return;

    if (!ngnTouched.current) {
      setPriceNgn(String(Math.round(gbp * settings.exchangeRates.gbpToNgn)));
    }
    if (!usdTouched.current) {
      setPriceUsd((gbp * settings.exchangeRates.gbpToUsd).toFixed(2));
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (!files.length) return;
    setPendingUploads((count) => count + 1);
    setUploadError(null);
    try {
      for (const file of files) {
        try {
          if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
            throw new Error("Use PNG, JPEG, WebP, or GIF images.");
          }
          if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5MB.");
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
          const data = (await response.json()) as { url?: string; error?: string };
          if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed");
          const url = data.url;
          setImages((current) => [...current, url]);
        } catch (error) {
          const message = `${file.name || "Pasted image"}: ${error instanceof Error ? error.message : "Upload failed"}`;
          setUploadError((current) => current ? `${current}\n${message}` : message);
        }
      }
    } finally {
      setPendingUploads((count) => count - 1);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isUploading || isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    const now = new Date();

    const parsedColors = colors.map((color) => ({
      name: color.name.trim(),
      hex: color.hex.toUpperCase(),
      inventory: color.inventory ?? (Number(stockQty) || 0),
    }));

    const normalizedVariants = variants.length ? (sizes.length ? sizes : ['Not applicable']).flatMap(size => (colors.length ? colors.map(c => c.name.trim()) : ['Default']).map(color => ({ size, color, stock: variants.find(v => v.size === size && v.color === color)?.stock ?? 0 }))) : [];
    const nextProduct: Product = {
      status, variants: normalizedVariants,
      id: product?.id ?? `prod-${Date.now()}`,
      created_at: product?.created_at ?? now,
      updated_at: now,
      longDescription: product?.longDescription,
      compare_at_price_gbp: product?.compare_at_price_gbp,
      name: name.trim(),
      sku: product?.sku ?? "",
      category,
      description: description.trim(),
      price_gbp: Number(priceGbp) || 0,
      price_ngn: Number(priceNgn) || 0,
      price_usd: Number(priceUsd) || 0,
      stock_qty: normalizedVariants.length ? normalizedVariants.reduce((sum, v) => sum + v.stock, 0) : Number(stockQty) || 0,
      low_stock_threshold: Number(lowStockThreshold) || 0,
      sizes,
      images,
      colors: parsedColors,
      featured,
    };

    try {
      await onSave(nextProduct);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => { if (!isSaving) onClose(); }}
    >
      <div
        className="scrollbar-hide max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">
            {isEditing ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Close"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isSaving} className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">Visibility<select className="block w-full rounded border p-2" value={status} onChange={e => setStatus(e.target.value as NonNullable<Product['status']>)}><option value="active">Published</option><option value="draft">Draft ? hidden from shop</option><option value="archived">Archived ? hidden from shop</option></select></label>
            <Field id="product-name" label="Product name" value={name} onChange={setName} required />
            <div className="space-y-1.5">
              <label htmlFor="product-sku" className="text-sm font-medium text-neutral-700">
                SKU
              </label>
              <input
                id="product-sku"
                value={product?.sku ?? "Assigned automatically on save"}
                readOnly
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500"
              />
            </div>
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

          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="product-price-gbp"
                label="Price (£)"
                value={priceGbp}
                onChange={handleGbpChange}
                type="number"
                required
              />
              <Field
                id="product-price-ngn"
                label="Price (₦)"
                value={priceNgn}
                onChange={(value) => {
                  ngnTouched.current = true;
                  setPriceNgn(value);
                }}
                type="number"
                required
              />
              <Field
                id="product-price-usd"
                label="Price ($)"
                value={priceUsd}
                onChange={(value) => {
                  usdTouched.current = true;
                  setPriceUsd(value);
                }}
                type="number"
                required
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              NGN and USD are suggested from the GBP price using the exchange rate set in Settings —
              edit either freely, your own number always wins over the suggestion.
            </p>
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

          <ProductSizesField value={sizes} onChange={setSizes} />
          <ProductColorsField value={colors} onChange={setColors} />

          <div
            className="space-y-3"
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.items)
                .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
                .map((item) => item.getAsFile())
                .filter((file): file is File => file !== null);
              if (files.length) {
                event.preventDefault();
                void handleFileSelect(files);
                return;
              }
              const text = event.clipboardData.getData("text/plain").trim();
              if (!text) return;
              event.preventDefault();
              try {
                const urls = text.split(/\s+/).map((value) => {
                  const url = new URL(value);
                  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
                  return url.href;
                });
                setImages((current) => [...new Set([...current, ...urls])]);
                setUploadError(null);
              } catch {
                setUploadError("Copy an image, screenshot, or a valid image link, then paste it here.");
              }
            }}
          >
            <ProductInventoryFields sizes={sizes} colors={colors.map(c => c.name)} variants={variants} onChange={setVariants} />
            <p id="product-images-label" className="text-sm font-medium text-neutral-700">Images</p>
            <div tabIndex={0} role="group" aria-labelledby="product-images-label" className="rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-5 text-center text-sm text-neutral-600 focus:border-primary focus:outline-none">
              Copy an image, screenshot, or image link, click here, then press <strong>Ctrl+V</strong> (or <strong>⌘V</strong>).
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {isUploading ? "Uploading…" : "Upload from computer"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void handleFileSelect(Array.from(e.target.files ?? []))}
              />
              <span className="text-xs text-neutral-400">PNG, JPEG, WebP, or GIF · up to 5MB</span>
            </div>
            {isUploading && <p role="status" className="text-xs text-neutral-500">Uploading images. Please wait before saving.</p>}
            {uploadError && <p role="alert" className="whitespace-pre-line text-xs text-red-600">{uploadError}</p>}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border border-neutral-200">
                  <StoreImage src={url} alt={`Product image ${index + 1}`} sizes="150px" className="aspect-square w-full object-cover" />
                  <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-white/95 p-1.5 text-neutral-700 shadow-sm hover:text-red-600">
                    <X size={14} />
                  </button>
                  <button type="button" disabled={index === 0} onClick={() => setImages((current) => [url, ...current.filter((_, i) => i !== index)])} className="w-full bg-white px-1 py-2 text-xs text-primary disabled:text-neutral-500">
                    {index === 0 ? "Main image" : "Make main"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Product"}
            </button>
          </div>
          </fieldset>
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
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? (id.includes("price") ? "0.01" : "1") : undefined}
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
