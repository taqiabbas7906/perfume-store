const isDev = process.env.NODE_ENV === 'development'

const cspDirectives = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://accounts.google.com https://accounts.gstatic.com"
    : "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://accounts.google.com https://accounts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com",
  "img-src 'self' data: blob: https:",
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://apis.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "worker-src 'self' blob:",
].join('; ')

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  serverExternalPackages: [
    'firebase-admin',
    'mongoose',
    'bcryptjs',
    'pino',
  ],

  experimental: {
    optimizePackageImports: ['firebase', 'zod', '@upstash/ratelimit', '@upstash/redis'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
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
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: cspDirectives },
        ],
      },
      {
        source: '/api/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ]
  },
}

export default nextConfig