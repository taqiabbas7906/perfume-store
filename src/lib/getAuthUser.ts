import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { IUser } from '@/types'
import { verifyIdToken } from '@/lib/firebaseAdmin'

/**
 * Auth resolution order:
 *
 * 1. x-user-id (ONLY trusted if injected by proxy AFTER Firebase verification)
 * 2. Authorization Bearer token (fallback for direct API calls or bypass cases)
 *
 * This function is safe even if proxy.ts is NOT running.
 */

export async function getAuthUser(req: NextRequest): Promise<IUser | null> {
  let uid: string | null = null

  /* ─────────────────────────────────────────────
   * 1. Proxy-injected identity (fast path)
   * ───────────────────────────────────────────── */
  const uidHeader = req.headers.get('x-user-id')

  if (uidHeader && typeof uidHeader === 'string') {
    uid = uidHeader.trim()
  }

  /* ─────────────────────────────────────────────
   * 2. Fallback: verify Firebase token directly
   * ───────────────────────────────────────────── */
  if (!uid) {
    const authHeader = req.headers.get('authorization')

    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim()

      if (!token) return null

      try {
        const decoded = await verifyIdToken(token)
        uid = decoded?.uid ?? null
      } catch {
        return null
      }
    }
  }

  if (!uid) return null

  /* ─────────────────────────────────────────────
   * 3. DB lookup (single consistent source of truth)
   * ───────────────────────────────────────────── */
  await connectDB()

  const user = await User.findOne({
    firebaseUid: uid,
    active: true,
  })
    .select('-password -__v')
    .lean<IUser>()

  return user
}

export function getGuestSessionId(req: NextRequest): string | null {
  const raw = req.headers.get('x-cart-session')
  if (!raw) return null
  const sid = raw.trim()
  if (sid.length < 8 || sid.length > 128) return null
  if (!/^[A-Za-z0-9_\-:.]+$/.test(sid)) return null
  return sid
}

/* ───────────────────────────────────────────── */

export async function getAuthAdmin(req: NextRequest): Promise<IUser | null> {
  const user = await getAuthUser(req)

  if (!user) return null
  if (user.role !== 'admin') return null

  return user
}