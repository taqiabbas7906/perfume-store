import { NextRequest, NextResponse } from 'next/server'
import { syncUserToDB } from '@/lib/auth'
import { syncRateLimit } from '@/lib/authRateLimit'

export async function POST(req: NextRequest) {
  const limited = await syncRateLimit(req)
  if (limited) return limited

  try {
    const auth = req.headers.get('authorization')
    if (!auth?.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = auth.slice(7).trim()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => null)) as { name?: unknown } | null
    const requestedName =
      typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : undefined

    const user = await syncUserToDB(token, requestedName)
    if (!user) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasPassword: user.hasPassword,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}