import { NextResponse } from 'next/server'

/**
 * Logout endpoint.
 *
 * Firebase ID tokens are stateless and short-lived. We rely on the client
 * SDK calling `signOut(auth)` to clear local credentials. This endpoint exists
 * for future cookie-based session invalidation; today it simply 204s.
 */
export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  // If we ever add an http-only session cookie, clear it here:
  res.cookies.delete('session')
  return res
}