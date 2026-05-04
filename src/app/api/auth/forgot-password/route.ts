import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import { validateData } from '@/lib/validate'
import { forgotPasswordRateLimit } from '@/lib/authRateLimit'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account with that email exists, a reset link has been sent.',
}

export async function POST(req: NextRequest) {
  const limited = await forgotPasswordRateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json(GENERIC_SUCCESS)
    const validation = validateData(schema, body)
    if (!validation.success) return validation.response

    try {
      await sendPasswordResetEmail(auth, validation.data.email)
    } catch {
      // Swallow ALL errors — never reveal whether the email exists.
    }
    return NextResponse.json(GENERIC_SUCCESS)
  } catch {
    return NextResponse.json(GENERIC_SUCCESS)
  }
}