"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Category, Product } from "@/lib/types";
import { MAX_CATEGORY_LABEL_LENGTH, categorySlug } from "@/lib/categories";
import { setCategoriesCache, useCategories } from "@/lib/use-categories";

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

/**
 * Add, rename and delete product categories. Renaming only changes the
 * display name; the id in shop links (?category=...) stays the same.
 */
export function CategoriesModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const { categories, isLoading } = useCategories();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, busy]);

  const productCount = (id: string) => products.filter((product) => product.category === id).length;

  const run = async (key: string, action: () => Promise<Category[]>) => {
    setBusy(key);
    setError(null);
    try {
      setCategoriesCache(await action());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const added = await run("add", async () => {
      const { category } = await request<{ category: Category }>("/api/admin/categories", "POST", { label: newLabel });
      return [...categories, category];
    });
    if (added) setNewLabel("");
  };

  const handleRename = async (id: string) => {
    const renamed = await run(id, async () => {
      const { category } = await request<{ category: Category }>(
        `/api/admin/categories/${encodeURIComponent(id)}`,
        "PATCH",
        { label: editLabel },
      );
      return categories.map((existing) => (existing.id === id ? category : existing));
    });
    if (renamed) setEditingId(null);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Delete the "${category.label}" category?`)) return;
    await run(category.id, async () => {
      await request(`/api/admin/categories/${encodeURIComponent(category.id)}`, "DELETE");
      return categories.filter((existing) => existing.id !== category.id);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="categories-title"
        className="scrollbar-hide max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 id="categories-title" className="text-xl font-bold text-neutral-900">Categories</h2>
          <button type="button" onClick={onClose} disabled={!!busy} className="p-2 text-neutral-500 transition hover:bg-neutral-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-neutral-500">
          Shoppers filter the shop by these. Renaming keeps existing shop links working. A category can only be deleted once no products use it.
        </p>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {isLoading && <p role="status" className="mb-4 text-sm text-neutral-500">Loading categories...</p>}

        <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
          {categories.map((category) => {
            const count = productCount(category.id);
            const isEditing = editingId === category.id;
            return (
              <li key={category.id} className="flex items-center gap-3 px-4 py-3">
                {isEditing ? (
                  <form
                    className="flex flex-1 items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleRename(category.id);
                    }}
                  >
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(event) => setEditLabel(event.target.value)}
                      maxLength={MAX_CATEGORY_LABEL_LENGTH}
                      aria-label={`New name for ${category.label}`}
                      className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button type="submit" disabled={!!busy || !editLabel.trim()} className="rounded-lg p-1.5 text-primary transition hover:bg-neutral-100 disabled:opacity-50" aria-label="Save name">
                      {busy === category.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} disabled={!!busy} className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100" aria-label="Cancel rename">
                      <X size={15} />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{category.label}</p>
                      <p className="text-[11px] text-neutral-500">
                        {count} product{count === 1 ? "" : "s"} · ?category={category.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditLabel(category.label);
                        setError(null);
                      }}
                      disabled={!!busy}
                      className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                      aria-label={`Rename ${category.label}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(category)}
                      disabled={!!busy || count > 0}
                      title={count > 0 ? "Move this category's products elsewhere before deleting it" : undefined}
                      className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                      aria-label={`Delete ${category.label}`}
                    >
                      {busy === category.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={handleAdd} className="mt-5 space-y-1.5">
          <label htmlFor="new-category" className="text-sm font-medium text-neutral-700">Add a category</label>
          <div className="flex gap-2">
            <input
              id="new-category"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              maxLength={MAX_CATEGORY_LABEL_LENGTH}
              placeholder="e.g. Swimwear"
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-primary"
            />
            <button
              type="submit"
              disabled={!!busy || !categorySlug(newLabel)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {busy === "add" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add
            </button>
          </div>
          {categorySlug(newLabel) && (
            <p className="text-xs text-neutral-500">Shop link: ?category={categorySlug(newLabel)}</p>
          )}
        </form>
      </div>
    </div>
  );
}
