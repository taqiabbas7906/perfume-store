// next.config.ts
import type { NextConfig } from 'next'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",

              // ✅ FIX: unsafe-eval must be inside script-src
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com"
                : "script-src 'self' https://apis.google.com",

              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com",
              "img-src 'self' data: https:",
              "frame-src https://accounts.google.com",

              // Optional but recommended hardening
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig