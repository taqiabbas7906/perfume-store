const isDev = process.env.NODE_ENV === 'development'

/* ─────────────────────────────────────────────
 * CSP - Firebase + Google + Facebook + Apple compatible
 * ───────────────────────────────────────────── */

const scriptSrc = isDev
  ? [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
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

  // Styles — Google Fonts + Apple
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://appleid.cdn-apple.com",

  // Fonts
  "font-src 'self' data: https://fonts.gstatic.com https://appleid.cdn-apple.com",

  // API calls made by Firebase SDK, Facebook SDK, Apple JS
  [
    "connect-src 'self'",
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

  // OAuth popup / redirect frames
  [
    "frame-src 'self'",
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
    ],
  },

  productionBrowserSourceMaps: false,

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
