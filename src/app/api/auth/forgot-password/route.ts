// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import { validateData } from '@/lib/validate'
import { rateLimit } from '@/lib/rateLimit'
import { forgotPasswordRateLimit } from '@/lib/authRateLimit'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account with that email exists, a reset link has been sent.',
}

export async function POST(req: NextRequest) {
  const rl = await forgotPasswordRateLimit(req)
if (rl) return rl
  const rateLimitResponse = await rateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const validation = validateData(forgotPasswordSchema, body)
    if (!validation.success) return validation.response

    const { email } = validation.data

    try {
      await sendPasswordResetEmail(auth, email)
    } catch {
      // swallow ALL errors — never reveal whether email exists
    }

    return NextResponse.json(GENERIC_SUCCESS)
  } catch {
    return NextResponse.json(GENERIC_SUCCESS)
  }
}