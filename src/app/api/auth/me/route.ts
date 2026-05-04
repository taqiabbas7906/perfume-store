import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/getAuthUser'

const PUBLIC_USER_FIELDS = [
  '_id',
  'name',
  'email',
  'image',
  'role',
  'hasPassword',
  'emailVerified',
  'createdAt',
] as const

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const safeUser = PUBLIC_USER_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
      const value = user[field as keyof typeof user]
      if (value !== undefined) acc[field] = value
      return acc
    }, {})

    return NextResponse.json({ success: true, user: safeUser })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}