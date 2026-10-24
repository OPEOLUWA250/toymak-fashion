// Sent with every response. No script/style allowlist (CSP script-src) yet:
// the Chatway widget loads its own third-party code, so a strict policy
// needs testing against it first. These directives are safe regardless.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
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
