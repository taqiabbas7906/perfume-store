import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { IUser } from '@/types'
import { verifyIdToken } from '@/lib/firebaseAdmin'
import { ensureUserFromDecoded } from '@/lib/auth'

/**
 * Resolve the authenticated user by verifying the Firebase Bearer token inside
 * the route handler. Request identity headers such as x-user-id are intentionally
 * ignored because they are spoofable if proxy.ts is bypassed or misconfigured.
 */
export async function getAuthUser(req: NextRequest): Promise<IUser | null> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  const token = authHeader.slice(7).trim()
  if (!token) return null

  let decoded: Awaited<ReturnType<typeof verifyIdToken>> | null = null

  try {
    decoded = await verifyIdToken(token)
  } catch {
    return null
  }

  const uid = decoded?.uid
  if (!uid) return null

  await connectDB()

  const user = await User.findOne({
    firebaseUid: uid,
    active: true,
  })
    .select('-password -__v')
    .lean<IUser>()

  if (user) return user

  return ensureUserFromDecoded(decoded)
}

export function getGuestSessionId(req: NextRequest): string | null {
  const raw = req.headers.get('x-cart-session')
  if (!raw) return null
  const sid = raw.trim()
  if (sid.length < 8 || sid.length > 128) return null
  if (!/^[A-Za-z0-9_\-:.]+$/.test(sid)) return null
  return sid
}

export async function getAuthAdmin(req: NextRequest): Promise<IUser | null> {
  const user = await getAuthUser(req)

  if (!user) return null
  if (user.role !== 'admin') return null

  return user
}
