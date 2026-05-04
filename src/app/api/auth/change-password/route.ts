import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/firebase-admin'
import { getAuthUser } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { changePasswordRateLimit } from '@/lib/authRateLimit'
import { changePasswordSchema } from '@/lib/validators'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { logger } from '@/lib/logger'

/**
 * Verify the user's current password by attempting a password sign-in via the
 * Identity Toolkit REST API. The Firebase Admin SDK has no native equivalent.
 */
async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) return false
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const limited = await changePasswordRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    // The discriminator must come from the server-trusted user record, NOT the client.
    const merged = { ...body, hasPassword: user.hasPassword }
    const validation = validateData(changePasswordSchema, merged)
    if (!validation.success) return validation.response

    const { currentPassword, newPassword } = validation.data

    if (user.hasPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      const ok = await verifyCurrentPassword(user.email, currentPassword)
      if (!ok) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    await getAdmin().auth().updateUser(user.firebaseUid, { password: newPassword })

    await connectDB()
    await User.findByIdAndUpdate(user._id, { hasPassword: true })

    logger.info({ userId: user._id }, 'Password changed')
    return NextResponse.json({
      success: true,
      message: user.hasPassword ? 'Password changed successfully' : 'Password set successfully',
    })
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string }
    if (error.code === 'auth/requires-recent-login') {
      return NextResponse.json(
        { error: 'Please login again before changing your password' },
        { status: 401 }
      )
    }
    logger.error({ err: error.message }, 'change-password failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}