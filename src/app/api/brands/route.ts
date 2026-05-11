import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Brand from '@/models/Brand'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const isLuxury = searchParams.get('isLuxury')
    const filter: Record<string, unknown> = { active: true }
    if (isLuxury === 'true') filter.isLuxury = true
    const brands = await Brand.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .select('-__v')
      .lean()
    return NextResponse.json({ success: true, brands })
  } catch (err) {
    logRouteError('GET /api/brands', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
