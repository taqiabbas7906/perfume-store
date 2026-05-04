// src/app/api/auth/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncUserToDB } from '@/lib/auth'
import { syncRateLimit } from '@/lib/authRateLimit'

export async function POST(req: NextRequest) {
  const rl = await syncRateLimit(req)
  if (rl) return rl

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await syncUserToDB(token)
    if (!user) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}