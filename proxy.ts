
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

const SENSITIVE_HEADERS = ['x-user-id', 'x-user-email', 'x-user-role']

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  // 1. Strip spoofable headers from upstream requests
  for (const h of SENSITIVE_HEADERS) requestHeaders.delete(h)

  // 2. Verify Firebase ID token if present
  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      try {
        const decoded = await verifyIdToken(token)
        if (decoded.uid) requestHeaders.set('x-user-id', decoded.uid)
        if (decoded.email) requestHeaders.set('x-user-email', decoded.email.toLowerCase())
      } catch (err) {
        // Invalid / expired token — pass through without setting headers.
        // The route handler will return 401 if auth is required.
        logger.debug({ err: (err as Error).message }, 'proxy: invalid bearer token')
      }
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // 3. Defense-in-depth security headers (next.config.ts also sets some)
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  return response
}

export const config = {
  // Run on application + API routes; skip Next internals & static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|map)$).*)',
  ],
}