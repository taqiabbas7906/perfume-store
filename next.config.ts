const isDev = process.env.NODE_ENV === 'development'

/* ─────────────────────────────────────────────
 * CSP - Firebase + Google + Facebook + Apple + Square compatible
 * ───────────────────────────────────────────── */

const scriptSrc = isDev
  ? [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      // Square Payments
      'https://squarecdn.com',
      // Google / Firebase
      'https://apis.google.com',
      'https://www.gstatic.com',
      'https://accounts.google.com',
      'https://accounts.gstatic.com',
      // Facebook
      'https://connect.facebook.net',
      'https://www.facebook.com',
      // Apple
      'https://appleid.apple.com',
      'https://appleid.cdn-apple.com',
    ]
  : [
      "'self'",
      "'unsafe-inline'",
      // Square Payments
      'https://squarecdn.com',
      // Google / Firebase
      'https://apis.google.com',
      'https://www.gstatic.com',
      'https://accounts.google.com',
      'https://accounts.gstatic.com',
      // Facebook
      'https://connect.facebook.net',
      'https://www.facebook.com',
      // Apple
      'https://appleid.apple.com',
      'https://appleid.cdn-apple.com',
    ]

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(' ')}`,

  // Styles — Google Fonts + Apple + Remixicon CDN
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://appleid.cdn-apple.com https://cdn.jsdelivr.net",

  // Fonts (Remixicon shipped from /public, Google fonts via next/font self-hosted)
  "font-src 'self' data: https://fonts.gstatic.com https://appleid.cdn-apple.com https://cdn.jsdelivr.net",

  // API calls made by Firebase SDK, Facebook SDK, Apple JS, Square SDK
  [
    "connect-src 'self'",
    // Square Infrastructure
    'https://*.squarecdn.com',
    'https://pki.goog',
    // Google / Firebase
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://www.googleapis.com',
    // Facebook
    'https://*.facebook.com',
    'https://*.facebook.net',
    'https://graph.facebook.com',
    // Apple
    'https://appleid.apple.com',
  ].join(' '),

  // Images — Google, Facebook profile pics, Apple
  "img-src 'self' data: blob: https: https://*.fbcdn.net https://*.facebook.com https://appleid.apple.com",

  // OAuth popup / redirect frames + Square Credit Card fields iframe
  [
    "frame-src 'self'",
    // Square Payment Forms
    'https://squarecdn.com',
    // Google / Firebase
    'https://accounts.google.com',
    'https://*.firebaseapp.com',
    'https://apis.google.com',
    // Facebook
    'https://www.facebook.com',
    'https://web.facebook.com',
    'https://staticxx.facebook.com',
    // Apple
    'https://appleid.apple.com',
  ].join(' '),

  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",

  // form-action covers redirect-based OAuth POST
  [
    "form-action 'self'",
    'https://accounts.google.com',
    'https://www.facebook.com',
    'https://appleid.apple.com',
  ].join(' '),

  "worker-src 'self' blob:",
].join('; ')

/* ───────────────────────────────────────────── */

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone' as const,
  compress: true,

  // Allow phones / other devices on the local network to hit the dev server.
  // Next.js 16 blocks cross-origin dev requests by default; these patterns
  // permit common LAN ranges (192.168.x, 10.x, 172.16–31.x) and *.local mDNS.
  allowedDevOrigins: [
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
    '172.17.*.*',
    '172.18.*.*',
    '172.19.*.*',
    '172.20.*.*',
    '172.21.*.*',
    '172.22.*.*',
    '172.23.*.*',
    '172.24.*.*',
    '172.25.*.*',
    '172.26.*.*',
    '172.27.*.*',
    '172.28.*.*',
    '172.29.*.*',
    '172.30.*.*',
    '172.31.*.*',
    '*.local',
  ],

  serverExternalPackages: [
    'firebase-admin',
    'mongoose',
    'bcryptjs',
    'pino',
    'algoliasearch',
  ],

  experimental: {
    optimizePackageImports: [
      'firebase',
      'zod',
      '@upstash/ratelimit',
      '@upstash/redis',
    ],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Facebook profile pictures
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: '*.facebook.com' },
      // Apple
      { protocol: 'https', hostname: 'appleid.apple.com' },
      // Stock/CDN imagery commonly used in seed data
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },

  productionBrowserSourceMaps: false,

  async redirects() {
    return [
      // /admin lands on the dashboard. Doing this at the framework level
      // avoids triggering React's render-time perf trace on a server
      // component that throws NEXT_REDIRECT immediately (Next 16 dev mode
      // logs that as a negative-timestamp warning).
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
        ],
      },

      {
        source: '/api/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/api/:resource(brands|categories|collections)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=900' },
        ],
      },
      {
        source: '/api/health',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
