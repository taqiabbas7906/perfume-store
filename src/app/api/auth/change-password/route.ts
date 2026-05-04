// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { admin } from '@/lib/firebase-admin'
import { getAuthUser } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { changePasswordRateLimit } from '@/lib/authRateLimit'
import { changePasswordSchema } from '@/lib/validators'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { verifyPassword } from '@/lib/password'

async function verifyCurrentPasswordViaRestAPI(email: string, password: string): Promise<boolean> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!
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
  const rl = await changePasswordRateLimit(req)
  if (rl) return rl

  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const validation = validateData(changePasswordSchema, body)
    if (!validation.success) return validation.response

    const { currentPassword, newPassword } = validation.data

    if (user.hasPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }

      const valid = await verifyCurrentPasswordViaRestAPI(user.email, currentPassword)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    await admin.auth().updateUser(user.firebaseUid as string, { password: newPassword })

    await connectDB()
    await User.findByIdAndUpdate(user._id, { hasPassword: true })

    return NextResponse.json({
      success: true,
      message: user.hasPassword ? 'Password changed successfully' : 'Password set successfully.',
    })
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      return NextResponse.json({ error: 'Please login again before changing your password' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}