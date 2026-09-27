/** Optimize our local photos and uploads; keep existing third-party URLs usable. */
export function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return !src.endsWith(".svg");
  try {
    const url = new URL(src);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.origin === storage.origin && url.pathname.startsWith("/storage/v1/object/public/product-images/");
  } catch {
    return false;
  }
}
