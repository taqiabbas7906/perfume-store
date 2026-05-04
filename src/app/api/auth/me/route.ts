// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/getAuthUser'

const PUBLIC_USER_FIELDS = ['_id', 'name', 'email', 'image', 'role', 'hasPassword', 'emailVerified', 'createdAt'] as const

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const safeUser = PUBLIC_USER_FIELDS.reduce((acc, field) => {
      if (user[field] !== undefined) acc[field] = user[field]
      return acc
    }, {} as Record<string, unknown>)

    return NextResponse.json({ success: true, user: safeUser })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}