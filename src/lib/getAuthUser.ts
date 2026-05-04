import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { IUser } from '@/types'
import { verifyIdToken } from '@/lib/firebase-admin'

/**
 * Resolve the authenticated user from a request.
 *
 * Trust order:
 *  1. `x-user-id` header — set by `proxy.ts` ONLY after verifying the
 *     Firebase ID token. Inbound copies of these headers are stripped in
 *     the proxy, so they are safe to trust here.
 *  2. `Authorization: Bearer <id-token>` — verified inline as a fallback
 *     for routes that may bypass the proxy or for direct API consumers.
 *
 * If both fail we return null. Routes decide their own response code.
 */
export async function getAuthUser(req: NextRequest): Promise<IUser | null> {
  const uidHeader = req.headers.get('x-user-id')

  if (uidHeader) {
    await connectDB()
    return User.findOne({ firebaseUid: uidHeader, active: true }).lean<IUser>()
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token) return null
    try {
      const decoded = await verifyIdToken(token)
      await connectDB()
      return User.findOne({ firebaseUid: decoded.uid, active: true }).lean<IUser>()
    } catch {
      return null
    }
  }

  return null
}

export async function getAuthAdmin(req: NextRequest): Promise<IUser | null> {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return null
  return user
}
