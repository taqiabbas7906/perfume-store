import { NextRequest, NextResponse } from 'next/server'
import { admin } from '@/lib/firebase-admin'
import { getAuthUser } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { changePasswordSchema } from '@/lib/validators'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const validation = validateData(changePasswordSchema, body)

    if (!validation.success) {
      return validation.response
    }

    const { currentPassword, newPassword } = validation.data

    const firebaseUser = await admin.auth().getUserByEmail(user.email)

    if (!firebaseUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.hasPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        )
      }

      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')

      try {
        await signInWithEmailAndPassword(auth, user.email, currentPassword)
      } catch (err: any) {
        if (
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-credential'
        ) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          )
        }
        throw err
      }
    }

    await admin.auth().updateUser(user.firebaseUid as string, {
      password: newPassword,
    })

    await connectDB()
    await User.findByIdAndUpdate(user._id, { hasPassword: true })

    return NextResponse.json({
      success: true,
      message: user.hasPassword
        ? 'Password changed successfully'
        : 'Password set successfully. You can now login with email and password too.',
    })

  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      return NextResponse.json(
        { error: 'Please login again before changing your password' },
        { status: 401 }
      )
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}