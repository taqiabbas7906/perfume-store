import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Collection from '@/models/Collection'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const now = new Date()
    const { searchParams } = new URL(req.url)
    const limitedEdition = searchParams.get('limitedEdition')

    const filter: Record<string, unknown> = {
      active: true,
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    }
    if (limitedEdition === 'true') filter.isLimitedEdition = true

    const collections = await Collection.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('-products')
      .lean()

    return NextResponse.json({ success: true, collections })
  } catch (err) {
    logRouteError('GET /api/collections', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
