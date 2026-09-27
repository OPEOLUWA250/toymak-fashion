import Image, { ImageProps } from "next/image";
import { canOptimizeImage } from "@/lib/image-source";

/** Shared responsive delivery for catalog photos and small product thumbnails. */
export function StoreImage({ src, alt, width = 800, height = 1000, sizes = "(max-width: 768px) 100vw, 50vw", fill, ...props }: Omit<ImageProps, "src"> & { src?: string }) {
  if (!src) {
    return <span role="img" aria-label={alt || "No image available"} className={props.className} />;
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width, height })}
      sizes={sizes}
      unoptimized={!canOptimizeImage(src)}
    />
  );
}
