import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import { validateData } from '@/lib/validate'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validation = validateData(forgotPasswordSchema, body)

    if (!validation.success) {
      return validation.response
    }

    const { email } = validation.data

    await sendPasswordResetEmail(auth, email)

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    })

  } catch (error: any) {

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}