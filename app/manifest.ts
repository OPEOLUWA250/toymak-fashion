import type { MetadataRoute } from 'next';
import { siteName } from '@/lib/site-info';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: 'Toymak',
    description: 'Premium shapewear, waist trainers and bras designed for the modern woman.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#101820',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
