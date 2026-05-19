import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebaseAdmin'
import { logger } from '@/lib/logger'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

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

        // Fetch user from DB to get role
        await connectDB()
        const user = await User.findOne({ firebaseUid: decoded.uid }).select('role').lean()
        if (user?.role) {
          headers.set('x-user-role', user.role)
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
  // 3. Forward request with hardening headers on the response
  // ---------------------------------------------------
  const response = NextResponse.next({
    request: { headers },
  })

  // Conservative security headers — work across the whole app and don't
  // need any per-route tuning. Skip CSP for now (the app loads Square's
  // CDN, Remixicon CSS, and Cloudinary images so a strict CSP needs to be
  // built carefully).
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  )

  return response
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