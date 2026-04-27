import { NextRequest, NextResponse } from 'next/server'
import { admin } from '@/lib/firebase-admin'
import { getAuthUser } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { changePasswordSchema } from '@/lib/validators'

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

    const { newPassword } = validation.data

    const firebaseUser = await admin.auth().getUserByEmail(user.email)

    if (!firebaseUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const providerData = firebaseUser.providerData

    const isEmailProvider = providerData.some(
      (provider) => provider.providerId === 'password'
    )

    if (isEmailProvider) {
      await admin.auth().updateUser(user.firebaseUid as string, {
        password: newPassword,
      })

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully',
      })
    } else {
      await admin.auth().updateUser(user.firebaseUid as string, {
        password: newPassword,
        email: user.email,
      })

      return NextResponse.json({
        success: true,
        message: 'Password set successfully. You can now login with email and password too.',
      })
    }

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