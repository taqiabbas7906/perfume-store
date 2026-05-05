import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebaseAdmin'
import { logger } from '@/lib/logger'

const SENSITIVE_HEADERS = [
  'x-user-id',
  'x-user-email',
  'x-user-role',
]

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)

  // ---------------------------------------------------
  // 1. Strip all spoofable headers
  // ---------------------------------------------------
  for (const h of SENSITIVE_HEADERS) {
    headers.delete(h)
  }

  // ---------------------------------------------------
  // 2. Verify Firebase token
  // ---------------------------------------------------
  const authHeader = request.headers.get('authorization')

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()

    if (token) {
      try {
        const decoded = await verifyIdToken(token)

        // ONLY TRUSTED IDENTITY SIGNAL
        headers.set('x-user-id', decoded.uid)

        if (decoded.email) {
          headers.set('x-user-email', decoded.email.toLowerCase())
        }
      } catch (err) {
        // Do not block request, but DO NOT mark fake auth state
        logger.debug(
          { err: (err as Error).message },
          'proxy: invalid token'
        )
      }
    }
  }

  // ---------------------------------------------------
  // 3. Forward request
  // ---------------------------------------------------
  return NextResponse.next({
    request: { headers },
  })
}

/**
 * IMPORTANT:
 * Next.js 16 requires this file to be active as proxy.ts
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)',
  ],
}