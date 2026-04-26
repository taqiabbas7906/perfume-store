import { NextRequest, NextResponse } from 'next/server'
import { syncUserToDB } from '@/lib/auth'
import { validateData } from '@/lib/validate'
import { z } from 'zod'

const syncSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validation = validateData(syncSchema, body)

    if (!validation.success) {
      return validation.response
    }

    const { token } = validation.data

    const user = await syncUserToDB(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to sync user' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true, user })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}