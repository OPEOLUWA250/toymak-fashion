import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/lib/server/products';
import { siteUrl } from '@/lib/site-url';
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  return [
    ...['', '/shop', '/our-story', '/faq', '/size-guide', '/returns', '/privacy', '/terms'].map(path => ({ url: siteUrl + path })),
    ...products.map(product => ({ url: `${siteUrl}/product/${encodeURIComponent(product.id)}`, lastModified: product.updated_at })),
  ];
}
