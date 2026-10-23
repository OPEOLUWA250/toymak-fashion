import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/lib/server/products';
import { productPath } from '@/lib/product-url';
import { absoluteUrl } from '@/lib/seo';
import { siteUrl } from '@/lib/site-url';
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  // The home page is the catalog, so it changes whenever a product does.
  const catalogUpdated = products.reduce<Date | undefined>((latest, p) => (!latest || p.updated_at > latest ? p.updated_at : latest), undefined);
  return [
    { url: siteUrl, lastModified: catalogUpdated },
    ...['/our-story', '/faq', '/size-guide', '/returns', '/privacy', '/terms'].map(path => ({ url: siteUrl + path })),
    ...products.map(product => ({
      url: siteUrl + productPath(product),
      lastModified: product.updated_at,
      images: product.images.slice(0, 10).map(absoluteUrl),
    })),
  ];
}
