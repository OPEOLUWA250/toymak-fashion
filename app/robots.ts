import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/track-order', '/unsubscribe', '/checkout', '/cart', '/wishlist', '/api/'] }, sitemap: `${siteUrl}/sitemap.xml` };
}
