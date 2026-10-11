/** @type {import('next').NextConfig} */
const nextConfig = {
  // Customer accounts were removed; old links (including ones in
  // already-sent order emails) land on guest order tracking instead.
  async redirects() {
    return [{ source: '/account', destination: '/track-order', permanent: true }]
  },
  images: {
    formats: ['image/webp'],
    // 90 is for artwork with small printed text (hero banners, measuring guide).
    qualities: [75, 90],
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [new URL('/storage/v1/object/public/product-images/**', process.env.NEXT_PUBLIC_SUPABASE_URL)]
      : [],
  },
}

export default nextConfig
