'use client';
import type { Product } from '@/lib/types';
export function ProductInventoryFields({ sizes, colors, variants, onChange }: { sizes: string[]; colors: string[]; variants: NonNullable<Product['variants']>; onChange: (v: NonNullable<Product['variants']>) => void }) {
  const combinations = (sizes.length ? sizes : ['Not applicable']).flatMap(size => (colors.length ? colors : ['Default']).map(color => ({ size, color })));
  return <div className="space-y-3">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={variants.length > 0} onChange={e => onChange(e.target.checked ? combinations.map(v => ({ ...v, stock: 0 })) : [])} />Track stock separately for each size and colour</label>
    {variants.length > 0 && <><p className="text-xs text-neutral-500">Total stock is the sum of these quantities. New combinations start at zero.</p><div className="grid gap-2 sm:grid-cols-2">{combinations.map(v => <label key={JSON.stringify(v)} className="flex min-w-0 items-center justify-between gap-2 rounded border p-2 text-sm"><span className="break-words">{v.size} / {v.color}</span><input aria-label={`Stock for ${v.size} / ${v.color}`} className="w-20 border p-2" type="number" min="0" step="1" value={variants.find(x => x.size === v.size && x.color === v.color)?.stock ?? 0} onChange={e => onChange(combinations.map(x => ({ ...x, stock: x.size === v.size && x.color === v.color ? Math.max(0, Math.floor(Number(e.target.value))) : variants.find(y => y.size === x.size && y.color === x.color)?.stock ?? 0 })))} /></label>)}</div></>}
  </div>;
}
